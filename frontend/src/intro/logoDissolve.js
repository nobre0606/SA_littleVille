/**
 * Dissolução da logo em partículas levadas pelo vento (Fase 3, 3.2 — "amostrar os pixels da
 * logo e convertê-los em flocos do sistema de neve"). Em vez de reaproveitar literalmente o
 * pool do `snowSim` (que já está com o próprio orçamento ocupado pela tempestade da intro),
 * uso um pool PRÓPRIO, pequeno e efêmero, mas com a MESMA lógica de vento/paleta — visualmente
 * é a logo "virando neve", que é o efeito pedido; sob o capô são dois sistemas independentes,
 * mais fáceis de orçar e de desligar (fallback fade+blur) sem mexer na nevasca de verdade.
 *
 * Nenhum rAF próprio: `frame()` é chamado pelo mesmo `engine.add` do resto da cena.
 */

const MAX_PARTICLES = 700
const COLORS = ['#EAF6FF', '#BFEFFF', '#7FE3FF']

export function createLogoDissolve(rand) {
  const px = new Float32Array(MAX_PARTICLES)
  const py = new Float32Array(MAX_PARTICLES)
  const vx = new Float32Array(MAX_PARTICLES)
  const vy = new Float32Array(MAX_PARTICLES)
  const sz = new Float32Array(MAX_PARTICLES)
  const life = new Float32Array(MAX_PARTICLES)
  const age = new Float32Array(MAX_PARTICLES)
  const col = new Uint8Array(MAX_PARTICLES)
  let count = 0
  let elapsed = 0
  let duration = 1

  return {
    get active() {
      return count > 0 && elapsed < duration
    },

    /**
     * `points`: [{x,y}] em px de tela (já no local exato de cada pixel opaco da logo
     * renderizada). Amostra até MAX_PARTICLES ao acaso, para não pagar 1 partícula por pixel.
     */
    begin(points, { durationS = 1.1, spread = 60 } = {}) {
      duration = durationS
      elapsed = 0
      count = Math.min(MAX_PARTICLES, points.length)
      // amostragem por passo, com um pequeno jitter de fase para não pegar sempre a mesma grade
      const step = points.length / count
      const jitter = rand() * step
      for (let i = 0; i < count; i++) {
        const p = points[Math.min(points.length - 1, Math.floor(i * step + jitter))]
        px[i] = p.x
        py[i] = p.y
        const ang = rand() * Math.PI * 2
        const spd = spread * (0.3 + rand() * 0.7)
        vx[i] = Math.cos(ang) * spd
        vy[i] = Math.sin(ang) * spd - spread * 0.25 // leve impulso pra cima, como fumaça/neve
        sz[i] = 1.2 + rand() * 2.6
        life[i] = durationS * (0.55 + rand() * 0.5)
        age[i] = 0
        col[i] = Math.floor(rand() * COLORS.length)
      }
    },

    /** Avança e desenha. Retorna 0..1 (progresso) para a timeline decidir quando encerrar. */
    frame(ctx, e) {
      elapsed += e.dt
      if (count === 0) return 1
      const dt = e.dt
      const wind = e.wind
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < count; i++) {
        age[i] += dt
        if (age[i] >= life[i]) continue
        // o vento da cena assume a partícula aos poucos: começa como impulso próprio, termina
        // sendo puramente levada (mesma direção/força que a neve e as brasas da fogueira).
        const t = Math.min(1, age[i] / (life[i] * 0.4))
        vx[i] += (wind.x * 340 - vx[i]) * t * dt * 2
        vy[i] += (wind.y * 340 + 30 - vy[i]) * t * dt * 2
        px[i] += vx[i] * dt
        py[i] += vy[i] * dt
        const a = 1 - age[i] / life[i]
        ctx.globalAlpha = a * a
        ctx.fillStyle = COLORS[col[i]]
        const s = sz[i] * (0.6 + 0.4 * a)
        ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s)
      }
      ctx.globalAlpha = 1
      return Math.min(1, elapsed / duration)
    },

    clear(ctx) {
      count = 0
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    },
  }
}

/**
 * Amostra pontos opacos de um elemento já desenhado na tela (img/svg rasterizado), em px do
 * VIEWPORT (não do elemento), prontos para `begin()`. `stride` pula pixels pra não amostrar
 * 1-a-1 numa imagem grande (custo de leitura, não de desenho).
 */
export function samplePixelsFromElement(el, stride = 3) {
  const rect = el.getBoundingClientRect()
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const ctx = off.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(el, 0, 0, w, h)
  let data
  try {
    data = ctx.getImageData(0, 0, w, h).data
  } catch {
    return [] // elemento "tainted" (não deveria acontecer com asset same-origin) -> fallback fade+blur
  }
  const points = []
  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      if (data[(y * w + x) * 4 + 3] > 40) points.push({ x: rect.left + x, y: rect.top + y })
    }
  }
  return points
}
