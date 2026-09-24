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
    sessao: 'ativa', // 'ativa' | 'encerrada'
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

/** Lê os cenários de "primeira chamada" da URL (só no navegador). */
export function cenariosDaUrl(search) {
  const p = new URLSearchParams(search)
  const desvioMin = Number(p.get('desvio'))
  return {
    frio: p.get('frio') === '1',
    desvioMs: Number.isFinite(desvioMin) ? desvioMin * 60 * 1000 : 0,
  }
}
