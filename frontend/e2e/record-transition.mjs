// Vídeo de 10 s: calmo -> tempestade -> calmo (1366x768, qualidade alta). Como a timeline real
// da intro só existe na Fase 3, a transição é conduzida aqui via engine.setSnow/setWindIntensity.
// Uso: node e2e/record-transition.mjs [baseUrl]
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, renameSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'http://localhost:5199'
const OUT = fileURLToPath(new URL('./out/', import.meta.url))
const dir = join(OUT, 'video-transition-tmp')
mkdirSync(dir, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  recordVideo: { dir, size: { width: 1366, height: 768 } },
})
const page = await ctx.newPage()
const t0 = Date.now()
await page.goto(`${BASE}/?debug=1&q=2&seed=7`)
await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
await page.addStyleTag({ content: '.lv-hud,[data-layer="debug"]{display:none!important}' })
await page.waitForTimeout(2000) // aquecimento (decode da imagem), fora da janela gravada
const startOffset = (Date.now() - t0) / 1000

// calmo (0-2s) -> rampa para tempestade (2-3.5s) -> tempestade sustentada (3.5-6.5s)
// -> rampa de volta ao calmo (6.5-8s) -> calmo (8-10s)
const ramp = async (fromI, toI, fromW, toW, ms, steps = 20) => {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    await page.evaluate(
      ([intensity, wind]) => {
        window.__scene.setSnow({ intensity })
        window.__scene.setWindIntensity(wind)
      },
      [fromI + (toI - fromI) * t, fromW + (toW - fromW) * t],
    )
    await page.waitForTimeout(ms / steps)
  }
}

await page.waitForTimeout(2000) // calmo
await ramp(0.2, 1, 1, 1.6, 1500) // rampa para tempestade
await page.waitForTimeout(3000) // tempestade sustentada
await ramp(1, 0.2, 1.6, 1, 1500) // rampa de volta ao calmo
await page.waitForTimeout(2000) // calmo

await ctx.close()
const raw = readdirSync(dir).find((f) => f.endsWith('.webm'))
const rawPath = join(dir, raw)
const final = join(OUT, 'scene-1366x768-calmo-tempestade-calmo-10s.webm')
const home = process.env.LOCALAPPDATA + '\\ms-playwright'
const ff = readdirSync(home).find((d) => d.startsWith('ffmpeg-'))
try {
  execFileSync(join(home, ff, 'ffmpeg-win64.exe'), ['-y', '-ss', String(startOffset), '-i', rawPath, '-t', '10', '-c:v', 'libvpx', '-b:v', '8M', '-crf', '6', '-an', final], { stdio: 'ignore' })
  console.log('vídeo cortado em 10 s:', final)
} catch {
  renameSync(rawPath, final)
  console.log('ffmpeg indisponível; vídeo bruto (~11-12 s):', final)
}
await browser.close()
