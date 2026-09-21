// Diagnóstico da Fase 1 (pendências). Uso: node e2e/diagnose.mjs [baseUrl] [etapas: toggles,matrix,seam,video]
// ATENÇÃO: o Chromium headless rasteriza por SOFTWARE (sem GPU). Os FPS absolutos NÃO representam
// um notebook real; a matriz serve para comparar camadas entre si, não para validar a meta.
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'http://localhost:5199'
const STEPS = (process.argv[3] ?? 'toggles,matrix,seam,video').split(',')
const OUT = fileURLToPath(new URL('./out/', import.meta.url))
mkdirSync(OUT, { recursive: true })

const KEYS = ['background', 'rays', 'portal', 'glitter', 'bigfoot', 'fur', 'campfire', 'firelight', 'drips', 'fog', 'vignette']
const browser = await chromium.launch()

async function open(query, viewport = { width: 1920, height: 1080 }, ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport, ...ctxOpts })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${BASE}/?${query}`)
  await page.waitForFunction(() => window.__scene && document.querySelector('[data-testid="scene-stage"]'))
  return { ctx, page, errors }
}

// ---------------------------------------------------------------- 1. toggles + ms por camada
if (STEPS.includes('toggles')) {
  console.log('\n## toggles')
  const { ctx, page, errors } = await open('debug=1&q=2&seed=7')
  await page.waitForTimeout(3500)
  const ms = await page.evaluate(() => ({ ...window.__scene.layerMs, tick: window.__scene.jsMs }))
  console.log('ms de JS por camada (média móvel, 1920x1080, software render):', JSON.stringify(ms, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v)))
  const res = []
  for (const k of KEYS) {
    const r = await page.evaluate(async (k) => {
      const e = window.__scene
      const sel = k === 'fur' ? null : `[data-layer="${k}"]`
      const el = sel && document.querySelector(sel)
      e.setLayer(k, false)
      await new Promise((r) => setTimeout(r, 300))
      const hidden = k === 'fur' ? document.querySelector('.lv-bigfoot-copy').style.filter === 'none' : getComputedStyle(el).display === 'none'
      const before = e.layerMs[k]
      await new Promise((r) => setTimeout(r, 500))
      e.setLayer(k, true)
      await new Promise((r) => setTimeout(r, 300))
      const back = k === 'fur' ? document.querySelector('.lv-bigfoot-copy').style.filter.includes('lv-fur') : getComputedStyle(el).display !== 'none'
      return { k, hidden, back, dataOff: document.documentElement.dataset.off ?? '' }
    }, k)
    res.push(r)
  }
  console.log(res.map((r) => `${r.k}: desliga=${r.hidden} religa=${r.back}`).join('\n'))
  console.log('data-off ao final:', JSON.stringify(res.at(-1).dataOff), errors.length ? 'ERROS ' + errors.join('|') : 'sem erros de console')
  await page.screenshot({ path: `${OUT}hud-debug-1920x1080.png` })
  await ctx.close()
  // HUD no viewport de celular (rolagem/tamanho)
  const m = await open('debug=1&q=2&seed=7', { width: 390, height: 844 }, { deviceScaleFactor: 2, hasTouch: true, isMobile: true })
  await m.page.waitForTimeout(1500)
  await m.page.screenshot({ path: `${OUT}hud-debug-390x844.png` })
  await m.ctx.close()
}

// ---------------------------------------------------------------- 2. matriz de FPS
if (STEPS.includes('matrix')) {
  console.log('\n## matriz de FPS (1920x1080, q=high travada, headless SOFTWARE: só comparativo)')
  const configs = [['todas ligadas', ''], ...KEYS.map((k) => [`sem ${k}`, `&off=${k}`]), ['só fundo', `&off=${KEYS.filter((k) => k !== 'background').join(',')}`]]
  for (const [label, q] of configs) {
    const { ctx, page } = await open(`debug=1&q=2&seed=7${q}`)
    await page.waitForTimeout(4000)
    const f = await page.evaluate(() => ({ fps: window.__scene.fps.avg, ms: window.__scene.fps.ms }))
    console.log(`${label.padEnd(16)} ${f.fps.toFixed(1)} fps  ${f.ms.toFixed(1)} ms/frame`)
    await ctx.close()
  }
}

// ---------------------------------------------------------------- 3. emenda da máscara em 1.015
if (STEPS.includes('seam')) {
  console.log('\n## emenda da máscara (respiração)')
  const others = 'rays,portal,glitter,campfire,firelight,drips,fog,vignette,fur'
  const clip = { x: 100, y: 540, width: 400, height: 380 } // região do pé grande + folga
  const shoot = async (extra) => {
    const { ctx, page } = await open(`debug=1&q=1&seed=7&off=${others}${extra}`)
    await page.addStyleTag({ content: '.lv-bigfoot-warm{display:none!important} .lv-hud{display:none!important} [data-layer="debug"]{display:none!important}' })
    await page.waitForTimeout(500)
    return { ctx, page }
  }
  // A: só a imagem original (camada do pé grande desligada)
  let s = await shoot(',bigfoot')
  const A = await s.page.screenshot({ clip })
  await s.ctx.close()
  // B: cópia ligada com scaleY = 1.000 (prova de alinhamento pixel a pixel)
  s = await shoot('&breath=1.000,4')
  const B = await s.page.screenshot({ clip })
  await s.ctx.close()
  // C: scaleY 1.015, capturado no pico
  s = await shoot('&breath=1.015,4')
  await s.page.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('.lv-bigfoot')).transform).d >= 1.0146, null, { timeout: 8000, polling: 20 })
  const C = await s.page.screenshot({ clip })
  const dC = await s.page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.lv-bigfoot')).transform).d)
  await s.ctx.close()

  const cmp = await browser.newPage()
  const region = { left: 144 - clip.x, top: Math.round(0.53 * 1081) - clip.y, w: Math.round(0.155 * 1920), h: Math.round(0.295 * 1081) }
  const stats = await cmp.evaluate(
    async ({ A, B, C, reg }) => {
      const load = (b64) =>
        new Promise((res) => {
          const i = new Image()
          i.onload = () => res(i)
          i.src = 'data:image/png;base64,' + b64
        })
      const px = async (b64) => {
        const i = await load(b64)
        const c = document.createElement('canvas')
        c.width = i.width
        c.height = i.height
        const x = c.getContext('2d')
        x.drawImage(i, 0, 0)
        return { d: x.getImageData(0, 0, i.width, i.height), w: i.width, h: i.height }
      }
      const a = await px(A)
      const diff = async (o, amp) => {
        let max = 0, n8 = 0, n24 = 0, sum = 0
        const out = document.createElement('canvas')
        out.width = a.w
        out.height = a.h
        const ox = out.getContext('2d')
        const od = ox.createImageData(a.w, a.h)
        for (let i = 0; i < a.d.data.length; i += 4) {
          const m = Math.max(Math.abs(a.d.data[i] - o.d.data[i]), Math.abs(a.d.data[i + 1] - o.d.data[i + 1]), Math.abs(a.d.data[i + 2] - o.d.data[i + 2]))
          if (m > max) max = m
          if (m > 8) n8++
          if (m > 24) n24++
          sum += m
          const v = Math.min(255, m * amp)
          od.data[i] = od.data[i + 1] = od.data[i + 2] = v
          od.data[i + 3] = 255
        }
        ox.putImageData(od, 0, 0)
        return { max, n8, n24, mean: sum / (a.w * a.h), png: out.toDataURL('image/png').split(',')[1] }
      }
      const b = await diff(await px(B), 16)
      const cpx = await px(C)
      const c = await diff(cpx, 8)
      // por anel da máscara elíptica (r = distância normalizada ao centro da região)
      const R = { cx: reg.left + reg.w / 2, cy: reg.top + reg.h / 2, hw: reg.w / 2, hh: reg.h / 2 }
      const bins = [[0, 0.6], [0.6, 0.8], [0.8, 1.0], [1.0, 9]].map(([lo, hi]) => ({ lo, hi, n: 0, sum: 0, n24: 0 }))
      for (let y = 0; y < a.h; y++)
        for (let x = 0; x < a.w; x++) {
          const r = Math.hypot((x - R.cx) / R.hw, (y - R.cy) / R.hh)
          const i = (y * a.w + x) * 4
          const m = Math.max(Math.abs(a.d.data[i] - cpx.d.data[i]), Math.abs(a.d.data[i + 1] - cpx.d.data[i + 1]), Math.abs(a.d.data[i + 2] - cpx.d.data[i + 2]))
          const bn = bins.find((q) => r >= q.lo && r < q.hi)
          bn.n++
          bn.sum += m
          if (m > 24) bn.n24++
        }
      return { total: a.w * a.h, b, c, rings: bins.map((q) => `r ${q.lo}-${q.hi > 5 ? '∞' : q.hi}: média ${(q.sum / q.n).toFixed(2)}, px>24 ${((100 * q.n24) / q.n).toFixed(2)}%`) }
    },
    { A: A.toString('base64'), B: B.toString('base64'), C: C.toString('base64'), reg: region },
  )
  console.log(`alinhamento (cópia em 1.000 vs original): max=${stats.b.max}/255, px>8: ${stats.b.n8}/${stats.total}, média=${stats.b.mean.toFixed(4)}`)
  console.log(`respiração no pico (scaleY medido=${dC.toFixed(4)} vs original): max=${stats.c.max}/255, px>8: ${stats.c.n8} (${((100 * stats.c.n8) / stats.total).toFixed(2)}%), px>24: ${stats.c.n24}, média=${stats.c.mean.toFixed(3)}`)
  console.log('anéis da máscara (C vs original):\n  ' + stats.rings.join('\n  '))
  writeFileSync(`${OUT}seam-orig.png`, A)
  writeFileSync(`${OUT}seam-1015-peak.png`, C)
  writeFileSync(`${OUT}seam-diff-1000-x16.png`, Buffer.from(stats.b.png, 'base64'))
  writeFileSync(`${OUT}seam-diff-1015-x8.png`, Buffer.from(stats.c.png, 'base64'))
  await cmp.close()
}

// ---------------------------------------------------------------- 4. vídeo de 10 s
if (STEPS.includes('video')) {
  console.log('\n## vídeo')
  const dir = join(OUT, 'video-tmp')
  mkdirSync(dir, { recursive: true })
  const t0 = Date.now()
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir, size: { width: 1366, height: 768 } } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/?q=2&seed=7`)
  await page.waitForSelector('[data-testid="scene-stage"]')
  await page.waitForTimeout(2500) // aquecimento (decode da imagem)
  const startOffset = (Date.now() - t0) / 1000
  await page.waitForTimeout(10000)
  await ctx.close()
  const raw = readdirSync(dir).find((f) => f.endsWith('.webm'))
  const rawPath = join(dir, raw)
  const final = join(OUT, 'scene-1366x768-high-10s.webm')
  // ffmpeg do próprio Playwright (build mínimo, VP8) para cortar exatamente 10 s
  const home = process.env.LOCALAPPDATA + '\\ms-playwright'
  const ff = readdirSync(home).find((d) => d.startsWith('ffmpeg-'))
  try {
    execFileSync(join(home, ff, 'ffmpeg-win64.exe'), ['-y', '-ss', String(startOffset), '-i', rawPath, '-t', '10', '-c:v', 'libvpx', '-b:v', '8M', '-crf', '6', '-an', final], { stdio: 'ignore' })
    console.log('vídeo cortado em 10 s:', final)
  } catch {
    renameSync(rawPath, final)
    console.log('ffmpeg indisponível para cortar; vídeo bruto (~12 s):', final)
  }
}

await browser.close()
