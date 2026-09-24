import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Painel } from './DebugPanel.jsx'

/** Cria uma raiz React própria para o painel de debug, fora da árvore do app. */
export function montarPainelDebug({ banco, cenarios }) {
  const raiz = document.createElement('div')
  // data-area="app" dá ao painel a paleta do app mesmo sobre a intro escura.
  raiz.dataset.area = 'app'
  raiz.style.fontFamily = 'var(--font-ui)'
  document.body.appendChild(raiz)
  createRoot(raiz).render(createElement(Painel, { banco, cenarios }))
}
