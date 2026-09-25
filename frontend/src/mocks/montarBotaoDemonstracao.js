import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { BotaoDemonstracao } from './BotaoDemonstracao.jsx'

/**
 * Monta o botão de demonstração numa raiz React própria (fora do app, como o painel de debug)
 * e o avisa a cada troca de rota — ele só aparece em "/" e "/login".
 *
 * O React Router troca de rota com history.pushState/replaceState, que não disparam evento:
 * por isso "embrulhamos" os dois (além de ouvir o popstate do botão Voltar).
 */
export function montarBotaoDemonstracao() {
  const ouvintes = new Set()
  const avisar = () => ouvintes.forEach((fn) => fn())
  for (const metodo of ['pushState', 'replaceState']) {
    const original = window.history[metodo].bind(window.history)
    window.history[metodo] = (...args) => {
      original(...args)
      avisar()
    }
  }
  window.addEventListener('popstate', avisar)
  const assinarRota = (fn) => {
    ouvintes.add(fn)
    return () => ouvintes.delete(fn)
  }

  const raiz = document.createElement('div')
  raiz.dataset.area = 'app' // paleta do app (tokens) mesmo sobre a intro escura
  document.body.appendChild(raiz)
  createRoot(raiz).render(createElement(BotaoDemonstracao, { assinarRota }))
}
