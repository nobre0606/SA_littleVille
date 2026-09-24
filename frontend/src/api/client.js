import { CONTRACT_VERSION } from 'shared/constantes'
import { relogioServidor } from './serverClock.js'
import { erroDeRede, normalizarErro } from './errors.js'

/**
 * ÚNICO ponto do app que chama `fetch` (a regra do ESLint `no-restricted-globals` garante).
 * Tudo que fala com a API passa por aqui, então as regras transversais moram num lugar só:
 *
 *  - base URL por variável de ambiente (VITE_API_URL; padrão "/api", que em produção a
 *    Vercel repassa para a API real — ver vercel.json);
 *  - `credentials: 'include'`: a sessão é um cookie httpOnly que o JavaScript nem consegue
 *    ler; o navegador só o anexa se pedirmos. Nada de token em localStorage (RNF04);
 *  - toda resposta alimenta o relógio do servidor (contrato §1.4);
 *  - todo erro vira `ApiClientError` no formato do contrato (inclusive o formato antigo);
 *  - 401 UNAUTHENTICATED avisa o app (que manda para /login);
 *  - se a PRIMEIRA chamada demorar mais de 3 s, avisa que o servidor está "acordando"
 *    (hospedagem gratuita hiberna a API quando fica parada).
 */

const env = import.meta.env ?? {} // `import.meta.env` não existe fora do Vite (testes em Node)

const config = {
  baseUrl: env.VITE_API_URL || '/api',
  aoNaoAutenticado: null,
}

/** Usado pelo app (para registrar o redirecionamento do 401) e pelos testes (base absoluta). */
export function configurarCliente(parcial) {
  Object.assign(config, parcial)
}

// ------------------------------------------------------- estado de conexão (cold start)

const COLD_START_MS = 3000
let servidorRespondeu = false
let conexao = { acordando: false }
const ouvintesConexao = new Set()

function definirAcordando(valor) {
  if (conexao.acordando === valor) return
  conexao = { acordando: valor } // objeto novo: o useSyncExternalStore compara por referência
  for (const fn of ouvintesConexao) fn()
}

/** Para `useSyncExternalStore` (ver ui/ColdStartScreen). */
export const estadoConexao = {
  assinar(fn) {
    ouvintesConexao.add(fn)
    return () => ouvintesConexao.delete(fn)
  },
  obter: () => conexao,
}

// ---------------------------------------------------------------- versão do contrato

let avisouVersao = false
function conferirVersao(res) {
  const versao = res.headers.get('X-Contract-Version')
  if (!versao || avisouVersao) return
  if (versao.split('.')[0] !== CONTRACT_VERSION.split('.')[0]) {
    avisouVersao = true
    console.warn(`[api] Contrato do servidor ${versao} é incompatível com o do front ${CONTRACT_VERSION}.`)
  }
}

// ---------------------------------------------------------------------------- request

function montarUrl(path, query) {
  const url = `${config.baseUrl}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries(query)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Faz a chamada e devolve o ENVELOPE inteiro: `{ data, serverTime }` ou, em listas,
 * `{ data, page, serverTime }`. Lança `ApiClientError` em qualquer falha.
 */
export async function request(method, path, { query, body, signal } = {}) {
  // Só a primeira chamada liga o cronômetro do cold start; depois que o servidor responde
  // uma vez, ele está acordado.
  const cronometro = servidorRespondeu ? null : setTimeout(() => definirAcordando(true), COLD_START_MS)

  let res
  try {
    res = await fetch(montarUrl(path, query), {
      method,
      credentials: 'include',
      headers: body !== undefined ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (e) {
    clearTimeout(cronometro)
    if (e?.name === 'AbortError') throw e // cancelamento do TanStack Query não é erro
    definirAcordando(false)
    throw erroDeRede()
  }
  clearTimeout(cronometro)

  // 503 durante o cold start = ainda acordando: mantém o aviso enquanto o Query tenta de novo.
  if (res.status !== 503) {
    servidorRespondeu = true
    definirAcordando(false)
  }

  let corpo = null
  try {
    corpo = await res.json()
  } catch {
    /* corpo vazio ou não-JSON: tratado abaixo pelo status */
  }

  if (corpo?.serverTime) relogioServidor.registrarResposta(corpo.serverTime)
  conferirVersao(res)

  if (!res.ok) {
    const erro = normalizarErro(corpo, res.status, path)
    if (erro.code === 'UNAUTHENTICATED') config.aoNaoAutenticado?.(erro)
    throw erro
  }
  return corpo
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts),
}
