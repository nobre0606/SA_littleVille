import { randomInt } from 'node:crypto'
import { TEAM_CODE_REGEX } from 'shared/constantes'
import { messageCreateSchema, messageListQuerySchema, teamCreateSchema, teamJoinSchema } from 'shared/schemas'
import { prisma } from '../lib/prisma.js'
import { ErroApi, ok } from '../lib/resposta.js'
import { equipePublica, membroPublico, mensagemPublica } from '../lib/formatos.js'
import { validar } from '../lib/validar.js'

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O/1/I (contrato §6)
const INTERVALO_MENSAGEM_MS = 1000 // RN08: 1 envio por segundo por pessoa

/** Código de convite aleatório (crypto, não Math.random: não dá para prever o próximo). */
function novoCodigo() {
  return Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
}

async function equipeComContagem(teamId) {
  const t = await prisma.team.findUnique({ where: { id: teamId }, include: { _count: { select: { membros: true } } } })
  return equipePublica(t, t._count.membros)
}

/** A equipe existe e EU sou membro dela? Senão 404 / 403 NOT_IN_TEAM. */
async function exigirMembro(teamId, usuarioId) {
  const t = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, liderId: true } })
  if (!t) throw new ErroApi('NOT_FOUND', 'Equipe não encontrada.')
  const m = await prisma.teamMember.findUnique({ where: { userId: usuarioId }, select: { teamId: true } })
  if (m?.teamId !== teamId) throw new ErroApi('NOT_IN_TEAM', 'Você não faz parte desta equipe.')
  return t
}

const JA_TEM_EQUIPE = () => new ErroApi('ALREADY_IN_TEAM', 'Você já está em uma equipe. Saia dela antes.')

export const equipes = {
  // Lista as equipes do usuário: 0 ou 1 (uma por vez), em lista para o contrato poder crescer.
  async minhas(req, res) {
    const m = await prisma.teamMember.findUnique({ where: { userId: req.usuario.id }, select: { teamId: true } })
    return ok(res, m ? [await equipeComContagem(m.teamId)] : [])
  },

  async criar(req, res) {
    const { nome } = validar(teamCreateSchema, req.body)
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      try {
        // Transação: equipe e participação do líder entram JUNTAS (ou nenhuma das duas).
        const t = await prisma.$transaction(async (tx) => {
          const equipe = await tx.team.create({ data: { nome, codigo: novoCodigo(), liderId: req.usuario.id } })
          await tx.teamMember.create({ data: { teamId: equipe.id, userId: req.usuario.id } })
          return equipe
        })
        return ok(res, equipePublica(t, 1), { status: 201 })
      } catch (e) {
        // P2002 = violou um índice único. Em team_members (userId é a chave): já tem equipe.
        // Em teams.codigo: código repetido por azar — tenta outro.
        if (e.code === 'P2002' && String(e.meta?.target).includes('codigo')) continue
        if (e.code === 'P2002') throw JA_TEM_EQUIPE()
        throw e
      }
    }
    throw new ErroApi('INTERNAL_ERROR', 'Não foi possível gerar um código de equipe. Tente de novo.')
  },

  async entrar(req, res) {
    const { codigo } = validar(teamJoinSchema, req.body) // já normaliza (maiúsculas, sem hífen)
    if (!TEAM_CODE_REGEX.test(codigo)) throw new ErroApi('VALIDATION_ERROR', 'Código inválido.', { codigo: 'Código inválido' })
    const t = await prisma.team.findUnique({ where: { codigo }, select: { id: true } })
    if (!t) throw new ErroApi('TEAM_CODE_NOT_FOUND', 'Nenhuma equipe com esse código.', { codigo: 'Nenhuma equipe com esse código' })
    try {
      await prisma.teamMember.create({ data: { teamId: t.id, userId: req.usuario.id } })
    } catch (e) {
      // A regra "uma equipe por vez" é garantida pelo BANCO (userId é a chave primária).
      if (e.code === 'P2002') throw JA_TEM_EQUIPE()
      throw e
    }
    return ok(res, await equipeComContagem(t.id))
  },

  async sair(req, res) {
    const t = await exigirMembro(req.params.id, req.usuario.id)
    await prisma.$transaction(async (tx) => {
      await tx.teamMember.delete({ where: { userId: req.usuario.id } })
      const restantes = await tx.teamMember.findMany({ where: { teamId: t.id }, orderBy: { entrouEm: 'asc' }, take: 1 })
      if (restantes.length === 0) {
        // Último membro saiu: a equipe é encerrada (mensagens vão junto, em cascata).
        await tx.team.delete({ where: { id: t.id } })
      } else if (t.liderId === req.usuario.id) {
        // O líder saiu: liderança passa ao membro mais antigo (contrato §6).
        await tx.team.update({ where: { id: t.id }, data: { liderId: restantes[0].userId } })
      }
    })
    return ok(res, { ok: true })
  },

  async membros(req, res) {
    const t = await exigirMembro(req.params.id, req.usuario.id)
    const membros = await prisma.teamMember.findMany({
      where: { teamId: t.id },
      orderBy: { entrouEm: 'asc' },
      include: { user: { select: { id: true, nome: true, posicaoLat: true, posicaoLng: true, posicaoPrecisaoM: true, posicaoEm: true } } },
    })
    // Líder primeiro, depois ordem de entrada (contrato §6).
    const ordenados = [...membros.filter((m) => m.userId === t.liderId), ...membros.filter((m) => m.userId !== t.liderId)]
    return ok(res, ordenados.map((m) => membroPublico(m, t.liderId)))
  },

  // ------------------------------------------------------------------------------ chat

  async mensagens(req, res) {
    const t = await exigirMembro(req.params.id, req.usuario.id)
    const { since } = validar(messageListQuerySchema, req.query)
    const include = { autor: { select: { id: true, nome: true } } }
    let lista
    if (since) {
      // Só as MAIS NOVAS que a última que o front já tem (createdAt estritamente maior).
      lista = await prisma.message.findMany({ where: { teamId: t.id, createdAt: { gt: new Date(since) } }, orderBy: { createdAt: 'asc' }, take: 100, include })
    } else {
      // Primeira carga: as 50 mais recentes, devolvidas da mais antiga para a mais nova.
      lista = (await prisma.message.findMany({ where: { teamId: t.id }, orderBy: { createdAt: 'desc' }, take: 50, include })).reverse()
    }
    return ok(res, lista.map(mensagemPublica))
  },

  async enviarMensagem(req, res) {
    const t = await exigirMembro(req.params.id, req.usuario.id)
    const { texto, clientId } = validar(messageCreateSchema, req.body)
    // Trava de 1 envio por segundo (RN08), conferida no BANCO — vale mesmo com várias abas.
    const recente = await prisma.message.findFirst({
      where: { autorId: req.usuario.id, createdAt: { gt: new Date(Date.now() - INTERVALO_MENSAGEM_MS) } },
      select: { id: true },
    })
    if (recente) throw new ErroApi('RATE_LIMITED', 'Aguarde um instante antes de enviar outra mensagem.')
    // Texto guardado como veio (texto puro): quem garante que nunca vira HTML é o front.
    const m = await prisma.message.create({
      data: { teamId: t.id, autorId: req.usuario.id, texto, clientId: clientId ?? null },
      include: { autor: { select: { id: true, nome: true } } },
    })
    return ok(res, mensagemPublica(m), { status: 201 })
  },
}
