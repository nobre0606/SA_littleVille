import { useEffect, useRef } from 'react'
import { SCENE } from '../sceneMap.js'
import { useEngine } from '../engine/SceneProvider.jsx'

/**
 * Camada 7. Iluminação dinâmica do fogo: dois radial-gradients quentes (soft-light + screen)
 * com raio de ~18% da largura da imagem. A intensidade segue o flicker orgânico do motor
 * (soma de três ruídos), nunca um piscar regular.
 */
export default function FireLight() {
  const engine = useEngine()
  const softRef = useRef(null)
  const screenRef = useRef(null)
  const { x, y } = SCENE.fire.base
  const diameter = SCENE.fire.lightRadius.r * 2

  useEffect(() => {
    const soft = softRef.current
    const scr = screenRef.current
    const off = engine.add((e) => {
      // (cada assinante recebe o próprio nome para toggle/medição no HUD)
      const f = e.fire.flicker * e.ignite.fire
      soft.style.opacity = Math.min(1, f * 0.8).toFixed(3)
      scr.style.opacity = Math.min(1, f * 0.2).toFixed(3)
      const k = 0.96 + 0.06 * e.fire.flicker
      const t = `translate(-50%, -50%) scale(${k.toFixed(3)})`
      soft.style.transform = t
      scr.style.transform = t
    }, 'firelight')
    return off
  }, [engine])

  const pos = { left: `${x}%`, top: `${y - 2}%`, width: `${diameter}%` }
  return (
    <div className="lv-layer" data-layer="firelight">
      <div ref={softRef} className="lv-firelight" style={{ ...pos, mixBlendMode: 'soft-light' }} />
      <div ref={screenRef} className="lv-firelight" style={{ ...pos, mixBlendMode: 'screen' }} />
    </div>
  )
}
