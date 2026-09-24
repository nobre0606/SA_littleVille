import { useEffect, useState, useSyncExternalStore } from 'react'
import { relogioServidor } from '../api/serverClock.js'

/**
 * "Agora" do SERVIDOR, re-renderizando a cada `intervaloMs` (padrão 60 s — o RelativeTime e a
 * reavaliação da área do RF04 pedem 60 s). Nunca usa o relógio do aparelho sem correção.
 * O intervalo é por componente, mas o valor vem sempre do mesmo relógio corrigido.
 */
export function useServerNow(intervaloMs = 60_000) {
  const [agora, setAgora] = useState(() => relogioServidor.agora())
  useEffect(() => {
    const id = setInterval(() => setAgora(relogioServidor.agora()), intervaloMs)
    // Quando o desvio for medido (primeira resposta), recalcula na hora.
    const cancelar = relogioServidor.assinar(() => setAgora(relogioServidor.agora()))
    return () => {
      clearInterval(id)
      cancelar()
    }
  }, [intervaloMs])
  return agora
}

/** true quando o relógio do aparelho está mais de 5 min fora da hora do servidor. */
export function useRelogioDesajustado() {
  return useSyncExternalStore(relogioServidor.assinar, relogioServidor.desajustado)
}
