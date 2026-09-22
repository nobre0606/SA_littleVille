import { useEffect, useRef, useState } from 'react'
import { SceneProvider, useEngine } from '../scene/engine/SceneProvider.jsx'
import SceneStage from '../scene/SceneStage.jsx'
import SceneErrorBoundary from '../scene/SceneErrorBoundary.jsx'
import Background from '../scene/layers/Background.jsx'
import LightRays from '../scene/layers/LightRays.jsx'
import PortalGlow from '../scene/layers/PortalGlow.jsx'
import Glitter from '../scene/layers/Glitter.jsx'
import Bigfoot from '../scene/layers/Bigfoot.jsx'
import Campfire from '../scene/layers/Campfire.jsx'
import FireLight from '../scene/layers/FireLight.jsx'
import Drips from '../scene/layers/Drips.jsx'
import GroundFog from '../scene/layers/GroundFog.jsx'
import SnowCanvas from '../scene/layers/SnowCanvas.jsx'
import Vignette from '../scene/layers/Vignette.jsx'
import DebugMarkers from '../scene/debug/DebugMarkers.jsx'
import FpsHud from '../scene/debug/FpsHud.jsx'
import IntroOverlay from '../intro/IntroOverlay.jsx'

/**
 * Gatilho de teste do error boundary: `?crash=<qualquer coisa>` derruba a cena de propósito.
 * Existe só pra provar que o boundary funciona (ver e2e/verify-error-boundary.mjs) — nunca
 * dispara sozinho, e não tem custo nenhum quando o parâmetro não está na URL.
 */
function CrashProbe() {
  const crash = new URLSearchParams(window.location.search).get('crash')
  if (crash) throw new Error(`Falha forçada para teste do error boundary (?crash=${crash})`)
  return null
}

function SceneContent({ backgroundVideo }) {
  const engine = useEngine()
  const { debug } = engine
  const sceneRef = useRef(null)
  const cardSlotRef = useRef(null)
  // Bump força o remount do IntroOverlay (key), o que reinicia a timeline do zero — é assim
  // que o botão "Repetir intro" do HUD funciona sem recarregar a página.
  const [introToken, setIntroToken] = useState(0)

  useEffect(() => engine.onIntroReplay(() => setIntroToken((t) => t + 1)), [engine])

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05080F]">
      {/* Se qualquer camada (ou a intro) lançar um erro, isto vira um degradê estático — sem
          canvas, GSAP ou timers, nada que possa lançar de novo. O slot do card (abaixo) fica
          DE FORA deste boundary de propósito: uma queda aqui nunca o leva junto. */}
      <SceneErrorBoundary>
        <CrashProbe />
        {/* Desktop: a cena ocupa tudo. Retrato: ocupa o topo; o card (Fase 4) fica embaixo. */}
        <div ref={sceneRef} className="absolute inset-x-0 top-0 h-full portrait:h-[58svh]" aria-hidden="true">
          <SceneStage>
            {/* de trás para frente: camadas 1–9 dentro do stage; a nevasca (10) e a vinheta (11) por cima */}
            <Background backgroundVideo={backgroundVideo} />
            <LightRays />
            <PortalGlow />
            <Glitter />
            <Bigfoot />
            <Campfire />
            <FireLight />
            <Drips />
            <GroundFog />
            {debug && <DebugMarkers />}
          </SceneStage>
          <SnowCanvas />
          <Vignette />
        </div>

        {debug && <FpsHud />}
        <IntroOverlay key={introToken} engine={engine} sceneRef={sceneRef} cardSlotRef={cardSlotRef} forceReplay={introToken > 0} />
      </SceneErrorBoundary>

      {/* Slot reservado para o card de autenticação (Fase 4 — ainda não existe). A intro já
          anima esta posição (entrada pela direita, 7.0–8.0s); fica vazio até a Fase 4 montar
          o card de verdade aqui. Borda só aparece em ?debug=1 (ver intro.css). Fora do
          boundary acima: continua funcionando mesmo se a cena inteira cair. */}
      <div ref={cardSlotRef} className="lv-card-slot" data-testid="auth-card-slot" />
    </main>
  )
}

export default function SceneScreen({ backgroundVideo }) {
  return (
    <SceneProvider>
      <SceneContent backgroundVideo={backgroundVideo} />
    </SceneProvider>
  )
}
