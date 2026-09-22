/**
 * Benchmark de dispositivo para a intro (Fase 3). Roda nos 0–0,6 s de tela escura: a neve já
 * sobe para intensidade de tempestade ali (escondida atrás do overlay), e o benchmark mede o
 * custo REAL desse regime antes de decidir quantas partículas a tempestade vai ter quando o
 * overlay abrir — em vez de assumir a qualidade adaptativa (que ignora a intro de propósito,
 * ver qualityGovernor.js) e descobrir só depois, com a tempestade cheia, que o aparelho não
 * aguenta.
 *
 * Por que não uma trava de ms fixa (bug corrigido):
 * Um limiar do tipo "≤15 ms → alta" pressupõe 60 Hz (16,7 ms por frame é o PISO ali; nunca cai
 * abaixo disso mesmo num aparelho perfeito). Num display de 120 Hz o piso é 8,3 ms; em 144 Hz,
 * 6,9 ms. Por isso:
 *   1. detectamos a taxa de atualização real do aparelho: mediana dos intervalos brutos entre
 *      frames (não a EMA de `engine.fps.ms`, que suaviza justamente os frames perdidos que
 *      queremos contar);
 *   2. classificamos pela PROPORÇÃO DE FRAMES PERDIDOS (intervalo > 1,5× a mediana), não por um
 *      ms absoluto. Isso funciona igual em 60/120/144 Hz: o que importa é se o aparelho está
 *      *conseguindo* sustentar a própria taxa, não o valor nominal dela.
 * Mediana em vez de média nos dois cálculos porque um único frame de GC/JIT no meio da amostra
 * não pode arrastar a leitura inteira.
 */

/** Tetos de partículas por tier, na mesma escala 0..1500 de SNOW_MAX (snowSim.js). */
export const STORM_TIERS = {
  high: { cap: 1500, snowIntensity: 1 },
  medium: { cap: 1050, snowIntensity: 0.7 },
  low: { cap: 600, snowIntensity: 0.4 },
}

/** Vento usado só durante a medição (tempestade cheia, escondida atrás do overlay). */
const BENCH_WIND_INTENSITY = 1.6
/** Vento devolvido para a cena depois de decidir o tier (a intro assume daqui pra frente). */
const NORMAL_WIND_INTENSITY = 1

function median(nums) {
  const s = [...nums].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Classifica pela proporção de frames com intervalo > 1,5× a mediana detectada.
 *   ≤ 5%  perdidos -> high    (sobra folga para a tempestade cheia)
 *   ≤ 20% perdidos -> medium
 *   > 20% perdidos -> low
 */
export function classifyByDropRatio(dropRatio) {
  if (!Number.isFinite(dropRatio)) return 'medium' // amostra inválida: não aposta no extremo
  if (dropRatio <= 0.05) return 'high'
  if (dropRatio <= 0.2) return 'medium'
  return 'low'
}

/**
 * `intervalsMs`: duração real de cada frame pós-warmup, em ms (não suavizada). Retorna a
 * mediana (~intervalo nominal do display), a taxa detectada (Hz, só informativa) e o tier.
 */
export function analyzeFrameIntervals(intervalsMs) {
  if (!intervalsMs || intervalsMs.length === 0) {
    return { refreshMs: NaN, hz: NaN, dropRatio: NaN, dropped: 0, frames: 0, tier: 'medium' }
  }
  const refreshMs = median(intervalsMs)
  const threshold = refreshMs * 1.5
  const dropped = intervalsMs.reduce((n, ms) => n + (ms > threshold ? 1 : 0), 0)
  const dropRatio = dropped / intervalsMs.length
  return { refreshMs, hz: 1000 / refreshMs, dropRatio, dropped, frames: intervalsMs.length, tier: classifyByDropRatio(dropRatio) }
}

/**
 * Mede o custo real com a neve em tempestade cheia (forçada durante a medição, mesmo que a
 * cena visível ainda esteja em outro estado — é para isso que serve o overlay escuro por cima).
 * Ao terminar, aplica o tier decidido (`engine.setSnow`/`setWindIntensity`) e devolve o vento
 * ao normal — quem chama não precisa fazer mais nada além de deixar o overlay escuro cobrir
 * esses ~0,4–0,6 s.
 *
 * Usa o mesmo loop único do motor (`engine.add`), sem `requestAnimationFrame` próprio.
 */
export function runIntroBenchmark(engine, { sampleMs = 400, warmupFrames = 3 } = {}) {
  return new Promise((resolve) => {
    engine.setSnow({ intensity: 1 })
    engine.setWindIntensity(BENCH_WIND_INTENSITY)

    const intervals = []
    let n = 0
    let elapsed = 0
    let settled = false

    const finish = (result) => {
      if (settled) return
      settled = true
      off()
      engine.setSnow({ intensity: STORM_TIERS[result.tier].snowIntensity })
      engine.setWindIntensity(NORMAL_WIND_INTENSITY)
      resolve(result)
    }

    const off = engine.add((e) => {
      n++
      if (n <= warmupFrames) return // pico de JIT/decode do início, descartado
      const ms = e.dt * 1000
      intervals.push(ms)
      elapsed += ms
      if (elapsed >= sampleMs && intervals.length >= 6) finish(analyzeFrameIntervals(intervals))
    }, 'introBenchmark')

    // Guarda de segurança: se o motor nunca acumular amostra suficiente (aba oculta logo no
    // início, por exemplo), não trava a intro para sempre.
    setTimeout(() => finish(analyzeFrameIntervals(intervals)), sampleMs * 4 + 500)
  })
}
