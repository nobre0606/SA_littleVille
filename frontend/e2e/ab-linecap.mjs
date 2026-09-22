// A/B lineCap 'round' vs 'butt' na tempestade. Uso: node e2e/ab-linecap.mjs [baseUrl]
// Força vento alto (wind.intensity) para garantir modo "traço" estável durante toda a amostra,
// eliminando o ruído de rajada que fazia `storm` variar entre execuções.
import { chromium, webkit } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5199'

async function sample(browser, viewport = { width: 1920, height: 1080 }) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/?debug=1&q=2&seed=7&off=drips&snow=1&storm=1`)
  await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
  await page.addStyleTag({ content: '.lv-hud{display:none!important}' })
  await page.evaluate(() => window.__scene.setWindIntensity(4)) // garante storm=1 sustentado
  await page.waitForTimeout(3500)
  const r = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const e = window.__scene
        const acc = { total: 0, storm: 0, active: 0 }
        let n = 0
        const off = e.add((ev) => {
          if (!ev.snow.prof) return
          acc.total += ev.snow.prof.total
          acc.storm += ev.snow.storm
          acc.active = ev.snow.active
          n++
          if (n >= 40) {
            off()
            resolve({ n, avgTotal: acc.total / n, avgStorm: acc.storm / n, active: acc.active })
          }
        })
      }),
  )
  const img = await page.screenshot({ clip: { x: 100, y: 60, width: 700, height: 500 } })
  await ctx.close()
  return { ...r, img }
}

const cap = process.argv[3] ?? '?'
for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch()
  const r = await sample(browser)
  console.log(`${name.padEnd(10)} lineCap=${cap}  n=${r.n}  storm(médio)=${r.avgStorm.toFixed(2)}  ativos=${r.active}  prof.total(médio)=${r.avgTotal.toFixed(3)}ms`)
  const fs = await import('node:fs')
  fs.writeFileSync(new URL(`./out/linecap-${cap}-${name}.png`, import.meta.url), r.img)
  await browser.close()
}
