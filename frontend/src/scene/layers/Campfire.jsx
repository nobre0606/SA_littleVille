import { useEffect, useRef } from 'react'
import { SCENE } from '../sceneMap.js'
import { useEngine } from '../engine/SceneProvider.jsx'
import { useStage } from '../SceneStage.jsx'
import { setupCanvas, lerp } from './canvasUtil.js'

// Região do canvas em % da imagem; a base do fogo fica em (rel. x .5, rel. y ≈ .875).
const REGION = { x: 15, y: 58, w: 18, h: 24 }
const FLAME_POOL = 120
const EMBER_POOL = 34
const FLAME_ACTIVE = [45, 80, 120]
const EMBER_ACTIVE = [10, 20, 34]

// Rampa de cor da chama: amarelo #FFD27A → laranja #FF9A3C → vermelho → vermelho escuro.
const RAMP = [
  [0.0, 255, 210, 122],
  [0.35, 255, 154, 60],
  [0.7, 216, 67, 26],
  [1.0, 90, 15, 8],
]
const SPRITES = 16

function buildSprites() {
  return Array.from({ length: SPRITES }, (_, i) => {
    const t = i / (SPRITES - 1)
    let k = 0
    while (k < RAMP.length - 2 && t > RAMP[k + 1][0]) k++
    const a = RAMP[k]
    const b = RAMP[k + 1]
    const f = (t - a[0]) / (b[0] - a[0])
    const r = Math.round(lerp(a[1], b[1], f))
    const g = Math.round(lerp(a[2], b[2], f))
    const bl = Math.round(lerp(a[3], b[3], f))
    const c = document.createElement('canvas')
    c.width = c.height = 48
    const x = c.getContext('2d')
    const grad = x.createRadialGradient(24, 24, 0, 24, 24, 24)
    grad.addColorStop(0, `rgba(${r},${g},${bl},1)`)
    grad.addColorStop(0.45, `rgba(${r},${g},${bl},0.55)`)
    grad.addColorStop(1, `rgba(${r},${g},${bl},0)`)
    x.fillStyle = grad
    x.fillRect(0, 0, 48, 48)
    return c
  })
}

/**
 * Camada 6. Fogueira por partículas em canvas (pool fixo, sem alocação por frame).
 * Chamas: sprites pré-renderizados em aditivo; a rampa de cor segue a idade.
 * O vento entra como aceleração horizontal, então a ponta da chama se inclina mais.
 */
