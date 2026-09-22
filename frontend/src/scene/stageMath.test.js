import test from 'node:test'
import assert from 'node:assert/strict'
import { computeCover, computeUiRegionPx } from './stageMath.js'
import { SCENE } from './sceneMap.js'

test('computeCover: a caixa de foco nunca é cortada, em telas muito estreitas', () => {
  const g = computeCover(390, 844)
  const fx0 = (SCENE.focus.x0 / 100) * g.w + g.x
  const fx1 = (SCENE.focus.x1 / 100) * g.w + g.x
  assert.ok(fx0 >= -1 && fx1 <= 390 + 1, `foco fora da viewport: [${fx0}, ${fx1}]`)
})

test('computeCover: cobre a viewport inteira em qualquer proporção', () => {
  for (const [vw, vh] of [[390, 844], [1920, 1080], [2560, 1080], [768, 1024]]) {
    const g = computeCover(vw, vh)
    assert.ok(g.w >= vw && g.h >= vh, `${vw}x${vh}: stage ${g.w}x${g.h} não cobre`)
  }
})

const uiRegion = { xMin: 63, xMax: 100 }

test('computeUiRegionPx: desktop típico, região mapeada cabe dentro da viewport', () => {
  const stage = computeCover(1920, 1080)
  const r = computeUiRegionPx(stage, 1920, uiRegion)
  assert.ok(r.left >= 0 && r.left + r.width <= 1920)
  assert.ok(r.width > 0)
})

test('computeUiRegionPx: nunca sai da viewport, mesmo com crop extremo (retrato estreito)', () => {
  const stage = computeCover(390, 844)
  const r = computeUiRegionPx(stage, 390, uiRegion)
  assert.ok(r.left >= 0, `left negativo: ${r.left}`)
  assert.ok(r.left + r.width <= 390 + 0.01, `passou da viewport: ${r.left + r.width}`)
})

test('computeUiRegionPx: garante largura mínima (fallback ancorado na direita) quando o mapeamento colapsa', () => {
  // stage bem maior que a viewport e deslocado bem pra esquerda -> uiRegion mapeada quase toda
  // fora da tela à direita, região útil ficaria espremida sem o fallback
  const stage = { x: -3000, y: 0, w: 4000, h: 2000, scale: 2 }
  const r = computeUiRegionPx(stage, 1920, uiRegion, 0.32)
  assert.ok(r.width >= 1920 * 0.32 - 0.01, `largura abaixo do mínimo: ${r.width}`)
  assert.ok(r.left + r.width <= 1920 + 0.01)
})

test('computeUiRegionPx: região nunca é maior que a própria viewport', () => {
  for (const [vw, vh] of [[390, 844], [768, 1024], [1366, 768], [1920, 1080], [2560, 1080]]) {
    const stage = computeCover(vw, vh)
    const r = computeUiRegionPx(stage, vw, uiRegion)
    assert.ok(r.width <= vw + 0.01, `${vw}x${vh}: largura ${r.width} > viewport`)
    assert.ok(r.left >= -0.01 && r.left <= vw + 0.01)
  }
})

test('computeUiRegionPx: xMin maior gera região mais estreita (variante pastel, 50-100, é mais larga que caverna, 63-100)', () => {
  const stage = computeCover(1920, 1080)
  const caverna = computeUiRegionPx(stage, 1920, { xMin: 63, xMax: 100 })
  const pastel = computeUiRegionPx(stage, 1920, { xMin: 50, xMax: 100 })
  assert.ok(pastel.width >= caverna.width, `pastel (${pastel.width}) deveria ser >= caverna (${caverna.width})`)
})
