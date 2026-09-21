import { SceneProvider, useEngine } from '../scene/engine/SceneProvider.jsx'
import SceneStage from '../scene/SceneStage.jsx'
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

function SceneContent({ backgroundVideo }) {
  const { debug } = useEngine()
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05080F]">
      {/* Desktop: a cena ocupa tudo. Retrato: ocupa o topo; o card (Fase 4) fica embaixo. */}
      <div className="absolute inset-x-0 top-0 h-full portrait:h-[58svh]" aria-hidden="true">
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
