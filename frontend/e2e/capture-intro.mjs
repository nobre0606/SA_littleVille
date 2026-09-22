// Capturas e vídeo da intro real (Fase 3). Uso: node e2e/capture-intro.mjs [baseUrl]
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, renameSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'http://localhost:5199'
const OUT = fileURLToPath(new URL('./out/', import.meta.url))
mkdirSync(OUT, { recursive: true })

const BEATS = [
  [0.3, 'a-escuro'],
  [1.5, 'b-whiteout'],
  [3.5, 'c-logo'],
  [4.6, 'd-dissolve'],
  [6.5, 'e-caverna-surgindo'],
  [7.5, 'f-slot-card'],
  [8.3, 'g-final'],
]

async function shootBeats(browser, viewport, label) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const t0 = Date.now()
  await page.goto(`${BASE}/?debug=1&seed=7`)
  await page.waitForFunction(() => window.__scene && window.__scene.stage.w > 0)
  for (const [t, name] of BEATS) {
    const wait = t * 1000 - (Date.now() - t0)
    if (wait > 0) await page.waitForTimeout(wait)
    await page.screenshot({ path: `${OUT}intro-${label}-${name}.png` })
  }
  console.log(`${label}: erros de console =`, errors.length ? errors.join('|') : 'nenhum')
  await ctx.close()
}

const browser = await chromium.launch()
await shootBeats(browser, { width: 1366, height: 768 }, '1366x768')
await shootBeats(browser, { width: 390, height: 844, deviceScaleFactor: 2 }, '390x844')

// --- vídeos da intro real completa, 1366x768 e 390x844 ------------------------------------
async function recordIntro(viewport, label) {
  const dir = join(OUT, `video-intro-${label}-tmp`)
  mkdirSync(dir, { recursive: true })
  const ctx = await browser.newContext({ viewport, recordVideo: { dir, size: viewport } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/?seed=7`)
  await page.waitForSelector('[data-testid="scene-stage"]')
  await page.waitForFunction(() => document.querySelector('[data-testid="intro-overlay"]') === null, { timeout: 15000 })
  await page.waitForTimeout(500) // meio segundo do estado final, pra confirmar que assentou
  await ctx.close()
  const raw = readdirSync(dir).find((f) => f.endsWith('.webm'))
  const rawPath = join(dir, raw)
  const final = join(OUT, `intro-real-${label}.webm`)
  const home = process.env.LOCALAPPDATA + '\\ms-playwright'
  const ff = readdirSync(home).find((d) => d.startsWith('ffmpeg-'))
  try {
    execFileSync(join(home, ff, 'ffmpeg-win64.exe'), ['-y', '-i', rawPath, '-c:v', 'libvpx', '-b:v', '8M', '-crf', '6', '-an', final], { stdio: 'ignore' })
    console.log('vídeo:', final)
  } catch {
    renameSync(rawPath, final)
    console.log('vídeo (bruto, ffmpeg indisponível):', final)
  }
}

await recordIntro({ width: 1366, height: 768 }, '1366x768')
await recordIntro({ width: 390, height: 844 }, '390x844')

await browser.close()