export default function Campfire() {
  const engine = useEngine()
  const stage = useStage()
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const cssW = (stage.w * REGION.w) / 100
    const cssH = (stage.h * REGION.h) / 100
    const { ctx, dpr, w, h } = setupCanvas(canvas, cssW, cssH)
    const sprites = buildSprites()
    const baseX = ((SCENE.fire.base.x - REGION.x) / REGION.w) * w
    const baseY = ((SCENE.fire.base.y - REGION.y) / REGION.h) * h - 4 * dpr

    const fx = new Float32Array(FLAME_POOL)
    const fy = new Float32Array(FLAME_POOL)
    const fvx = new Float32Array(FLAME_POOL)
    const fvy = new Float32Array(FLAME_POOL)
    const fage = new Float32Array(FLAME_POOL).fill(9)
    const flife = new Float32Array(FLAME_POOL).fill(1)
    const fsize = new Float32Array(FLAME_POOL)
    const ex = new Float32Array(EMBER_POOL)
    const ey = new Float32Array(EMBER_POOL)
    const evx = new Float32Array(EMBER_POOL)
    const evy = new Float32Array(EMBER_POOL)
    const eage = new Float32Array(EMBER_POOL).fill(9)
    const elife = new Float32Array(EMBER_POOL).fill(1)
    const esize = new Float32Array(EMBER_POOL)
    const ephase = new Float32Array(EMBER_POOL)
    let flameAcc = 0
    let emberAcc = 0
    let flameCursor = 0
    let emberCursor = 0

    const off = engine.add((e) => {
      const dt = e.dt
      const r = e.rand
      const S = e.stage.scale * dpr // px de canvas por px da imagem
      const flick = e.fire.flicker
      const ign = e.ignite.fire
      const nFlame = FLAME_ACTIVE[e.quality]
      const nEmber = e.reduced ? 0 : EMBER_ACTIVE[e.quality]
      const windX = e.wind.x

      // emissão de chamas (taxa proporcional ao flicker e ao "acender")
      flameAcc += (nFlame / 0.8) * (0.65 + 0.35 * flick) * ign * dt
      while (flameAcc >= 1) {
        flameAcc -= 1
        const i = flameCursor++ % nFlame
        fx[i] = baseX + (r() + r() - 1) * 5 * S
        fy[i] = baseY - r() * 4 * S
        fvx[i] = (r() - 0.5) * 16 * S
        fvy[i] = -(95 + r() * 75) * S * (0.85 + 0.3 * flick)
        flife[i] = 0.45 + r() * 0.55
        fage[i] = 0
        fsize[i] = (11 + r() * 9) * S
      }
      // emissão de brasas
      emberAcc += (e.reduced ? 0 : 5.5 * flick * ign) * dt
      while (emberAcc >= 1) {
        emberAcc -= 1
        const i = emberCursor++ % Math.max(1, nEmber)
        ex[i] = baseX + (r() - 0.5) * 12 * S
        ey[i] = baseY - 10 * S
        evx[i] = (r() - 0.5) * 14 * S
        evy[i] = -(30 + r() * 60) * S
        elife[i] = 1.4 + r() * 1.8
        eage[i] = 0
        esize[i] = (0.9 + r() * 1.5) * S
        ephase[i] = r() * 6.28
      }

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      for (let i = 0; i < FLAME_POOL; i++) {
        if (fage[i] >= flife[i]) continue
        fage[i] += dt
        const t = fage[i] / flife[i]
        if (t >= 1) continue
        // vento: aceleração horizontal, mais forte no alto da chama (idade alta)
        fvx[i] += windX * 260 * S * t * dt
        fx[i] += fvx[i] * dt
        fy[i] += fvy[i] * dt
        fvy[i] *= 1 - 0.35 * dt
        const size = fsize[i] * (1 - t * 0.75)
        ctx.globalAlpha = (1 - t) * (0.3 + 0.16 * flick)
        ctx.drawImage(sprites[Math.min(SPRITES - 1, (t * SPRITES) | 0)], fx[i] - size / 2, fy[i] - size / 2, size, size)
      }

      ctx.fillStyle = '#FFB066'
      for (let i = 0; i < EMBER_POOL; i++) {
        if (eage[i] >= elife[i]) continue
        eage[i] += dt
        const t = eage[i] / elife[i]
        if (t >= 1) continue
        // brasas seguem a direção do vento (para a esquerda e levemente para baixo no fim)
        evx[i] += (windX * 120 * S + Math.sin(e.time * 3 + ephase[i]) * 18 * S) * dt
        ex[i] += evx[i] * dt
        ey[i] += (evy[i] + e.wind.y * 40 * S * t) * dt
        ctx.globalAlpha = (1 - t) * (0.6 + 0.4 * Math.sin(e.time * 9 + ephase[i]) ** 2)
        const s = esize[i]
        ctx.fillRect(ex[i] - s / 2, ey[i] - s / 2, s, s)
      }
      ctx.globalAlpha = 1
    }, 'campfire')
    return () => {
      off()
      ctx.clearRect(0, 0, w, h)
    }
  }, [engine, stage.w, stage.h])

  return (
    <canvas
      ref={canvasRef}
      data-layer="campfire"
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{ left: `${REGION.x}%`, top: `${REGION.y}%`, width: `${REGION.w}%`, height: `${REGION.h}%` }}
    />
  )
}
