import { STORM_TIERS } from '../scene/engine/introBenchmark.js'

const TIER_ORDER = ['high', 'medium', 'low']
const CHECK_WINDOW_MS = 500
const TRIP_FACTOR = 2
const MIN_SAMPLES = 3 // amostras mínimas na janela pra não decidir em cima de ruído

function median(nums) {
  const s = [...nums].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Freio de emergência da tempestade da intro. Única exceção à regra "a qualidade adaptativa
 * ignora a intro" (`engine.setAdaptivePaused(true)`, ver qualityGovernor.js): monitora a
 * MEDIANA dos intervalos brutos de frame (relógio de parede, não `engine.dt` — o mesmo motivo
 * do bug corrigido em introBenchmark.js: `engine.dt` é limitado a 50ms e esconderia frames
 * ruins de verdade) numa janela de 0,5s. Se a mediana da janela passar de 2× o `refreshMs`
 * detectado pelo benchmark inicial, reduz as partículas da tempestade um nível NA HORA.
 *
 * Sem recuperação: uma vez acionado, o nível fica reduzido pelo resto da intro (é um freio de
 * emergência, não um governador de duas mãos — subir de novo no meio da tempestade visível
 * criaria um solavanco visual bem mais chamativo que ficar num nível mais baixo).
 *
 * Usa o mesmo loop único do motor (`engine.add`), sem `requestAnimationFrame` próprio.
 */
export function createStormWatchdog({ engine, refreshMs, startTier = 'high', now = () => performance.now() }) {
  let tierIndex = Math.max(0, TIER_ORDER.indexOf(startTier))
  let windowStart = null
  let samples = []
  let lastTs = null
  let trippedCount = 0
  let disposed = false

  const threshold = Number.isFinite(refreshMs) && refreshMs > 0 ? refreshMs * TRIP_FACTOR : 1000 / 24

  function evaluateWindow(t) {
    if (samples.length >= MIN_SAMPLES) {
      const med = median(samples)
      if (med > threshold && tierIndex < TIER_ORDER.length - 1) {
        tierIndex++
        trippedCount++
        engine.setSnow({ intensity: STORM_TIERS[TIER_ORDER[tierIndex]].snowIntensity })
      }
    }
    samples = []
    windowStart = t
  }

  const off = engine.add(() => {
    const t = now()
    if (lastTs !== null) samples.push(t - lastTs)
    lastTs = t
    if (windowStart === null) {
      windowStart = t
      return
    }
    if (t - windowStart >= CHECK_WINDOW_MS) evaluateWindow(t)
  }, 'stormWatchdog')

  return {
    dispose() {
      if (disposed) return
      disposed = true
      off()
    },
    get trippedCount() {
      return trippedCount
    },
    get currentTier() {
      return TIER_ORDER[tierIndex]
    },
  }
}
