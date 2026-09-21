import { makeNoise1D } from './noise.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/**
 * Vento único da cena. Um update por frame (chamado pelo motor); as camadas só leem.
 *
 *   strength  0..1   intensidade total (base + rajada) × intensity
 *   gust      0..1   componente de rajada isolada
 *   dirX/dirY        vetor unitário; predomina da direita para a esquerda, com queda diagonal
 *   x/y              velocidade normalizada (= strength × dir). x < 0 empurra para a esquerda
 *   intensity 0..1.5 mestre, controlado pela intro (Fase 3)
 */
export function createWindController(rng) {
  const noise = makeNoise1D(rng)
  const state = {
    strength: 0.25,
    gust: 0,
    dirX: -0.94,
    dirY: 0.34,
    x: -0.23,
    y: 0.08,
    intensity: 1,
    calm: false,
  }

  let t = rng() * 100
  let gustTarget = 0
  let gustIn = 1.5 + rng() * 2 // primeira rajada logo
  let gustHold = 0

  state.update = (dt) => {
    t += dt

    // Agenda de rajadas: a cada 3–8 s, amplitude 0.35–1, duração 1.2–3 s.
    gustIn -= dt
    if (gustIn <= 0) {
      gustTarget = 0.35 + rng() * 0.65
      gustHold = 1.2 + rng() * 1.8
      gustIn = 3 + rng() * 5
    }
    if (gustHold > 0) {
      gustHold -= dt
      if (gustHold <= 0) gustTarget = 0
    }
    const rate = gustTarget > state.gust ? 1.6 : 0.55 // sobe rápido, cai devagar
    state.gust += (gustTarget - state.gust) * (1 - Math.exp(-rate * dt))

    const base = state.calm ? 0.12 : 0.22 + 0.1 * noise(t * 0.15)
    const turbulence = state.calm ? 0 : 0.06 * noise(t * 0.9 + 40)
    state.strength = clamp01((base + state.gust * 0.7 + turbulence) * state.intensity)

    // A direção oscila ±~12° em torno da diagonal-base (vem da direita, cai para a esquerda).
    const wobble = state.calm ? 0 : noise(t * 0.11 + 7) * 0.21
    const ang = Math.atan2(0.34, -0.94) + wobble
    state.dirX = Math.cos(ang)
    state.dirY = Math.sin(ang)
    state.x = state.strength * state.dirX
    state.y = state.strength * state.dirY
  }

  return state
}
