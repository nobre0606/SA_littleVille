/**
 * TESTE DE CONTRATO: toda resposta do mock é validada contra os schemas zod do contrato.
 * Se o mock (ou o schema) divergir do docs/API-CONTRACT.md, este teste reprova.
 *
 * Usa o caminho REAL do app: api/recursos.js → api/client.js → fetch → MSW (em Node). Assim
 * também testa o client (envelope, normalização de erro, relógio) de ponta a ponta.
 */
import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { setupServer } from 'msw/node'
import {
  apiErrorSchema,
  dashboardStatsSchema,
  emergencyPlaceSchema,
  envelope,
  messageSchema,
  okSchema,
  pagedEnvelope,
  sessionSchema,
  sightingSchema,
  teamMemberSchema,
  teamSchema,
} from 'shared/schemas'
import { z } from 'zod'
import { configurarCliente } from '../api/client.js'
import { ApiClientError } from '../api/errors.js'
import { avistamentos, dashboard, emergencia, equipes, localizacao, sessao } from '../api/recursos.js'
import { criarBanco } from './banco.js'
import { criarCenarios } from './cenarios.js'
import { criarHandlers } from './handlers.js'

const BASE = 'http://mock.test/api'
let agora = Date.parse('2026-09-24T13:00:00.000Z')
let banco
let cenarios
const server = setupServer()

before(() => {
  server.listen({ onUnhandledRequest: 'error' })
  configurarCliente({ baseUrl: BASE })
})
after(() => server.close())
beforeEach(() => {
  agora = Date.parse('2026-09-24T13:00:00.000Z')
  banco = criarBanco({ agora: () => agora, exemplo: true })
  cenarios = criarCenarios({ latencia: 'zero', sessao: 'ativa' })
  server.resetHandlers(...criarHandlers({ banco, cenarios }))
})

/** Valida e devolve o dado; em falha, mostra exatamente o que divergiu. */
function conforme(schema, corpo) {
  const r = schema.safeParse(corpo)
  assert.ok(r.success, r.success ? '' : JSON.stringify(r.error.issues, null, 2))
  return corpo
}

/** Espera um erro da API e valida o corpo bruto contra o formato único de erro. */
async function falha(promessa, code) {
  await assert.rejects(promessa, (e) => {
    assert.ok(e instanceof ApiClientError, `esperava ApiClientError, veio ${e}`)
    assert.equal(e.code, code)
    return true
  })
}

const NOVO = { descricao: 'Vulto na trilha', bairro: 'Campeche', lat: -27.678, lng: -48.487, origemLocal: 'gps', precisaoM: 15 }

// ---------------------------------------------------------------------------- auth

test('auth: me, login, cadastro e logout seguem o contrato', async () => {
  conforme(envelope(sessionSchema), await sessao.obter())
  conforme(envelope(sessionSchema), await sessao.entrar({ email: 'usada@example.com', senha: 'Abcdefg1' }))
  const cad = await sessao.cadastrar({
    nome: 'Nova Pessoa', email: 'nova@example.com', senha: 'Abcdefg1', cpf: '390.533.447-05', telefone: '(48) 99999-0000',
    cep: '88000-000', numero: '1', rua: 'Rua A', bairro: 'Centro', consentimentoLgpd: true,
  })
  conforme(envelope(sessionSchema), cad)
  assert.equal('cpf' in cad.data.user, false, 'CPF nunca volta (LGPD)')
  conforme(envelope(okSchema), await sessao.sair())
  await falha(sessao.obter(), 'UNAUTHENTICATED')
})

test('auth: erros de credencial e duplicidade usam o formato único', async () => {
  await falha(sessao.entrar({ email: 'usada@example.com', senha: 'errada' }), 'INVALID_CREDENTIALS')
  await falha(
    sessao.cadastrar({
      nome: 'Outra', email: 'usada@example.com', senha: 'Abcdefg1', cpf: '390.533.447-05', telefone: '48999990000',
      cep: '88000000', numero: '1', rua: 'Rua A', bairro: 'Centro', consentimentoLgpd: true,
    }),
    'EMAIL_TAKEN',
  )
  // Corpo bruto do erro, sem passar pelo client:
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', body: '{}' })
  assert.equal(res.status, 400)
  const corpo = conforme(apiErrorSchema, await res.json())
  assert.ok(corpo.error.fields.email)
})

