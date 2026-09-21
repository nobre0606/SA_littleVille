import { useEffect, useRef } from 'react'
import { SCENE } from '../sceneMap.js'
import { useEngine } from '../engine/SceneProvider.jsx'
import { useStage } from '../SceneStage.jsx'
import { setupCanvas } from './canvasUtil.js'

// Camada 4. Partículas pequenas e lentas caindo dentro do feixe. Região em % da imagem.
const REGION = { x: 20, y: 12, w: 21, h: 54 }
const POOL = 70
const ACTIVE = [20, 40, 70] // por nível de qualidade
const COLORS = ['#BFEFFF', '#7FE3FF', '#EAF6FF']

export default function Glitter() {
  const engine = useEngine()
  const stage = useStage()
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const cssW = (stage.w * REGION.w) / 100
    const cssH = (stage.h * REGION.h) / 100
    const { ctx, dpr, w, h } = setupCanvas(canvas, cssW, cssH)
    const cx = (SCENE.ceilingLight.x - REGION.x) / REGION.w // centro do feixe (0..1 da região)

    // Pool fixo (sem alocar por frame). Coordenadas normalizadas 0..1 na região.
    const px = new Float32Array(POOL)
    const py = new Float32Array(POOL)
    const vy = new Float32Array(POOL)
    const sz = new Float32Array(POOL)
    const ph = new Float32Array(POOL)
    const col = new Uint8Array(POOL)
    const spawn = (i, anywhere) => {
      const r = engine.rand
      py[i] = anywhere ? r() : -0.02
      const spread = 0.12 + 0.3 * py[i] // o feixe alarga para baixo
      px[i] = cx + (r() * 2 - 1) * spread
      vy[i] = 0.012 + r() * 0.022 // frações da altura da região por segundo
      sz[i] = 0.6 + r() * 1.3
      ph[i] = r() * 6.28
      col[i] = Math.floor(r() * COLORS.length)
    }
    for (let i = 0; i < POOL; i++) spawn(i, true)

    const off = engine.add((e) => {
      const n = e.reduced ? 12 : ACTIVE[e.quality]
      const dt = e.dt
      const windDx = e.wind.x * 0.05 * dt
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < n; i++) {
        if (!e.reduced) {
          py[i] += vy[i] * dt
          px[i] += windDx + Math.sin(e.time * 0.7 + ph[i]) * 0.0006
        }
        if (py[i] > 1.02) spawn(i, false)
        // Cintila; some nas bordas verticais da região.
        const tw = 0.55 + 0.45 * Math.sin(e.time * 2.1 + ph[i] * 3)
        const edge = Math.min(1, py[i] * 8, (1 - py[i]) * 8)
        ctx.globalAlpha = Math.max(0, tw * edge * 0.85)
        ctx.fillStyle = COLORS[col[i]]
        const s = sz[i] * dpr * Math.max(0.6, e.stage.scale)
        ctx.fillRect(px[i] * w - s / 2, py[i] * h - s / 2, s, s)
      }
      ctx.globalAlpha = 1
    }, 'glitter')
    return () => {
      off()
      ctx.clearRect(0, 0, w, h)
    }
  }, [engine, stage.w, stage.h])

  return (
    <canvas
      ref={canvasRef}
      data-layer="glitter"
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        left: `${REGION.x}%`,
        top: `${REGION.y}%`,
        width: `${REGION.w}%`,
        height: `${REGION.h}%`,
        mixBlendMode: 'screen',
      }}
    />
  )
}
