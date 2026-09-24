import { useSyncExternalStore } from 'react'

const consulta = '(prefers-reduced-motion: reduce)'
const assinar = (fn) => {
  const mq = window.matchMedia(consulta)
  mq.addEventListener('change', fn)
  return () => mq.removeEventListener('change', fn)
}

/** Para animações feitas em JS (a contagem do StatCard); as de CSS já respeitam via tokens. */
export const useReducedMotion = () => useSyncExternalStore(assinar, () => window.matchMedia(consulta).matches, () => false)
