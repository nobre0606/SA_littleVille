import { Prisma } from '@prisma/client'
import { sightingInputSchema, sightingListQuerySchema } from 'shared/schemas'
import { prisma } from '../lib/prisma.js'
import { ErroApi, ok } from '../lib/resposta.js'
import { avistamentoPublico } from '../lib/formatos.js'
import { validar } from '../lib/validar.js'

const RESTAURACAO_MS = 30 * 1000 // contrato §1.7: desfazer aceito até 30 s depois de excluir
const COM_AUTOR = { autor: { select: { id: true, nome: true } } }

// "-vistoEm" → mais recente primeiro. Desempate SEMPRE pelo mais recente (contrato §4).
const ORDENS = {
  '-vistoEm': [{ vistoEm: 'desc' }],
  vistoEm: [{ vistoEm: 'asc' }],
  bairro: [{ bairro: 'asc' }, { vistoEm: 'desc' }],
  '-bairro': [{ bairro: 'desc' }, { vistoEm: 'desc' }],
  autor: [{ autor: { nome: 'asc' } }, { vistoEm: 'desc' }],
  '-autor': [{ autor: { nome: 'desc' } }, { vistoEm: 'desc' }],
}

/**
 * Busca de texto sem diferenciar maiúsculas NEM acentos ("conceicao" acha "Conceição"), em
 * descrição, bairro e nome do autor (contrato §4). O Prisma só ignora maiúsculas; os acentos
 * saem com translate() no próprio PostgreSQL, que devolve os ids. Consulta parametrizada
 * (tagged template): o texto digitado nunca vira SQL.
 */
const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ'
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
async function idsQueContem(texto) {
  const padrao = `%${texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()}%`
  const linhas = await prisma.$queryRaw`
    SELECT s.id FROM sightings s JOIN users u ON u.id = s."autorId"
    WHERE s."deletedAt" IS NULL AND (
      lower(translate(s.descricao, ${COM_ACENTO}, ${SEM_ACENTO})) LIKE ${padrao} OR
      lower(translate(s.bairro, ${COM_ACENTO}, ${SEM_ACENTO})) LIKE ${padrao} OR
      lower(translate(u.nome, ${COM_ACENTO}, ${SEM_ACENTO})) LIKE ${padrao})`
  return linhas.map((l) => l.id)
}

/** Avistamento NÃO excluído, ou 404 (excluído também é "não existe" — contrato §1.7). */
async function buscarAtivo(id) {
  const s = await prisma.sighting.findFirst({ where: { id, deletedAt: null }, include: COM_AUTOR })
  if (!s) throw new ErroApi('NOT_FOUND', 'Avistamento não encontrado.')
  return s
}

const paraBanco = (d) => ({
  descricao: d.descricao,
  bairro: d.bairro,
  latitude: d.lat,
  longitude: d.lng,
  origemLocal: d.origemLocal === 'gps' ? 'GPS' : 'MANUAL',
  precisaoM: d.precisaoM,
})

export const avistamentos = {
  async listar(req, res) {
    const f = validar(sightingListQuerySchema, req.query)
    const where = { deletedAt: null }
    if (f.autor) where.autorId = f.autor === 'me' ? req.usuario.id : f.autor
    if (f.de || f.ate) where.vistoEm = { ...(f.de && { gte: new Date(f.de) }), ...(f.ate && { lte: new Date(f.ate) }) }
    if (f.q) where.id = { in: await idsQueContem(f.q) }

    // Paginação e ordenação NO BANCO: só a página pedida sai do PostgreSQL.
    const [total, itens] = await prisma.$transaction([
      prisma.sighting.count({ where }),
      prisma.sighting.findMany({ where, include: COM_AUTOR, orderBy: ORDENS[f.sort], skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    ])
    return ok(res, itens.map((s) => avistamentoPublico(s, req.usuario)), {
      extra: { page: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.ceil(total / f.pageSize) } },
    })
  },

  async obter(req, res) {
    return ok(res, avistamentoPublico(await buscarAtivo(req.params.id), req.usuario))
  },

  async criar(req, res) {
    // Schema ESTRITO: se o cliente mandar `vistoEm`, é 400 — a hora é do servidor (RN02).
    const dados = validar(sightingInputSchema, req.body)
    const s = await prisma.sighting.create({ data: { ...paraBanco(dados), autorId: req.usuario.id }, include: COM_AUTOR })
    res.set('Location', `/api/sightings/${s.id}`)
    return ok(res, avistamentoPublico(s, req.usuario), { status: 201 })
  },

  async atualizar(req, res) {
    const atual = await buscarAtivo(req.params.id)
    // Só o AUTOR edita — nem o admin edita o de outra pessoa (contrato §1.8). Conferido aqui,
    // no servidor, mesmo que o botão esteja escondido no front.
    if (atual.autorId !== req.usuario.id) throw new ErroApi('FORBIDDEN', 'Só quem registrou pode editar este avistamento.')
    const dados = validar(sightingInputSchema, req.body)
    // vistoEm, autor e createdAt NÃO mudam num PUT (contrato §4).
    const s = await prisma.sighting.update({ where: { id: atual.id }, data: paraBanco(dados), include: COM_AUTOR })
    return ok(res, avistamentoPublico(s, req.usuario))
  },

  async excluir(req, res) {
    const atual = await buscarAtivo(req.params.id)
    if (atual.autorId !== req.usuario.id && req.usuario.papel !== 'ADMIN') {
      throw new ErroApi('FORBIDDEN', 'Você só pode excluir os seus próprios avistamentos.')
    }
    // Exclusão LÓGICA: marca a data e quem excluiu; a linha continua no banco.
    const s = await prisma.sighting.update({
      where: { id: atual.id },
      data: { deletedAt: new Date(), excluidoPorId: req.usuario.id },
      include: COM_AUTOR,
    })
    return ok(res, avistamentoPublico(s, req.usuario))
  },

  async restaurar(req, res) {
    const s = await prisma.sighting.findFirst({ where: { id: req.params.id, deletedAt: { not: null } } })
    if (!s) throw new ErroApi('NOT_FOUND', 'Avistamento não encontrado.')
    if (s.excluidoPorId !== req.usuario.id) throw new ErroApi('FORBIDDEN', 'Só quem excluiu pode desfazer.')
    if (Date.now() - s.deletedAt.getTime() > RESTAURACAO_MS) {
      throw new ErroApi('RESTORE_WINDOW_EXPIRED', 'Não foi possível desfazer: o tempo acabou.')
    }
    const r = await prisma.sighting.update({ where: { id: s.id }, data: { deletedAt: null, excluidoPorId: null }, include: COM_AUTOR })
    return ok(res, avistamentoPublico(r, req.usuario))
  },
}

export { Prisma }
