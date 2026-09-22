// Verificação da Fase 3 (intro). Uso: node e2e/verify-intro.mjs [baseUrl]
import { chromium, webkit } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'http://localhost:5199'
const OUT = fileURLToPath(new URL('./out/', import.meta.url))
mkdirSync(OUT, { recursive: true })

async function open(browser, query, viewport = { width: 1366, height: 768 }, ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport, ...ctxOpts })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${BASE}/?${query}`)
  await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
  return { ctx, page, errors }
}

for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch()
  console.log(`\n===== ${name} =====`)

  // 1. a intro toca na primeira visita e marca o sessionStorage ao terminar (skip)
  {
    const { ctx, page, errors } = await open(browser, 'debug=1&seed=7')
    const hasOverlay = await page.locator('[data-testid="intro-overlay"]').count()
    const seenBefore = await page.evaluate(() => sessionStorage.getItem('lv-intro-seen'))
    await page.getByTestId('intro-skip').click()
    await page.waitForTimeout(300)
    const seenAfter = await page.evaluate(() => sessionStorage.getItem('lv-intro-seen'))
    const overlayGone = (await page.locator('[data-testid="intro-overlay"]').count()) === 0
    console.log(`primeira visita: overlay presente=${!!hasOverlay} seen antes=${seenBefore} depois do skip=${seenAfter} overlay sumiu=${overlayGone}`)
    if (errors.length) console.log('  ERROS:', errors.join('|'))
    await ctx.close()
  }

  // 2. recarregando a MESMA aba (sessionStorage sobrevive a reload, ao contrário de newPage()
  // no mesmo contexto — newPage() cria um browsing context novo, sem sessionStorage herdado,
  // então testar com duas abas testaria o comportamento errado)
  {
    const { ctx, page } = await open(browser, 'debug=1&seed=7')
    await page.getByTestId('intro-skip').click()
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
    await page.waitForTimeout(300)
    const overlayOnReload = await page.locator('[data-testid="intro-overlay"]').count()
    console.log(`reload na mesma aba/sessão: overlay presente=${!!overlayOnReload} (esperado 0)`)
    await ctx.close()
  }

  // 3. Esc pula a intro
  {
    const { ctx, page, errors } = await open(browser, 'debug=1&seed=8')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const overlayGone = (await page.locator('[data-testid="intro-overlay"]').count()) === 0
    console.log(`Esc pula: overlay sumiu=${overlayGone}`, errors.length ? 'ERROS:' + errors.join('|') : '')
    await ctx.close()
  }

  // 4. clique em qualquer lugar pula
  {
    const { ctx, page } = await open(browser, 'debug=1&seed=9')
    await page.waitForTimeout(500)
    await page.mouse.click(200, 200)
    await page.waitForTimeout(300)
    const overlayGone = (await page.locator('[data-testid="intro-overlay"]').count()) === 0
    console.log(`clique em qualquer lugar pula: overlay sumiu=${overlayGone}`)
    await ctx.close()
  }

  // 5. reduced-motion: sem intro cinematográfica, só fade rápido; snow/flicker reduzidos
  {
    const { ctx, page, errors } = await open(browser, 'debug=1&seed=10', undefined, { reducedMotion: 'reduce' })
    await page.waitForTimeout(700)
    const hasLogo = await page.locator('.lv-intro-logo').count()
    const overlayGone = (await page.locator('[data-testid="intro-overlay"]').count()) === 0
    const r = await page.evaluate(() => ({ reduced: window.__scene.reduced, flicker: window.__scene.fire.flicker }))
    console.log(`reduced-motion: logo cinematográfica apareceu=${!!hasLogo} (esperado false) overlay sumiu em ~0.7s=${overlayGone} reduced=${r.reduced} flicker=${r.flicker}`)
    if (errors.length) console.log('  ERROS:', errors.join('|'))
    await ctx.close()
  }

  // 6. loop único durante a intro inteira (sem rAF extra) + timeline real até o fim
  if (name === 'chromium') {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await ctx.newPage()
    await page.addInitScript(() => {
      window.__raf = 0
      const o = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (cb) => (window.__raf++, o(cb))
    })
    await page.goto(`${BASE}/?debug=1&seed=7`)
    await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
    const t0 = Date.now()
    const r0 = await page.evaluate(() => window.__raf)
    await page.waitForFunction(() => document.querySelector('[data-testid="intro-overlay"]') === null, { timeout: 12000 })
    const dtS = (Date.now() - t0) / 1000
    const r1 = await page.evaluate(() => window.__raf)
    const fps = await page.evaluate(() => window.__scene.fps.avg)
    console.log(`intro completa rodou até o fim em ${dtS.toFixed(2)}s (esperado ~8s), rAF/s=${(( r1 - r0) / dtS).toFixed(1)} vs fps média=${fps.toFixed(1)}`)
    const seen = await page.evaluate(() => sessionStorage.getItem('lv-intro-seen'))
    console.log(`sessionStorage após terminar sozinha: ${seen}`)
    await ctx.close()
  }

  // 7. StrictMode: sem assinantes duplicados nem timeline dupla
  {
    const { ctx, page } = await open(browser, 'debug=1&seed=7')
    await page.waitForTimeout(600)
    const subs = await page.evaluate(() => window.__scene.subscriberCount())
    console.log(`assinantes durante a intro: ${subs} (9 da cena + hud + introDissolve = 11)`)
    await ctx.close()
  }

  await browser.close()
}
