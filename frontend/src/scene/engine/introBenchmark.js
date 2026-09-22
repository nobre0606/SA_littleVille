/**
 * Benchmark de dispositivo para a intro (Fase 3). Ainda NÃO é chamado por nada em produção —
 * é só a função pronta, testada por unidade (introBenchmark.test.js) e testável à mão via
 * `?debug=1` (o HUD tem um botão "rodar benchmark" que mostra o resultado sem mudar a neve).
 *
 * Ideia: a intro começa com 0,6 s de tela escura (Fase 3, seção 3.2). Nesses 0,6 s a cena já
 * está montada e rodando (fundo, luzes, fogo) só que invisível, então dá pra medir o custo
 * real de um frame ANTES de decidir quantas partículas a tempestade da intro vai ter — em vez
 * de assumir a qualidade adaptativa (que ignora a intro de propósito, ver qualityGovernor.js) e
 * descobrir só depois, com a tempestade cheia, que o aparelho não aguenta.
 *
 * `runIntroBenchmark` não cria um novo loop: ele se pluga no mesmo `engine.add` (gsap.ticker)
 * e lê `engine.fps.ms`, que já existe. Os 2 ou 3 primeiros frames são descartados (`warmupFrames`)
 * porque tendem a ter o pico de JIT/decode e distorceriam a média.
 */

/** Tetos de partículas por tier, na mesma escala 0..1500 de SNOW_MAX (snowSim.js). */
export const STORM_TIERS = {
  high: { cap: 1500, snowIntensity: 1 },
  medium: { cap: 1050, snowIntensity: 0.7 },
  low: { cap: 600, snowIntensity: 0.4 },
}

/**
 * Limiares em ms/frame (não em FPS): ms é aditivo e mais fácil de somar orçamento do que FPS,
 * que é uma razão. 16,6 ms ≈ 60 fps, 22 ms ≈ 45 fps (piso de FPS da intro do brief).
 *   ms ≤ 15   -> high  (sobra folga para a tempestade cheia)
 *   ms ≤ 21   -> medium
 *   ms > 21   -> low
 */
export function pickStormTier(avgFrameMs) {
  if (!Number.isFinite(avgFrameMs)) return 'medium' // amostra inválida: não aposta no extremo
  if (avgFrameMs <= 15) return 'high'
  if (avgFrameMs <= 21) return 'medium'
  return 'low'
}

/**
 * Mede `engine.fps.ms` (EMA já suavizada pelo motor) por `sampleMs` depois de descartar
 * `warmupFrames`. Resolve com { tier, avgFrameMs, frames }. Nunca lança: se a página ficar
 * oculta no meio da medição, resolve com o que tiver, marcando `tier: 'medium'` (neutro).
 */
export function runIntroBenchmark(engine, { sampleMs = 400, warmupFrames = 3 } = {}) {
  return new Promise((resolve) => {
    let n = 0
    let sum = 0
    let elapsed = 0
    let settled = false
    const finish = (tier, avgFrameMs) => {
      if (settled) return
      settled = true
      off()
      resolve({ tier, avgFrameMs, frames: n })
    }
    const off = engine.add((e) => {
      n++
      if (n <= warmupFrames) return
      sum += e.fps.ms
      elapsed += e.dt * 1000
      if (elapsed >= sampleMs) {
        const avg = sum / (n - warmupFrames)
        finish(pickStormTier(avg), avg)
      }
    }, 'introBenchmark')
    // Guarda de segurança: se o motor nunca acumular amostra suficiente (aba oculta logo no
    // início, por exemplo), não trava a intro para sempre.
    setTimeout(() => finish('medium', NaN), sampleMs * 4 + 500)
  })
}
