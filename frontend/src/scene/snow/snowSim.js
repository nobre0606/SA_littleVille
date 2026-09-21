import { SCENE } from '../sceneMap.js'

/**
 * Nevasca em Canvas 2D próprio (sem bibliotecas de partículas).
 *
 * - Pool FIXO de SNOW_MAX partículas em typed arrays: nenhuma alocação por frame. A quantidade
 *   ativa = SNOW_MAX × intensidade × fator de qualidade (o FPS adaptativo reduz sozinho).
 * - 3 profundidades: fundo (pequenos, lentos, suaves), meio, frente (grandes, rápidos, bokeh).
 * - O vento vem do windController único (mesmo `wind` da chama, das brasas e da névoa).
 * - Traços: o "tempo de exposição" τ cresce com a tempestade; cada floco vira um traço de
 *   comprimento |v|·τ alinhado à velocidade. Sem tempestade τ = 0 e os flocos são redondos.
 * - Paleta: #EAF6FF, #BFEFFF, brilhos #7FE3FF. Perto da fogueira (raio ~15% da imagem) o
 *   floco faz crossfade para #FFB066 com um leve glow. Nada de branco puro nem cinza.
 * - Sem `ctx.filter` (o Safari não suporta): o desfoque vem de sprites pré-renderizados.
 */

export const SNOW_MAX = 1500
const WIND_PX = 460 // px/s por unidade de vento (antes de escalar pela profundidade)
const QUALITY_FACTOR = [0.4, 0.7, 1] // low, medium, high
const REDUCED_COUNT = 40

// size = raio em px da imagem; vy = queda base (px/s); wind = quanto o vento pesa nesta camada.
const LAYERS = [
  { share: 0.45, size: [0.7, 1.5], alpha: [0.35, 0.6], vy: 38, wind: 0.55, sway: 6, soft: 0, iceBias: 0.7 },
  { share: 0.4, size: [1.4, 3.0], alpha: [0.55, 0.9], vy: 85, wind: 1.0, sway: 10, soft: 1, iceBias: 0.55 },
  { share: 0.15, size: [6, 13], alpha: [0.1, 0.24], vy: 170, wind: 1.7, sway: 16, soft: 2, iceBias: 0.5 },
]

const RGB = { base: [234, 246, 255], ice: [191, 239, 255], glint: [127, 227, 255], warm: [255, 176, 102] }
const GLINT_SHARE = 0.06

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

/** Sprite radial: soft 0 = muito difuso, 1 = normal, 2 = bokeh (disco com borda mais clara). */
function makeSprite(rgb, soft, size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const h = size / 2
  const g = x.createRadialGradient(h, h, 0, h, h, h)
  const stops =
    soft === 0
      ? [[0, 0.85], [0.35, 0.55], [1, 0]]
      : soft === 1
        ? [[0, 1], [0.5, 0.85], [1, 0]]
        : [[0, 0.3], [0.72, 0.42], [0.92, 0.72], [1, 0]]
  for (const [o, a] of stops) g.addColorStop(o, rgba(rgb, a))
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  return c
}

function makeGlow(rgb, size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const h = size / 2
  const g = x.createRadialGradient(h, h, 0, h, h, h)
  g.addColorStop(0, rgba(rgb, 0.5))
  g.addColorStop(1, rgba(rgb, 0))
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  return c
}

