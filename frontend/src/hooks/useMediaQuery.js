import { useSyncExternalStore } from 'react'

/** true enquanto a media query casar (ex.: '(max-width: 767px)'). Atualiza ao girar a tela. */
export function useMediaQuery(consulta) {
  return useSyncExternalStore(
    (fn) => {
      const mq = window.matchMedia(consulta)
      mq.addEventListener('change', fn)
      return () => mq.removeEventListener('change', fn)
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  )
}
