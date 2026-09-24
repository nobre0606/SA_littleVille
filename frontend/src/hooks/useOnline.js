import { useSyncExternalStore } from 'react'

const assinar = (fn) => {
  window.addEventListener('online', fn)
  window.addEventListener('offline', fn)
  return () => {
    window.removeEventListener('online', fn)
    window.removeEventListener('offline', fn)
  }
}

/** Estado de conexão do navegador (para o aviso "Você está offline"). */
export const useOnline = () => useSyncExternalStore(assinar, () => navigator.onLine, () => true)
