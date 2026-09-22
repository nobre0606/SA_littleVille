// Verifica o error boundary da cena. Uso: node e2e/verify-error-boundary.mjs [baseUrl]
import { chromium, webkit } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'http://localhost:5199'
const OUT = fileURLToPath(new URL('./out/', import.meta.url))
mkdirSync(OUT, { recursive: true })

for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch()
  console.log(`\n===== ${name} =====`)

  // 1. sem ?crash: cena normal, sem fallback, sem erro
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${BASE}/?seed=7`)
    await page.waitForSelector('[data-testid="scene-stage"]')
    await page.waitForTimeout(500)
    const fallback = await page.locator('[data-testid="scene-fallback"]').count()
    const slot = await page.locator('[data-testid="auth-card-slot"]').count()
    console.log(`sem crash: fallback presente=${!!fallback} (esperado 0) slot presente=${!!slot} (esperado 1) erros=${errors.length}`)
    await ctx.close()
  }

  // 2. com ?crash=1: a cena cai, o fallback aparece, o slot do card CONTINUA lá
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await ctx.newPage()
    const pageErrors = [] // page.on('pageerror') só pega erros NÃO capturados — um boundary que funciona não gera nenhum
    page.on('pageerror', (e) => pageErrors.push(e.message))
    const consoleErrors = []
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    await page.goto(`${BASE}/?seed=7&crash=1`)
    await page.waitForSelector('[data-testid="scene-fallback"]', { timeout: 5000 })
    const fallback = await page.locator('[data-testid="scene-fallback"]').count()
    const slot = await page.locator('[data-testid="auth-card-slot"]').count()
    const stageGone = (await page.locator('[data-testid="scene-stage"]').count()) === 0
    console.log(`com crash: fallback presente=${!!fallback} slot presente=${!!slot} (esperado 1) stage sumiu=${stageGone}`)
    console.log(`  pageerror não capturados=${pageErrors.length} (esperado 0 — o boundary devia capturar tudo)`)
    console.log(`  console.error do boundary visto=${consoleErrors.some((t) => t.includes('SceneErrorBoundary'))} (esperado true)`)
    await page.screenshot({ path: `${OUT}error-boundary-${name}.png` })
    await ctx.close()
  }

  // 3. com ?crash=tick: erro DENTRO do loop do motor (gsap.ticker), não durante o render — o
  // caso que só o try/catch do tick() + engine.onCrash conseguem pegar
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await ctx.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    const consoleErrors = []
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    await page.goto(`${BASE}/?debug=1&seed=7&crash=tick`)
    await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
    await page.waitForSelector('[data-testid="scene-fallback"]', { timeout: 5000 })
    const fallback = await page.locator('[data-testid="scene-fallback"]').count()
    const slot = await page.locator('[data-testid="auth-card-slot"]').count()
    // o motor tem que ter realmente parado (nenhum frame novo depois da queda)
    const t0 = await page.evaluate(() => window.__scene.time)
    await page.waitForTimeout(500)
    const t1 = await page.evaluate(() => window.__scene.time)
    console.log(`com crash=tick: fallback presente=${!!fallback} slot presente=${!!slot} (esperado 1)`)
    console.log(`  motor parou: engine.time antes=${t0.toFixed(2)} depois de 0.5s=${t1.toFixed(2)} (esperado igual)`)
    console.log(`  pageerror não capturados=${pageErrors.length} (esperado 0)`)
    console.log(`  console.error do boundary visto=${consoleErrors.some((t) => t.includes('SceneErrorBoundary'))} (esperado true)`)
    await ctx.close()
  }

  await browser.close()
}
