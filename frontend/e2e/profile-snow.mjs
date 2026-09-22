// Perfil por fase da nevasca (update / desenho redondo / traço frontal / lotes de stroke).
// Uso: node e2e/profile-snow.mjs [baseUrl]
// Objetivo: achar o gargalo real no WebKit por medição, não por suspeita (ver Bigfoot review).
import { chromium, webkit } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5199'

async function sample(browser, query, viewport = { width: 1920, height: 1080 }) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  await page.addStyleTag({ content: '.lv-hud{display:none!important}' }).catch(() => {})
  await page.goto(`${BASE}/?debug=1&q=2&seed=7&off=drips&${query}`)
  await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
  await page.addStyleTag({ content: '.lv-hud{display:none!important}' })
  await page.waitForTimeout(3500)
  // média de 20 frames de prof (o layerMs do HUD já é média móvel; aqui pegamos amostras cruas)
  const r = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const e = window.__scene
        const acc = { clear: 0, update: 0, round: 0, front: 0, batch: 0, total: 0, active: 0, storm: 0 }
        let n = 0
        const off = e.add((ev) => {
          if (!ev.snow.prof) return
          acc.clear += ev.snow.prof.clear
          acc.update += ev.snow.prof.update
          acc.round += ev.snow.prof.round
          acc.front += ev.snow.prof.front
          acc.batch += ev.snow.prof.batch
          acc.total += ev.snow.prof.total
          acc.active = ev.snow.active
          acc.storm = ev.snow.storm
          n++
          if (n >= 30) {
            off()
            resolve({
              n,
              avg: { clear: acc.clear / n, update: acc.update / n, round: acc.round / n, front: acc.front / n, batch: acc.batch / n, total: acc.total / n },
              active: acc.active,
              storm: acc.storm,
            })
          }
        })
      }),
  )
  await ctx.close()
  return r
}

for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch()
  console.log(`\n===== ${name} =====`)
  for (const [label, q] of [['calmo', 'snow=0.2'], ['tempestade', 'snow=1&storm=1']]) {
    const r = await sample(browser, q)
    const sum = r.avg.clear + r.avg.update + r.avg.round + r.avg.front + r.avg.batch
    console.log(
      `${label.padEnd(10)} ativos=${r.active} traço=${r.storm.toFixed(2)}  ` +
        `clear=${r.avg.clear.toFixed(3)}ms update=${r.avg.update.toFixed(3)}ms round=${r.avg.round.toFixed(3)}ms front=${r.avg.front.toFixed(3)}ms batch=${r.avg.batch.toFixed(3)}ms  soma=${sum.toFixed(3)}ms  total(fn)=${r.avg.total.toFixed(3)}ms`,
    )
  }
  await browser.close()
}
