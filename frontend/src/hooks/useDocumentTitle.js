import { useEffect } from 'react'

/** Título da aba por rota: "Dashboard · Little Ville". */
export function useDocumentTitle(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Little Ville` : 'Little Ville'
  }, [titulo])
}