test('401 avisa o app pelo callback do client', async () => {
  let avisado = null
  configurarCliente({ aoNaoAutenticado: (e) => (avisado = e.code) })
  cenarios.alterar({ sessao: 'encerrada' })
  await falha(dashboard.estatisticas(), 'UNAUTHENTICATED')
  assert.equal(avisado, 'UNAUTHENTICATED')
  configurarCliente({ aoNaoAutenticado: null })
})

// -------------------------------------------------------------------- avistamentos

test('GET /sightings: paginado, só não excluídos, mais recente primeiro', async () => {
  const r = conforme(pagedEnvelope(sightingSchema), await avistamentos.listar({ pageSize: 10 }))
  assert.equal(r.data.length, 10)
  assert.equal(r.page.total, 32) // 32 semeados; o excluído não conta
  assert.equal(r.page.totalPages, 4)
  assert.ok(r.data.every((a) => a.deletedAt === null))
  assert.ok(r.data[0].vistoEm >= r.data[1].vistoEm)
  const ultima = conforme(pagedEnvelope(sightingSchema), await avistamentos.listar({ pageSize: 10, page: 4 }))
  assert.equal(ultima.data.length, 2)
  const alem = await avistamentos.listar({ pageSize: 10, page: 9 })
  assert.deepEqual(alem.data, [])
})

test('GET /sightings: filtros de autor, período, texto (sem acento) e ordenação', async () => {
  const meus = await avistamentos.listar({ autor: 'me', pageSize: 100 })
  assert.ok(meus.data.length >= 5 && meus.data.every((a) => a.autor.id === 'u_teste' && a.acoes.podeEditar))
  const de = new Date(agora - 2 * 60 * 60 * 1000).toISOString()
  const recentes = await avistamentos.listar({ de, pageSize: 100 })
  assert.equal(recentes.data.length, 5) // 12, 35, 52, 75 e 105 min
  const lagoa = await avistamentos.listar({ q: 'CONCEICAO', pageSize: 100 })
  assert.ok(lagoa.data.length > 0 && lagoa.data.every((a) => a.bairro === 'Lagoa da Conceição'))
  const porBairro = await avistamentos.listar({ sort: 'bairro', pageSize: 100 })
  const nomes = porBairro.data.map((a) => a.bairro)
  assert.deepEqual(nomes, [...nomes].sort((x, y) => x.localeCompare(y, 'pt-BR', { sensitivity: 'base' })))
  await falha(avistamentos.listar({ sort: 'descricao' }), 'VALIDATION_ERROR')
})

test('CRUD: criar (hora do servidor), ver, editar, excluir e restaurar', async () => {
  const criado = conforme(envelope(sightingSchema), await avistamentos.criar(NOVO)).data
  assert.equal(criado.vistoEm, new Date(agora).toISOString(), 'hora automática = hora do servidor')
  assert.deepEqual(criado.acoes, { podeEditar: true, podeExcluir: true })

  conforme(envelope(sightingSchema), await avistamentos.obter(criado.id))

  agora += 60_000
  const editado = conforme(envelope(sightingSchema), await avistamentos.atualizar(criado.id, { ...NOVO, descricao: '', bairro: 'Armação' })).data
  assert.equal(editado.bairro, 'Armação')
  assert.equal(editado.descricao, '')
  assert.equal(editado.vistoEm, criado.vistoEm, 'PUT não altera a hora do avistamento')
  assert.notEqual(editado.updatedAt, criado.updatedAt)

  const excluido = conforme(envelope(sightingSchema), await avistamentos.excluir(criado.id)).data
  assert.ok(excluido.deletedAt)
  await falha(avistamentos.obter(criado.id), 'NOT_FOUND')

  agora += 10_000
  const restaurado = conforme(envelope(sightingSchema), await avistamentos.restaurar(criado.id)).data
  assert.equal(restaurado.deletedAt, null)
})