export function createSnowSim(rand) {
  const N = SNOW_MAX
  const x = new Float32Array(N)
  const y = new Float32Array(N)
  const sz = new Float32Array(N) // raio em px da imagem
  const pa = new Float32Array(N) // alpha base
  const ph = new Float32Array(N) // fase do balanço / cintilação
  const sp = new Float32Array(N) // variação de velocidade 0.8–1.2
  const age = new Float32Array(N).fill(9) // fade-in ao ativar
  const wt = new Float32Array(N) // 0..1 proximidade da fogueira (mistura quente)
  const col = new Uint8Array(N) // 0 base, 1 ice, 2 glint
  const pvx = new Float32Array(N) // velocidade do frame (com balanço), para o ângulo dos traços
  const pvy = new Float32Array(N)
  const pb = new Uint8Array(N) // balde do traço: tamanho(3) × quente(2) × gelo(2); 255 = glint

  const layers = LAYERS.map((L, i) => ({ ...L, cap: Math.round(N * L.share), prev: 0, start: 0, i }))
  let acc = 0
  for (const L of layers) {
    L.start = acc
    acc += L.cap
  }

  const sprites = [0, 1, 2].map((s) => [makeSprite(RGB.base, s), makeSprite(RGB.ice, s)])
  const glint = makeSprite(RGB.glint, 1)
  const warm = makeSprite(RGB.warm, 1)
  const warmGlow = makeGlow(RGB.warm)

  let W = 0
  let H = 0

  function initParticle(i, L) {
    x[i] = rand() * W
    y[i] = rand() * H
    sz[i] = L.size[0] + rand() * (L.size[1] - L.size[0])
    pa[i] = L.alpha[0] + rand() * (L.alpha[1] - L.alpha[0])
    ph[i] = rand() * 6.283
    sp[i] = 0.7 + rand() * 0.6
    const r = rand()
    col[i] = L.i < 2 && r < GLINT_SHARE ? 2 : rand() < L.iceBias ? 1 : 0
    age[i] = 0
  }

  return {
    resize(w, h) {
      W = w
      H = h
      for (const L of layers) {
        for (let j = 0; j < L.cap; j++) initParticle(L.start + j, L)
        L.prev = 0
      }
    },

    /**
     * Atualiza e desenha num único passe por camada. Retorna o nº de partículas ativas e o
     * fator de tempestade (0..1) para o HUD/testes.
     */
    frame(ctx, e, pxScale) {
      const dt = e.dt
      const wind = e.wind
      const reduced = e.reduced
      const intensity = clamp01(e.snow.intensity)
      const f = reduced ? REDUCED_COUNT / N : intensity * QUALITY_FACTOR[e.quality]
      // Tempestade: só com vento forte E neve intensa (rajadas no calmo dão traços curtos).
      const storm = reduced ? 0 : clamp01((wind.strength * (0.6 + 0.6 * intensity) - 0.35) / 0.5)
      const tau = 0.05 * storm // "exposição" do motion blur, s
      const speed = reduced ? 0.35 : 1
      const k = Math.max(0.6, Math.min(1.4, e.stage.scale)) * pxScale

      // Fogueira em px do canvas (o canvas cobre o container; o stage está deslocado nele).
      const fx = (e.stage.x + (e.stage.w * SCENE.fire.base.x) / 100) * pxScale
      const fy = (e.stage.y + (e.stage.h * (SCENE.fire.base.y - 3)) / 100) * pxScale
      const fr = (e.stage.w * SCENE.fire.snowWarmRadius.r) / 100 * pxScale
      const fr2 = fr * fr

      ctx.clearRect(0, 0, W, H)
      let active = 0

      for (const L of layers) {
        const cnt = Math.round(L.cap * f)
        active += cnt
        // flocos recém-ativados entram com fade-in em posição aleatória (sem "fileira" na borda)
        for (let j = L.prev; j < cnt; j++) initParticle(L.start + j, L)
        L.prev = cnt
        if (cnt === 0) continue

        const vx = wind.x * WIND_PX * L.wind * k * speed
        const vy = (L.vy * (1 + 0.7 * storm) + wind.y * WIND_PX * L.wind * 0.5) * k * speed
        const m = 24 * k + Math.abs(vx) * tau
        const swayAmp = reduced ? 0 : L.sway * k * (1 - 0.6 * storm)
        const t = e.time
        const front = L.i === 2
        const streak = tau > 0 && Math.hypot(vx, vy) * tau > L.size[1] * k * 1.6

        // --- atualização ---------------------------------------------------------------
        for (let j = 0; j < cnt; j++) {
          const i = L.start + j
          age[i] += dt
          pvx[i] = vx * sp[i] + Math.sin(t * 0.9 + ph[i]) * swayAmp
          pvy[i] = vy * sp[i] * (1 + 0.14 * Math.sin(t * 1.3 + ph[i] * 2)) // ângulo varia por floco
          x[i] += pvx[i] * dt
          y[i] += pvy[i] * dt
          if (x[i] < -m) {
            x[i] = W + m * 0.5
            y[i] = rand() * H
          }
          if (y[i] > H + m) {
            y[i] = -m * 0.5
            x[i] = rand() * (W + W * 0.35) // o vento leva os flocos para a esquerda: nasce além da borda direita
          }
          const dx = x[i] - fx
          const dy = y[i] - fy
          const d2 = dx * dx + dy * dy
          wt[i] = d2 < fr2 ? 1 - Math.sqrt(d2) / fr : 0
          if (streak) {
            const s01 = (sz[i] - L.size[0]) / (L.size[1] - L.size[0])
            pb[i] = col[i] === 2 ? 255 : Math.min(2, (s01 * 3) | 0) + 3 * (wt[i] > 0.5 ? 1 : 0) + 6 * (col[i] === 1 ? 1 : 0)
          }
        }

        // --- desenho -------------------------------------------------------------------
        if (!streak) {
          // Flocos redondos: sprites (o soft da camada dá o desfoque de profundidade).
          const spr = sprites[L.soft]
          for (let j = 0; j < cnt; j++) {
            const i = L.start + j
            const r = sz[i] * k
            const a = pa[i] * Math.min(1, age[i] * 2)
            if (col[i] === 2) {
              ctx.globalAlpha = a * (0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + ph[i]))) // cintila
              const gr = r * 1.7
              ctx.drawImage(glint, x[i] - gr, y[i] - gr, gr * 2, gr * 2)
              continue
            }
            const w = wt[i]
            ctx.globalAlpha = a * (1 - w)
            if (w < 0.98) ctx.drawImage(spr[col[i]], x[i] - r, y[i] - r, r * 2, r * 2)
            if (w > 0.02) {
              ctx.globalAlpha = a * w
              ctx.drawImage(warm, x[i] - r, y[i] - r, r * 2, r * 2)
              ctx.globalAlpha = a * w * 0.6
              ctx.drawImage(warmGlow, x[i] - r * 3.2, y[i] - r * 3.2, r * 6.4, r * 6.4)
            }
          }
        } else if (front) {
          // Frente em tempestade: bokeh esticado e rotacionado na direção da velocidade.
          for (let j = 0; j < cnt; j++) {
            const i = L.start + j
            const r = sz[i] * k
            const ang = Math.atan2(pvy[i], pvx[i])
            const ca = Math.cos(ang)
            const sa = Math.sin(ang)
            const len = Math.hypot(pvx[i], pvy[i]) * tau
            ctx.setTransform(ca, sa, -sa, ca, x[i], y[i])
            ctx.globalAlpha = pa[i] * Math.min(1, age[i] * 2) * 0.85
            ctx.drawImage(wt[i] > 0.5 ? warm : sprites[2][col[i] === 1 ? 1 : 0], -len - r, -r * 0.8, len + r * 2, r * 1.6)
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0)
        } else {
          // Fundo/meio em tempestade: traços em lote (1 stroke por balde tamanho × quente × gelo),
          // cada floco com a própria velocidade/ângulo; alpha e espessura crescem com o tamanho.
          ctx.lineCap = 'round'
          ctx.globalAlpha = 1
          const range = L.size[1] - L.size[0]
          const arange = L.alpha[1] - L.alpha[0]
          for (let b = 0; b < 12; b++) {
            const sb = b % 3
            const hot = ((b / 3) | 0) & 1
            const ice = b >= 6
            ctx.beginPath()
            let any = false
            for (let j = 0; j < cnt; j++) {
              const i = L.start + j
              if (pb[i] !== b) continue
              any = true
              ctx.moveTo(x[i] - pvx[i] * tau, y[i] - pvy[i] * tau)
              ctx.lineTo(x[i], y[i])
            }
            if (!any) continue
            const u = (sb + 0.5) / 3
            ctx.strokeStyle = rgba(hot ? RGB.warm : ice ? RGB.ice : RGB.base, L.alpha[0] + arange * u)
            ctx.lineWidth = (L.size[0] + range * u) * 2 * k
            ctx.stroke()
          }
          // glints continuam como pontos cintilantes
          for (let j = 0; j < cnt; j++) {
            const i = L.start + j
            if (col[i] !== 2) continue
            const gr = sz[i] * k * 1.7
            ctx.globalAlpha = pa[i] * (0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + ph[i])))
            ctx.drawImage(glint, x[i] - gr, y[i] - gr, gr * 2, gr * 2)
          }
        }
      }
      ctx.globalAlpha = 1
      return { active, storm }
    },
  }
}
