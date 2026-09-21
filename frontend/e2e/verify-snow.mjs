// Verificação da Fase 2 (nevasca). Uso: node e2e/verify-snow.mjs [baseUrl]
// FPS em headless é por SOFTWARE: serve só de comparação relativa (com/sem neve), não valida a meta.
import { chromium, webkit } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'http://localhost:5199'
const OUT = fileURLToPath(new URL('./out/', import.meta.url))
mkdirSync(OUT, { recursive: true })

async function open(browser, query, viewport = { width: 1920, height: 1080 }, ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport, ...ctxOpts })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.addInitScript(() => {
    window.__raf = 0
    const o = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (cb) => (window.__raf++, o(cb))
  })
  await page.goto(`${BASE}/?${query}`)
  await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
  return { ctx, page, errors }
}

// Lê o canvas da neve e classifica os pixels: branco puro, cinza (baixa saturação) e quentes.
const paletteProbe = () => {
  const c = document.querySelector('canvas[data-layer="snow"]')
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let n = 0, white = 0, gray = 0, warm = 0, cyan = 0, maxR = 0
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]
    if (a < 40) continue // ignora bordas quase transparentes (RGB impreciso)
    n++
    const r = d[i], g = d[i + 1], b = d[i + 2]
    if (r === 255 && g === 255 && b === 255) white++
    if (Math.abs(r - g) < 6 && Math.abs(g - b) < 6) gray++
    if (r > 200 && r - b > 60) warm++
    if (b > r + 15) cyan++
    if (r > maxR) maxR = r
  }
  return { n, white, gray, warm, cyan, maxR }
}

for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch()
  console.log(`\n===== ${name} =====`)

  // 1. calmo e tempestade: contagem, traço vs redondo, paleta, custo de JS
  for (const [label, q] of [['calmo', 'snow=0.2'], ['tempestade', 'snow=1&storm=1']]) {
    const { ctx, page, errors } = await open(browser, `debug=1&q=2&seed=7&${q}&off=drips`)
    await page.addStyleTag({ content: '.lv-hud{display:none!important}' })
    await page.waitForTimeout(3500)
    const r = await page.evaluate(() => {
      const e = window.__scene
      return { active: e.snow.active, storm: e.snow.storm, wind: e.wind.strength, snowMs: e.layerMs.snow, tickMs: e.jsMs, fps: e.fps.avg }
    })
    const p = await page.evaluate(paletteProbe)
    console.log(`${label.padEnd(10)} ativos=${r.active} traço=${r.storm.toFixed(2)} vento=${r.wind.toFixed(2)} | JS neve=${r.snowMs.toFixed(2)} ms, tick=${r.tickMs.toFixed(2)} ms, fps(soft)=${r.fps.toFixed(0)}`)
    console.log(`           paleta: px=${p.n} branco puro=${p.white} cinza=${p.gray} (${((100 * p.gray) / p.n).toFixed(2)}%) quentes=${p.warm} ciano/azulados=${p.cyan}`)
    if (errors.length) console.log('  ERROS:', errors.join('|'))
    await page.screenshot({ path: `${OUT}snow-${name}-${label}.png` })
    if (name === 'chromium') {
      await page.screenshot({ path: `${OUT}snow-${name}-${label}-fogo.png`, clip: { x: 100, y: 560, width: 620, height: 380 } })
      await page.screenshot({ path: `${OUT}snow-${name}-${label}-direita.png`, clip: { x: 1100, y: 300, width: 700, height: 420 } })
    }
    await ctx.close()
  }

  // 2. quantidade por nível de qualidade (intensidade máxima)
  {
    const out = []
    for (const q of [2, 1, 0]) {
      const { ctx, page } = await open(browser, `debug=1&q=${q}&seed=7&snow=1`)
      await page.waitForTimeout(800)
      out.push(`q=${q}: ${await page.evaluate(() => window.__scene.snow.active)}`)
      await ctx.close()
    }
    console.log('flocos por qualidade (intensidade 1):', out.join(' | '), '(esperado 1500 / 1050 / 600)')
  }

  // 3. reduced-motion
  {
    const { ctx, page } = await open(browser, 'debug=1&q=2&seed=7&snow=1&storm=1', { width: 1366, height: 768 }, { reducedMotion: 'reduce' })
    await page.waitForTimeout(1200)
    const r = await page.evaluate(() => ({ active: window.__scene.snow.active, storm: window.__scene.snow.storm, reduced: window.__scene.reduced }))
    console.log(`reduced-motion: reduced=${r.reduced} ativos=${r.active} traço=${r.storm}`)
    await ctx.close()
  }

  // 4. loop único, sem duplicação (StrictMode), e camada desligável
  {
    const { ctx, page } = await open(browser, 'debug=1&q=2&seed=7&snow=0.6', { width: 1366, height: 768 })
    await page.waitForTimeout(1500)
    const r = await page.evaluate(async () => {
      const e = window.__scene
      const t0 = e.time, r0 = window.__raf
      await new Promise((res) => setTimeout(res, 2500))
      const dt = e.time - t0
      const canv = document.querySelectorAll('canvas[data-layer="snow"]').length
      e.setLayer('snow', false)
      await new Promise((res) => setTimeout(res, 300))
      const hidden = getComputedStyle(document.querySelector('canvas[data-layer="snow"]')).display === 'none'
      const stopped = e.layerMs.snow
      return { subs: e.subscriberCount(), ratio: (window.__raf - r0) / dt / e.fps.avg, canv, hidden, stopped }
    })
    console.log(`loop: assinantes=${r.subs} (esperado 7) canvases de neve=${r.canv} rAF/fps=${r.ratio.toFixed(2)} desliga=${r.hidden}`)
    await ctx.close()
  }

  // 5. custo relativo: com e sem neve (mesma sessão, headless software)
  if (name === 'chromium') {
    for (const [label, q] of [['sem neve', '&off=snow'], ['calmo 0.2', '&snow=0.2'], ['intro 1.0', '&snow=1&storm=1']]) {
      const { ctx, page } = await open(browser, `debug=1&q=2&seed=7${q}`)
      await page.waitForTimeout(4500)
      const f = await page.evaluate(() => ({ fps: window.__scene.fps.avg, ms: window.__scene.layerMs.snow ?? 0 }))
      console.log(`fps ${label.padEnd(10)} ${f.fps.toFixed(1)}  (JS neve ${f.ms.toFixed(2)} ms)`)
      await ctx.close()
    }
  }

  // 6. retrato
  if (name === 'chromium') {
    const { ctx, page } = await open(browser, 'debug=1&q=2&seed=7&snow=0.2', { width: 390, height: 844 }, { deviceScaleFactor: 2 })
    await page.addStyleTag({ content: '.lv-hud,[data-layer="debug"]{display:none!important}' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${OUT}snow-${name}-390x844.png` })
    await ctx.close()
  }
  await browser.close()
}