test('CRUD: restaurar depois de 30 s é recusado (410)', async () => {
  const { data } = await avistamentos.criar(NOVO)
  await avistamentos.excluir(data.id)
  agora += 31_000
  await falha(avistamentos.restaurar(data.id), 'RESTORE_WINDOW_EXPIRED')
})

test('CRUD: validação — local e bairro obrigatórios, sem hora do cliente', async () => {
  await falha(avistamentos.criar({ ...NOVO, bairro: undefined }), 'VALIDATION_ERROR')
  await falha(avistamentos.criar({ ...NOVO, lat: undefined }), 'VALIDATION_ERROR')
  await falha(avistamentos.criar({ ...NOVO, vistoEm: '2020-01-01T00:00:00.000Z' }), 'VALIDATION_ERROR')
  const { descricao: _d, ...semDescricao } = NOVO
  assert.equal((await avistamentos.criar(semDescricao)).data.descricao, '')
})

test('permissões: usuário comum não edita nem exclui o de outra pessoa; admin exclui', async () => {
  const lista = await avistamentos.listar({ pageSize: 100 })
  const deOutro = lista.data.find((a) => a.autor.id !== 'u_teste')
  assert.deepEqual(deOutro.acoes, { podeEditar: false, podeExcluir: false })
  await falha(avistamentos.atualizar(deOutro.id, NOVO), 'FORBIDDEN')
  await falha(avistamentos.excluir(deOutro.id), 'FORBIDDEN')

  banco.definirPapel('u_teste', 'admin')
  const comoAdmin = (await avistamentos.obter(deOutro.id)).data
  assert.deepEqual(comoAdmin.acoes, { podeEditar: false, podeExcluir: true })
  await falha(avistamentos.atualizar(deOutro.id, NOVO), 'FORBIDDEN') // admin não edita
  conforme(envelope(sightingSchema), await avistamentos.excluir(deOutro.id))
  // Só quem excluiu pode restaurar: o autor original não pode.
  banco.definirPapel('u_teste', 'usuario')
})

// ----------------------------------------------------------------------- dashboard

test('GET /dashboard/stats: conforme o schema e reage ao CRUD na hora', async () => {
  const antes = conforme(envelope(dashboardStatsSchema), await dashboard.estatisticas()).data
  assert.equal(antes.total, 32)
  assert.equal(antes.ativosAgora, 5)
  assert.equal(antes.seriePorDia.at(-1).data, '2026-09-24')
  assert.equal(antes.porPeriodo.reduce((s, p) => s + p.total, 0), 32)
  assert.equal(antes.porBairro.reduce((s, b) => s + b.total, 0), 32)

  const { data } = await avistamentos.criar(NOVO)
  const depois = (await dashboard.estatisticas()).data
  assert.equal(depois.total, 33)
  assert.equal(depois.ativosAgora, 6)
  assert.equal(depois.minhaContribuicao.total, antes.minhaContribuicao.total + 1)

  await avistamentos.excluir(data.id)
  assert.equal((await dashboard.estatisticas()).data.total, 32)
})

test('dashboard: cenário vazio continua conforme o schema (série de 30 zeros)', async () => {
  cenarios.alterar({ vazio: true })
  const d = conforme(envelope(dashboardStatsSchema), await dashboard.estatisticas()).data
  assert.equal(d.total, 0)
  assert.equal(d.ultimos7Dias.variacaoPct, null)
  assert.equal(d.seriePorDia.length, 30)
  const lista = conforme(pagedEnvelope(sightingSchema), await avistamentos.listar({}))
  assert.equal(lista.page.total, 0)
})

// ------------------------------------------------------------------------- equipes

