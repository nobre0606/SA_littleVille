import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { SCENE } from '../sceneMap.js'
import { useEngine } from '../engine/SceneProvider.jsx'

gsap.registerPlugin(useGSAP)

const POOL = 3
const GRAVITY = 2600 // px da imagem / s²

/**
 * Camada 8. Uma gota se forma na ponta de uma estalactite real (sceneMap) e cai; a próxima
 * sai de 2 a 5 s depois, em outra ponta sorteada. Tudo criado dentro do contexto do
 * useGSAP (contextSafe), então o cleanup mata timelines e delayedCalls no unmount.
 */
export default function Drips() {
  const engine = useEngine()
  const scope = useRef(null)

  useGSAP(
    (_ctx, contextSafe) => {
      if (engine.reduced) return
      const els = gsap.utils.toArray('.lv-drop')
      const tips = SCENE.stalactiteTips
      const { yMin, yMax } = SCENE.floor
      let n = 0

      const spawn = contextSafe(() => {
        const r = engine.rand
        const el = els[n++ % els.length]
        const tip = tips[Math.floor(r() * tips.length)]
        const floorY = yMin + r() * (yMax - yMin)
        const dist = Math.max(20, ((floorY - tip.y) / 100) * engine.stage.h)
        const fall = Math.sqrt((2 * (dist / engine.stage.scale)) / GRAVITY)

        gsap.set(el, { left: `${tip.x}%`, top: `${tip.y}%`, y: 0, opacity: 0, scaleX: 0.5, scaleY: 0.3, transformOrigin: '50% 0' })
        gsap
          .timeline()
          .to(el, { opacity: 1, scaleX: 1, scaleY: 1, duration: 0.6, ease: 'sine.out' }) // forma-se na ponta
          .to(el, { y: dist, duration: fall, ease: 'power2.in' }, '+=0.05')
          .to(el, { opacity: 0, duration: 0.08 }, '>-0.08')

        gsap.delayedCall(2 + r() * 3, spawn)
      })

      gsap.delayedCall(0.6 + engine.rand() * 1.5, spawn)
    },
    { scope, dependencies: [engine] },
  )

  return (
    <div ref={scope} className="lv-layer" data-layer="drips">
      {Array.from({ length: POOL }, (_, i) => (
        <div key={i} className="lv-drop" />
      ))}
    </div>
  )
}
