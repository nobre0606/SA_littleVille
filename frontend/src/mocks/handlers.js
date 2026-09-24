import { http, HttpResponse, delay } from 'msw'
import {
  CONTRACT_VERSION,
  ERROR_CODES,
  locationUpdateSchema,
  loginSchema,
  messageCreateSchema,
  messageListQuerySchema,
  registerSchema,
  sightingInputSchema,
  sightingListQuerySchema,
  teamCreateSchema,
  teamJoinSchema,
} from 'shared/schemas'
import { ErroMock } from './banco.js'
import { calcularEstatisticas } from './estatisticas.js'

/**
 * Handlers do MSW: espelham o contrato 1:1 (docs/API-CONTRACT.md). Cada rota:
 *   1. espera a latência simulada;
 *   2. aplica o cenário de debug (erro forçado, sessão expirada...);
 *   3. valida entrada com o MESMO schema zod que o servidor real usará;
 *   4. chama o banco simulado e responde no envelope { data, serverTime }.
 * O teste de contrato (contract.test.js) valida cada resposta contra os schemas.
 */

const LIMITE_CORPO = 16 * 1024 // contrato: 413 acima de 16 KB
const MENSAGENS = {
  VALIDATION_ERROR: 'Confira os campos destacados.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre novamente.',
  FORBIDDEN: 'Você não tem permissão para fazer isso.',
  PAYLOAD_TOO_LARGE: 'O conteúdo enviado é grande demais.',
  INTERNAL_ERROR: 'Algo deu errado no servidor. Tente de novo.',
  SERVICE_UNAVAILABLE: 'O servidor está indisponível no momento.',
}

/** Primeira mensagem de cada campo, no formato `fields` do contrato. */
function camposDoZod(error) {
  const fields = {}
  for (const issue of error.issues) {
    const campo = issue.path[0] ?? '_'
    if (!(campo in fields)) fields[String(campo)] = issue.message
  }
  return fields
}

