import { Component } from 'react'

/**
 * Se qualquer camada da cena (ou a intro) lançar um erro durante a renderização, React
 * "desmonta" a árvore inteira até achar um error boundary — sem um aqui, isso derruba a
 * página inteira (já vimos isso acontecer: reload numa sessão que já viu a intro quebrava por
 * causa de um `canvas.getContext(null)`, ver IntroOverlay.jsx). Error boundary PRECISA ser uma
 * classe: não existe equivalente em hook no React 19.
 *
 * O fallback é um degradê estático (sem canvas, sem GSAP, sem timers — nada que possa lançar
 * de novo). O slot do card (Fase 4) fica FORA deste boundary, como irmão em SceneScreen.jsx,
 * então uma queda aqui nunca o leva junto.
 */
export default class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Precisa ficar visível: é o único sinal de que a cena caiu para o fallback (o usuário só
    // vê um fundo estático, sem indício do motivo).
    console.error('[SceneErrorBoundary] a cena caiu para o fundo estático:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="lv-scene-fallback" data-testid="scene-fallback" aria-hidden="true">
          <div className="lv-scene-fallback-fire" />
        </div>
      )
    }
    return this.props.children
  }
}
