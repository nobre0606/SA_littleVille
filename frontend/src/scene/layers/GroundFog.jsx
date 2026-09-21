import { useEffect, useRef } from 'react'
import { useEngine } from '../engine/SceneProvider.jsx'
import { makeRng } from '../engine/noise.js'

// Camada 9. Névoa rasteira azulada. A textura é gerada uma vez em canvas (repetível na
// horizontal) e deslizada por transform; a velocidade vem do vento único.
const LAYERS = [
  { top: 76, h: 20, opacity: 0.38, seed: 11, drift: 0.012, gain: 0.07, minQ: 0 },
  { top: 80, h: 15, opacity: 0.28, seed: 29, drift: 0.02, gain: 0.11, minQ: 1 },
]
const AREA_W = 72 // % da largura da imagem

function makeFogTexture(seed) {
  const rand = makeRng(seed)
  const w = 512
  const h = 128
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  for (let i = 0; i < 30; i++) {
    const x = rand() * w
    const y = h * (0.3 + 0.45 * rand())
    const rx = w * (0.08 + 0.14 * rand())
    const a = 0.1 + 0.16 * rand()
    for (const dx of [-w, 0, w]) {
      // cópias deslocadas garantem emenda perfeita na repetição horizontal
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, rx)
      g.addColorStop(0, `rgba(150,205,240,${a})`)
      g.addColorStop(1, 'rgba(150,205,240,0)')
      ctx.fillStyle = g
      ctx.save()
      ctx.translate(x + dx, y)
      ctx.scale(1, 0.32)
      ctx.translate(-(x + dx), -y)
      ctx.fillRect(x + dx - rx, y - rx, rx * 2, rx * 2)
      ctx.restore()
    }
  }
  return c.toDataURL('image/png')
}

export default function GroundFog() {
  const engine = useEngine()
  const wrapRefs = useRef([])
  const stripRefs = useRef([])

  useEffect(() => {
    LAYERS.forEach((L, i) => {
      stripRefs.current[i].style.backgroundImage = `url(${makeFogTexture(L.seed)})`
    })
    const off = [0, 0]
    const shown = [null, null]
    const remove = engine.add((e) => {
      const areaW = (e.stage.w * AREA_W) / 100
      LAYERS.forEach((L, i) => {
        const visible = e.quality >= L.minQ
        if (visible !== shown[i]) {
          shown[i] = visible
          wrapRefs.current[i].style.display = visible ? '' : 'none'
        }
        if (!visible || e.reduced || areaW <= 0) return
        off[i] += (-L.drift * areaW + e.wind.x * L.gain * areaW) * e.dt
        if (off[i] <= -areaW) off[i] += areaW
        stripRefs.current[i].style.transform = `translate3d(${off[i].toFixed(1)}px,0,0)`
      })
    }, 'fog')
    return remove
  }, [engine])

  return (
    <div className="lv-layer" data-layer="fog">
      {LAYERS.map((L, i) => (
        <div
          key={i}
          ref={(el) => (wrapRefs.current[i] = el)}
          className="lv-fog-v"
          style={{ left: 0, top: `${L.top}%`, width: `${AREA_W}%`, height: `${L.h}%`, opacity: L.opacity }}
        >
          <div className="lv-fog-h">
            <div ref={(el) => (stripRefs.current[i] = el)} className="lv-fog-strip" />
          </div>
        </div>
      ))}
    </div>
  )
}