export function criarHandlers({ banco, cenarios }) {
  const serverTime = () => new Date(banco.agora()).toISOString()
  const cabecalhos = { 'X-Contract-Version': CONTRACT_VERSION }
  // Servidor "frio": dorme até 4,5 s depois da PRIMEIRA requisição que chega. Toda requisição
  // anterior a esse horário espera até ele — inclusive a repetida pelo StrictMode depois de
  // cancelar a primeira. (Simular "só a primeira resposta demora" falhava justamente nesse caso.)
  let acordaEm = null

  const ok = (data, status = 200, extra = {}) =>
    HttpResponse.json({ data, ...extra, serverTime: serverTime() }, { status, headers: cabecalhos })

  const erro = (code, message = MENSAGENS[code], fields) =>
    HttpResponse.json(
      { error: { code, message, ...(fields ? { fields } : {}) }, serverTime: serverTime() },
      { status: ERROR_CODES[code], headers: cabecalhos },
    )

  async function esperar() {
    const { latencia, frio } = cenarios.estado
    if (frio) {
      acordaEm ??= Date.now() + 4500 // passa dos 3 s que ligam o ColdStartScreen
      const falta = acordaEm - Date.now()
      if (falta > 0) return delay(falta)
    }
    if (latencia === 'zero') return
    if (latencia === 'lenta') return delay(4000)
    return delay(400 + Math.random() * 600) // 400–1000 ms, como pede o brief
  }

  /** Lê e valida o corpo JSON; lança ErroMock no formato do contrato. */
  async function corpo(request, schema) {
    const texto = await request.text()
    if (texto.length > LIMITE_CORPO) throw new ErroMock('PAYLOAD_TOO_LARGE', MENSAGENS.PAYLOAD_TOO_LARGE)
    let json
    try {
      json = texto ? JSON.parse(texto) : {}
    } catch {
      throw new ErroMock('VALIDATION_ERROR', 'Corpo da requisição não é um JSON válido.')
    }
    const r = schema.safeParse(json)
    if (!r.success) throw new ErroMock('VALIDATION_ERROR', MENSAGENS.VALIDATION_ERROR, camposDoZod(r.error))
    return r.data
  }

  function consulta(request, schema) {
    const params = Object.fromEntries(new URL(request.url).searchParams)
    const r = schema.safeParse(params)
    if (!r.success) throw new ErroMock('VALIDATION_ERROR', MENSAGENS.VALIDATION_ERROR, camposDoZod(r.error))
    return r.data
  }

  /**
   * Envolve cada rota com latência, cenários, sessão e tratamento de erro.
   * `publica`: rotas de login/cadastro, que não exigem sessão nem sofrem erro forçado.
   */
  const rota = (fn, { publica = false } = {}) => async (info) => {
    await esperar()
    const c = cenarios.estado
    if (c.erro === 'NETWORK') return HttpResponse.error()
    if (!publica && c.erro) return erro(c.erro)
    let quem = null
    if (!publica) {
      if (c.sessao !== 'ativa') return erro('UNAUTHENTICATED')
      quem = banco.usuario(c.usuarioId)
    }
    try {
      return await fn({ ...info, quem })
    } catch (e) {
      if (e instanceof ErroMock) return erro(e.code, e.message, e.fields)
      console.error('[mock] erro inesperado', e)
      return erro('INTERNAL_ERROR')
    }
  }

  const sessaoDe = (u) => ({
    user: banco.usuarioPublico(u),
    expiraEm: new Date(banco.agora() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  const vazio = () => cenarios.estado.vazio

  return [
    // ---------------------------------------------------------------------- auth
    http.post('*/api/auth/register', rota(async ({ request }) => {
      const dados = await corpo(request, registerSchema)
      const u = banco.registrar(dados)
      cenarios.alterar({ sessao: 'ativa', usuarioId: u.id })
      return ok(sessaoDe(u), 201)
    }, { publica: true })),

    http.post('*/api/auth/login', rota(async ({ request }) => {
      const { email, senha } = await corpo(request, loginSchema)
      const u = banco.autenticar(email, senha)
      cenarios.alterar({ sessao: 'ativa', usuarioId: u.id })
      return ok(sessaoDe(u))
    }, { publica: true })),

    // Idempotente: sem sessão também responde 200 (contrato §3).
    http.post('*/api/auth/logout', rota(async () => {
      cenarios.alterar({ sessao: 'encerrada' })
      return ok({ ok: true })
    }, { publica: true })),

    http.get('*/api/auth/me', rota(async ({ quem }) => ok(sessaoDe(quem)))),

    // -------------------------------------------------------------- avistamentos
    http.get('*/api/sightings', rota(async ({ request, quem }) => {
      const filtros = consulta(request, sightingListQuerySchema)
      if (vazio()) return ok([], 200, { page: { page: filtros.page, pageSize: filtros.pageSize, total: 0, totalPages: 0 } })
      const { itens, page } = banco.listarAvistamentos(filtros, quem)
      return ok(itens, 200, { page })
    })),

    http.get('*/api/sightings/:id', rota(async ({ params, quem }) => ok(banco.obterAvistamento(params.id, quem)))),

    http.post('*/api/sightings', rota(async ({ request, quem }) => {
      const a = banco.criarAvistamento(await corpo(request, sightingInputSchema), quem)
      return HttpResponse.json(
        { data: a, serverTime: serverTime() },
        { status: 201, headers: { ...cabecalhos, Location: `/api/sightings/${a.id}` } },
      )
    })),

    http.put('*/api/sightings/:id', rota(async ({ request, params, quem }) =>
      ok(banco.atualizarAvistamento(params.id, await corpo(request, sightingInputSchema), quem)))),

    http.delete('*/api/sightings/:id', rota(async ({ params, quem }) => ok(banco.excluirAvistamento(params.id, quem)))),

    http.post('*/api/sightings/:id/restore', rota(async ({ params, quem }) => ok(banco.restaurarAvistamento(params.id, quem)))),

    // ----------------------------------------------------------------- dashboard
    http.get('*/api/dashboard/stats', rota(async ({ quem }) =>
      ok(vazio() ? calcularEstatisticas([], quem.id, banco.agora()) : banco.estatisticas(quem)))),

    // ------------------------------------------------------------------- equipes
    http.get('*/api/teams', rota(async ({ quem }) => ok(banco.minhasEquipes(quem)))),

    http.post('*/api/teams', rota(async ({ request, quem }) => ok(banco.criarEquipe(await corpo(request, teamCreateSchema), quem), 201))),

    http.post('*/api/teams/join', rota(async ({ request, quem }) => ok(banco.entrarEquipe(await corpo(request, teamJoinSchema), quem)))),

    http.post('*/api/teams/:id/leave', rota(async ({ params, quem }) => {
      banco.sairEquipe(params.id, quem)
      return ok({ ok: true })
    })),

    http.get('*/api/teams/:id/members', rota(async ({ params, quem }) => ok(banco.membros(params.id, quem)))),

    http.get('*/api/teams/:id/messages', rota(async ({ request, params, quem }) => {
      const { since } = consulta(request, messageListQuerySchema)
      return ok(banco.listarMensagens(params.id, since, quem))
    })),

    http.post('*/api/teams/:id/messages', rota(async ({ request, params, quem }) =>
      ok(banco.enviarMensagem(params.id, await corpo(request, messageCreateSchema), quem), 201))),

    // ------------------------------------------------------ emergência e posição
    http.get('*/api/emergency-places', rota(async () => ok(banco.locais()))),

    http.post('*/api/me/location', rota(async ({ request, quem }) => {
      banco.registrarPosicao(await corpo(request, locationUpdateSchema), quem)
      return ok({ ok: true })
    })),
  ]
}
