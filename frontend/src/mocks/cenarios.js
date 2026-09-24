import { USUARIO_DEMO_ID } from './seed.js'

/**
 * Cenários do servidor simulado, controlados pelo painel de debug (`?debug=1`). Servem para
 * exercitar os estados de borda exigidos na definição de pronto: carregando (latência lenta),
 * vazio, erro, sem permissão, offline, sessão expirada, servidor acordando.
 *
 * Também em memória: recarregar volta ao padrão. Os dois que só fazem sentido na PRIMEIRA
 * chamada (servidor frio e relógio desajustado) vêm da URL: `?frio=1` e `?desvio=<minutos>`.
 */

export const ERROS_FORCADOS = {
  INTERNAL_ERROR: 'Erro 500 (servidor)',
  SERVICE_UNAVAILABLE: 'Erro 503 (indisponível)',
  FORBIDDEN: 'Erro 403 (sem permissão)',
  NETWORK: 'Falha de rede (offline)',
}

export const LATENCIAS = {
  normal: 'Normal (400–1000 ms)',
  zero: 'Instantânea',
  lenta: 'Lenta (4 s)',
}

export function criarCenarios(inicial = {}) {
  let estado = {
    latencia: 'normal',
    erro: null, // uma chave de ERROS_FORCADOS, ou null
    vazio: false, // nenhum avistamento
    // Começa DESLOGADO, como um navegador de verdade sem cookie: as rotas protegidas são
    // exercitadas. `?mock=logged-in` (ou "Entrar" no painel) começa logado.
    sessao: 'encerrada', // 'ativa' | 'encerrada'
    usuarioId: USUARIO_DEMO_ID,
    frio: false, // a PRIMEIRA resposta demora 4,5 s (ColdStartScreen)
    desvioMs: 0, // o "relógio do servidor" adiantado/atrasado em relação ao aparelho
    ...inicial,
  }
  const ouvintes = new Set()
  return {
    get estado() {
      return estado
    },
    alterar(parcial) {
      estado = { ...estado, ...parcial }
      for (const fn of ouvintes) fn(estado)
    },
    assinar(fn) {
      ouvintes.add(fn)
      return () => ouvintes.delete(fn)
    },
  }
}

/** Lê os cenários de início da URL (só no navegador): ?mock=logged-in, ?frio=1, ?desvio=<min>. */
export function cenariosDaUrl(search) {
  const p = new URLSearchParams(search)
  const desvioMin = Number(p.get('desvio'))
  return {
    frio: p.get('frio') === '1',
    desvioMs: Number.isFinite(desvioMin) ? desvioMin * 60 * 1000 : 0,
    ...(p.get('mock') === 'logged-in' ? { sessao: 'ativa' } : {}),
  }
}

/**
 * Ponte com o login CONGELADO (src/auth não pode mudar e usa o próprio mock, sem passar pelo
 * MSW). O login congelado, e só ele, navega de "/" ou "/login" para "/permissao-localizacao"
 * depois de entrar com sucesso. Observamos as navegações do app (history.pushState/replaceState,
 * que o React Router usa) e, nessa transição exata, ativamos a sessão simulada.
 *
 * Abrir /permissao-localizacao direto pela barra de endereço NÃO loga: não é pushState.
 */
export const ROTAS_DE_LOGIN = ['/', '/login']

export function observarLoginCongelado(historico, local, aoEntrar) {
  for (const metodo of ['pushState', 'replaceState']) {
    const original = historico[metodo].bind(historico)
    historico[metodo] = (estado, titulo, url) => {
      const de = local.pathname
      original(estado, titulo, url)
      const para = new URL(url ?? local.href, local.href).pathname
      if (ROTAS_DE_LOGIN.includes(de) && para === '/permissao-localizacao') aoEntrar()
    }
  }
}
