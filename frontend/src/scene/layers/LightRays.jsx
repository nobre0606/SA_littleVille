import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { SCENE } from '../sceneMap.js'
import { useEngine } from '../engine/SceneProvider.jsx'

gsap.registerPlugin(useGSAP)

// Camada 2. Três feixes concêntricos saindo da abertura do teto; cada um pulsa num
// ciclo próprio (8–12 s) para nunca sincronizar. Posições em % da imagem.
const BEAMS = [
  { w: 27, top: 11.5, h: 50, op: 0.55, cycle: 10 },
  { w: 15, top: 12.5, h: 56, op: 0.65, cycle: 8.4 },
  { w: 8, top: 13.5, h: 63, op: 0.75, cycle: 11.7 },
]

export default function LightRays() {
  const engine = useEngine()
  const scope = useRef(null)
  const cx = SCENE.ceilingLight.x

  useGSAP(
    () => {
      if (engine.reduced) return // sem pulsação: feixes estáticos
      gsap.utils.toArray('.lv-beam').forEach((el, i) => {
        const b = BEAMS[i]
        gsap.fromTo(
          el,
          { opacity: b.op * 0.7, scaleX: 0.96 },
          { opacity: b.op, scaleX: 1.04, duration: b.cycle / 2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -i * 2.3 },
        )
      })
    },
    { scope, dependencies: [engine] },
  )

  return (
    <div ref={scope} className="lv-layer" data-layer="rays">
      {BEAMS.map((b, i) => (
        <div
          key={i}
          className="lv-beam"
          style={{ left: `${cx - b.w / 2}%`, top: `${b.top}%`, width: `${b.w}%`, height: `${b.h}%`, opacity: b.op }}
        />
      ))}
    </div>
  )
}
