/**
 * TRANSPORTE DO CHAT — isolado aqui. A tela não sabe como as mensagens chegam: só recebe
 * `aoReceber(novas)`. Hoje é polling com `?since=`; trocar por WebSocket no futuro é trocar
 * só este arquivo.
 *
 * Ritmo (RNF02: mensagem nova aparece em menos de 5 s) — DECISOES D21:
 *  - aba visível e alguém mexeu na tela no último minuto → a cada 3 s;
 *  - 60 s sem nenhuma interação → recua para 10 s (economia de bateria e dados móveis: quem
 *    não está olhando não precisa de 3 s);
 *  - qualquer interação ou envio → busca NA HORA e volta a 3 s;
 *  - aba oculta → para; ao reaparecer, busca na hora.
 * Enquanto a pessoa está usando, o RNF02 vale (3 s < 5 s). O recuo só acontece com a tela
 * parada — e a primeira interação já traz tudo o que chegou.
 *
 * O "tempo sem interação" usa o relógio do aparelho de propósito: mede a PESSOA (quanto tempo
 * ela ficou parada), não dados do servidor — nenhuma regra de negócio depende disso.
 */

export const INTERVALO_ATIVO_MS = 3000
export const INTERVALO_OCIOSO_MS = 10_000
export const OCIO_APOS_MS = 60_000

/** Quanto esperar até a próxima busca; null = não buscar (aba oculta). Função pura. */
export function intervaloDePolling({ visivel, msDesdeAtividade }) {
  if (!visivel) return null
  return msDesdeAtividade >= OCIO_APOS_MS ? INTERVALO_OCIOSO_MS : INTERVALO_ATIVO_MS
}

/**
 * `buscar(since)` → Promise<mensagens[]> (since = createdAt da última recebida, ou undefined).
 * Nunca duas buscas ao mesmo tempo (se uma demorar, a próxima espera). Erro de rede não para o
 * chat: tenta de novo no próximo ciclo. 401 é tratado pelo api/client (vai para o login com a
 * rota de retorno), como em qualquer outra chamada.
 */
export function criarTransporte({ buscar, aoReceber, aoErro, aoOk, agora = () => Date.now(), doc = globalThis.document }) {
  let cursor
  let timer = null
  let emVoo = false
  let parado = true
  let ultimaAtividade = agora()

  const visivel = () => doc?.visibilityState !== 'hidden'

  function agendar() {
    clearTimeout(timer)
    if (parado) return
    const ms = intervaloDePolling({ visivel: visivel(), msDesdeAtividade: agora() - ultimaAtividade })
    if (ms !== null) timer = setTimeout(ciclo, ms)
  }

  async function ciclo() {
    if (parado) return
    if (emVoo) return agendar()
    emVoo = true
    try {
      const novas = await buscar(cursor)
      if (novas.length) {
        cursor = novas[novas.length - 1].createdAt
        aoReceber(novas)
      }
      aoOk?.()
    } catch (erro) {
      aoErro?.(erro)
    } finally {
      emVoo = false
      agendar()
    }
  }

  /** Interação da pessoa: se estava no ritmo lento, busca já e volta ao rápido. */
  function atividade() {
    const estavaOciosa = agora() - ultimaAtividade >= OCIO_APOS_MS
    ultimaAtividade = agora()
    if (estavaOciosa) ciclo()
  }

  function aoMudarVisibilidade() {
    if (visivel()) {
      ultimaAtividade = agora()
      ciclo()
    } else {
      clearTimeout(timer)
    }
  }

  return {
    iniciar() {
      parado = false
      doc?.addEventListener('visibilitychange', aoMudarVisibilidade)
      ciclo()
    },
    parar() {
      parado = true
      clearTimeout(timer)
      doc?.removeEventListener('visibilitychange', aoMudarVisibilidade)
    },
    atividade,
    /** Depois de enviar: busca já (traz respostas de quem estava digitando) e volta a 3 s. */
    aposEnviar() {
      ultimaAtividade = agora()
      ciclo()
    },
    /** Para testes: o intervalo que valeria agora. */
    intervaloAtual: () => intervaloDePolling({ visivel: visivel(), msDesdeAtividade: agora() - ultimaAtividade }),
  }
}