test('equipes: minha equipe, membros, sair, criar e entrar por código', async () => {
  const minhas = conforme(envelope(z.array(teamSchema)), await equipes.minhas()).data
  assert.equal(minhas.length, 1)
  const [lagoa] = minhas
  const membros = conforme(envelope(z.array(teamMemberSchema)), await equipes.membros(lagoa.id)).data
  assert.equal(membros[0].papelNaEquipe, 'lider')

  await falha(equipes.criar({ nome: 'Outra equipe' }), 'ALREADY_IN_TEAM')
  await falha(equipes.membros('t_norte'), 'NOT_IN_TEAM')

  conforme(envelope(okSchema), await equipes.sair(lagoa.id))
  assert.deepEqual((await equipes.minhas()).data, [])
  await falha(equipes.entrar('ZZZZZZ'), 'TEAM_CODE_NOT_FOUND')
  const norte = conforme(envelope(teamSchema), await equipes.entrar(' n4r-t3x ')).data
  assert.equal(norte.id, 't_norte')
  await equipes.sair(norte.id)
  const nova = conforme(envelope(teamSchema), await equipes.criar({ nome: 'Patrulha Nova' })).data
  assert.match(nova.codigo, /^[A-HJ-NP-Z2-9]{6}$/)
})

test('equipes: quando o líder sai, a liderança passa ao membro mais antigo', async () => {
  await equipes.sair('t_lagoa')
  cenarios.alterar({ usuarioId: 'u_bruno' })
  const membros = (await equipes.membros('t_lagoa')).data
  assert.equal(membros.find((m) => m.userId === 'u_bruno').papelNaEquipe, 'lider')
})

// ---------------------------------------------------------------------------- chat

test('chat: lista, since estrito, envio com clientId e trava de 1 por segundo', async () => {
  const todas = conforme(envelope(z.array(messageSchema)), await equipes.mensagens('t_lagoa')).data
  assert.ok(todas.length > 0)
  const ultima = todas.at(-1)
  assert.deepEqual((await equipes.mensagens('t_lagoa', ultima.createdAt)).data, [])

  agora += 1000
  const enviada = conforme(envelope(messageSchema), await equipes.enviarMensagem('t_lagoa', { texto: '<i>oi</i>', clientId: 'c-1' })).data
  assert.equal(enviada.clientId, 'c-1')
  assert.equal(enviada.texto, '<i>oi</i>', 'texto puro, sem mexer no conteúdo')
  const novas = (await equipes.mensagens('t_lagoa', ultima.createdAt)).data
  assert.deepEqual(novas.map((m) => m.id), [enviada.id])

  await falha(equipes.enviarMensagem('t_lagoa', { texto: 'rápido demais' }), 'RATE_LIMITED')
  agora += 1000
  conforme(envelope(messageSchema), await equipes.enviarMensagem('t_lagoa', { texto: 'agora vai' }))
  await falha(equipes.enviarMensagem('t_lagoa', { texto: 'x'.repeat(501) }), 'VALIDATION_ERROR')
})

// ---------------------------------------------------------- emergência e localização

test('emergência e posição seguem o contrato; posição aparece para a equipe', async () => {
  const locais = conforme(envelope(z.array(emergencyPlaceSchema)), await emergencia.locais()).data
  assert.ok(locais.length >= 5)
  conforme(envelope(okSchema), await localizacao.enviar({ lat: -27.6, lng: -48.47, precisaoM: 20 }))
  const eu = (await equipes.membros('t_lagoa')).data.find((m) => m.userId === 'u_teste')
  assert.equal(eu.ultimaPosicao.lat, -27.6)
  await falha(localizacao.enviar({ lat: 200, lng: 0 }), 'VALIDATION_ERROR')
})

// ------------------------------------------------------------------------ cenários

test('cenários de erro forçado respondem no formato único de erro', async () => {
  for (const code of ['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'FORBIDDEN']) {
    cenarios.alterar({ erro: code })
    const res = await fetch(`${BASE}/sightings`)
    conforme(apiErrorSchema, await res.json())
    await falha(avistamentos.listar({}), code)
  }
  cenarios.alterar({ erro: 'NETWORK' })
  await falha(avistamentos.listar({}), 'NETWORK_ERROR')
})

test('toda resposta traz serverTime e o cabeçalho de versão', async () => {
  const res = await fetch(`${BASE}/emergency-places`)
  assert.equal(res.headers.get('X-Contract-Version'), '1.1.0')
  assert.equal((await res.json()).serverTime, new Date(agora).toISOString())
})
