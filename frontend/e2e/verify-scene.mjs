// Verificação da Fase 1. Uso: node e2e/verify-scene.mjs [baseUrl]
// Gera capturas em e2e/out/ e imprime: visibilidade da caixa de foco, loops/rAF, FPS, reduced-motion.
import { chromium, webkit } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
mkdirSync(OUT, { recursive: true })

const SIZES = [
  { w: 390, h: 844, dpr: 2 },
  { w: 768, h: 1024, dpr: 1 },
  { w: 1366, h: 768, dpr: 1 },
  { w: 1920, h: 1080, dpr: 1 },
  { w: 2560, h: 1080, dpr: 1 },
]
const FOCUS = { x0: 9, y0: 55, x1: 25, y1: 81 } // mesma de sceneMap.focus
const PORTRAIT_BOX = 0.58

const report = []
const log = (...a) => {
  const s = a.join(' ')
  report.push(s)
  console.log(s)
}

async function focusVisible(page, size) {
  return page.evaluate(
    ({ FOCUS, size, PORTRAIT_BOX }) => {
      const r = document.querySelector('[data-testid="scene-stage"]').getBoundingClientRect()
      const boxH = size.h > size.w ? size.h * PORTRAIT_BOX : size.h
      const px = (x, y) => [r.left + (x / 100) * r.width, r.top + (y / 100) * r.height]
      const [a, b] = px(FOCUS.x0, FOCUS.y0)
      const [c, d] = px(FOCUS.x1, FOCUS.y1)
      return { ok: a >= 0 && b >= 0 && c <= size.w && d <= boxH, a, b, c, d, boxH, stage: [r.left, r.top, r.width, r.height].map(Math.round) }
    },
    { FOCUS, size, PORTRAIT_BOX },
  )
}

for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch()
  log(`\n===== ${name} =====`)

  for (const s of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(`${BASE}/?debug=1&q=2&seed=7`)
    await page.waitForSelector('[data-testid="scene-stage"]')
    await page.waitForTimeout(2500)
    const f = await focusVisible(page, s)
    log(`${s.w}x${s.h}: foco visivel=${f.ok} stage=${f.stage} foco px=[${[f.a, f.b, f.c, f.d].map(Math.round)}] caixa=${Math.round(f.boxH)}`)
    if (errors.length) log('  ERROS:', errors.join(' | '))
    await page.screenshot({ path: `${OUT}${name}-${s.w}x${s.h}-debug.png` })
    // captura limpa (sem marcadores)
    await page.goto(`${BASE}/?q=2&seed=7`)
    await page.waitForSelector('[data-testid="scene-stage"]')
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${OUT}${name}-${s.w}x${s.h}.png` })
    await ctx.close()
  }

  // --- loop único / sem duplicação (dev + StrictMode) ---------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await ctx.newPage()
    await page.addInitScript(() => {
      window.__raf = 0
      const o = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (cb) => (window.__raf++, o(cb))
    })
    await page.goto(`${BASE}/?debug=1&q=2&seed=7`)
    await page.waitForFunction(() => window.__scene)
    await page.waitForTimeout(1500)
    const r = await page.evaluate(async () => {
      const e = window.__scene
      const t0 = e.time
      const r0 = window.__raf
      await new Promise((res) => setTimeout(res, 3000))
      const dt = e.time - t0
      return {
        subscribers: e.subscriberCount(),
        rafPerSec: (window.__raf - r0) / dt,
        fps: e.fps.avg,
        msFrame: e.fps.ms,
        quality: e.quality,
        canvases: document.querySelectorAll('canvas').length,
      }
    })
    log(`loop unico: assinantes=${r.subscribers} rAF/s=${r.rafPerSec.toFixed(1)} (fps medio ${r.fps.toFixed(1)}) => razao ${(r.rafPerSec / r.fps).toFixed(2)}`)
    log(`FPS (q=high, 1366x768, headless): ${r.fps.toFixed(1)} fps, ${r.msFrame.toFixed(1)} ms/frame, canvases=${r.canvases}`)
    // pausa com aba oculta: o motor nao deve avancar
    const hid = await page.evaluate(async () => {
      const e = window.__scene
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((res) => setTimeout(res, 300))
      const t0 = e.time
      await new Promise((res) => setTimeout(res, 1000))
      const advanced = e.time - t0
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((res) => setTimeout(res, 500))
      return { advancedWhileHidden: advanced, resumed: e.time > t0 + 0.05 }
    })
    log(`aba oculta: tempo do motor avancou ${hid.advancedWhileHidden.toFixed(3)} s enquanto oculta; retomou=${hid.resumed}`)
    await ctx.close()
  }

  // --- qualidade adaptativa desliga o filtro do pelo ---------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/?debug=1&q=1&seed=7`)
    await page.waitForFunction(() => window.__scene)
    await page.waitForTimeout(600)
    const filterMed = await page.evaluate(() => document.querySelector('.lv-bigfoot-copy').style.filter)
    await page.evaluate(() => window.__scene.setQualityMode(2))
    await page.waitForTimeout(400)
    const filterHigh = await page.evaluate(() => document.querySelector('.lv-bigfoot-copy').style.filter)
    log(`filtro do pelo: q=medium -> "${filterMed}", q=high -> "${filterHigh}"`)
    await ctx.close()
  }

  // --- prefers-reduced-motion ---------------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/?debug=1&q=2&seed=7`)
    await page.waitForFunction(() => window.__scene)
    await page.waitForTimeout(1500)
    const r = await page.evaluate(() => ({
      reduced: window.__scene.reduced,
      flicker: window.__scene.fire.flicker,
      furFilter: document.querySelector('.lv-bigfoot-copy').style.filter,
    }))
    log(`reduced-motion: reduced=${r.reduced} flicker=${r.flicker.toFixed(2)} filtro="${r.furFilter}"`)
    await page.screenshot({ path: `${OUT}${name}-reduced.png` })
    await ctx.close()
  }

  await browser.close()
}
