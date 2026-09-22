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
import AuthCardSlot from '../intro/AuthCardSlot.jsx'

/**
 * Gatilho de teste do error boundary: `?crash=1` (ou qualquer valor exceto `tick`) derruba a
 * cena de propósito DURANTE A RENDERIZAÇÃO — o caso que um error boundary pega sozinho, sem
 * precisar de `engine.onCrash`. Existe só pra provar que o boundary funciona (ver
 * e2e/verify-error-boundary.mjs); nunca dispara sozinho e não tem custo quando ausente.
 */
function CrashProbe() {
  const crash = new URLSearchParams(window.location.search).get('crash')
  if (crash && crash !== 'tick') throw new Error(`Falha forçada para teste do error boundary (?crash=${crash})`)
  return null
}

/**
 * Gatilho de teste do OUTRO caminho: `?crash=tick` registra uma camada que lança DENTRO do
 * loop do motor (gsap.ticker), não durante a renderização — é o caso que só o try/catch do
 * `tick()` + `engine.onCrash()` conseguem pegar (ver createEngine.js).
 */
function TickCrashProbe() {
  const engine = useEngine()
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('crash') !== 'tick') return
    return engine.add(() => {
      throw new Error('Falha forçada dentro do loop do motor (?crash=tick)')
    }, 'tickCrashProbe')
  }, [engine])
  return null
}

/**
 * Ponte entre o motor (fora do React) e o error boundary (só pega erros durante o render):
 * guarda o erro do `engine.onCrash` num state e o relança na próxima renderização — é isso que
 * o boundary consegue capturar. Fica DENTRO do boundary (é filho dele), então o relance é
 * pego corretamente; fica FORA do slot do card (que é irmão do boundary em SceneContent).
 */
function EngineCrashRelay({ engine }) {
  const [error, setError] = useState(null)
  useEffect(() => engine.onCrash(setError), [engine])
  if (error) throw error
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
      {/* Card de autenticação (Fase 4). Renderizado ANTES do error boundary de propósito, por
          dois motivos: (1) fora dele, sobrevive a uma queda da cena; (2) a ref do slot precisa
          estar anexada ANTES do useGSAP da intro (dentro do boundary) rodar, senão a timeline
          monta com `els.cardSlot` undefined e o card nunca fica com opacity:0 — apareceu
          inteiro, sem animação nenhuma, durante a tela escura/tempestade (bug real, achado
          numa revisão). z-index (intro.css) garante que ele ainda fica visualmente ACIMA da
          cena e ABAIXO da intro, então a ordem no DOM não depende de stacking por posição. A
          intro anima esta posição (entrada pela direita, 7.0–8.0s); aparece pronto quando
          pulada ou em reduced-motion (a timeline só toca essas camadas se `playCinematic`,
          ver IntroOverlay.jsx). */}
      <AuthCardSlot engine={engine} slotRef={cardSlotRef} />

      {/* Se qualquer camada (ou a intro) lançar um erro, isto vira um degradê estático — sem
          canvas, GSAP ou timers, nada que possa lançar de novo. */}
      <SceneErrorBoundary>
        <CrashProbe />
        <TickCrashProbe />
        <EngineCrashRelay engine={engine} />
        {/* Desktop: a cena ocupa tudo. Retrato: ocupa o topo; o card (Fase 4) fica embaixo. */}
        <div ref={sceneRef} className="absolute inset-x-0 top-0 h-full portrait:h-[50svh]" aria-hidden="true">
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
