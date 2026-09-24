/**
 * Relógio do servidor (contrato §1.4).
 *
 * POR QUE EXISTE: a área do RF04 muda de "Recente" para "Antigo" conforme a idade do
 * avistamento. Se o front usasse `Date.now()` puro, bastaria o celular estar com a hora errada
 * (ou alguém adiantar o relógio de propósito) para uma área recente aparecer como antiga, ou
 * vice-versa. Então nenhuma regra de tempo usa o relógio do aparelho diretamente: todas usam
 * `relogioServidor.agora()`, que é o relógio local CORRIGIDO pelo desvio medido.
 *
 * COMO: na PRIMEIRA resposta da API, `desvio = serverTime - Date.now()`. Daí em diante,
 * `agora() = Date.now() + desvio`. A latência da rede entra como erro (tipicamente < 1 s), o que
 * é irrelevante para regras medidas em horas e minutos. Medir só na primeira resposta evita que
 * o valor "tremule" a cada chamada e mude a faixa de uma área na borda entre duas faixas.
 *
 * Se o desvio passar de 5 min, o app mostra um aviso discreto — mas continua funcionando
 * normalmente, porque já usa a hora do servidor de qualquer jeito.
 */

export const LIMITE_DESVIO_MS = 5 * 60 * 1000

/** Desvio em ms (positivo = relógio local ATRASADO). `null` se `serverTime` for inválido. */
export function calcularDesvio(serverTimeIso, agoraLocalMs) {
  const servidor = Date.parse(serverTimeIso)
  if (Number.isNaN(servidor)) return null
  return servidor - agoraLocalMs
}

/** Estritamente acima do limite: exatamente 5 min ainda não avisa. */
export function relogioDesajustado(desvioMs) {
  return desvioMs !== null && Math.abs(desvioMs) > LIMITE_DESVIO_MS
}

/**
 * Fábrica (em vez de só um objeto global) para os testes poderem injetar um relógio local
 * falso e criar instâncias independentes.
 */
export function criarRelogioServidor({ agoraLocal = () => Date.now() } = {}) {
  let desvio = null
  const ouvintes = new Set()

  return {
    /** Chamado pelo api/client.js a cada resposta; só a primeira válida define o desvio. */
    registrarResposta(serverTimeIso) {
      if (desvio !== null) return
      const d = calcularDesvio(serverTimeIso, agoraLocal())
      if (d === null) return
      desvio = d
      for (const fn of ouvintes) fn(desvio)
    },
    /** Hora do servidor em ms. Antes da primeira resposta, é o relógio local (desvio 0). */
    agora: () => agoraLocal() + (desvio ?? 0),
    desvio: () => desvio,
    desajustado: () => relogioDesajustado(desvio),
    /** Para o React (useSyncExternalStore): avisa quando o desvio é definido. */
    assinar(fn) {
      ouvintes.add(fn)
      return () => ouvintes.delete(fn)
    },
  }
}

/** A instância usada pelo app inteiro. */
export const relogioServidor = criarRelogioServidor()
