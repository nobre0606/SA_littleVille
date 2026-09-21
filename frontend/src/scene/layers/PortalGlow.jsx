import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { SCENE } from '../sceneMap.js'
import { useEngine } from '../engine/SceneProvider.jsx'

gsap.registerPlugin(useGSAP)

// Camada 3. O portal "respira": opacity e scale sutis, ciclo de 6 s (3 s + yoyo).
export default function PortalGlow() {
  const engine = useEngine()
  const scope = useRef(null)
  const { x, y } = SCENE.portal

  useGSAP(
    () => {
      if (engine.reduced) return
      gsap.fromTo(
        '.lv-portal',
        { opacity: 0.6, scale: 0.94 },
        { opacity: 1, scale: 1.06, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 },
      )
    },
    { scope, dependencies: [engine] },
  )

  return (
    <div ref={scope} className="lv-layer" data-layer="portal">
      <div className="lv-portal" style={{ left: `${x}%`, top: `${y}%`, width: '9%', height: '22%', opacity: 0.8 }} />
    </div>
  )
}
