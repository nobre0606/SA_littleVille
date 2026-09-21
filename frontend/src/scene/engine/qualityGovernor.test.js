import test from 'node:test'
import assert from 'node:assert/strict'
import { createQualityGovernor } from './qualityGovernor.js'

// Simula janelas de 0,5 s: cada chamada representa 0,5 s a `fps` médio.
function run(g, { from, seconds, fps }) {
  const changes = []
  for (let t = from; t < from + seconds; t += 0.5) {
    const d = g.feed({ sinceLoad: t + 0.5, dt: 0.5, avg: fps })
    if (d) changes.push({ at: t + 0.5, d })
  }
  return changes
}

test('ignora os primeiros 2 s após o carregamento', () => {
  const g = createQualityGovernor()
  assert.deepEqual(run(g, { from: 0, seconds: 2, fps: 20 }), [])
  assert.equal(g.level, 2)
})

test('rebaixa só depois de 3 s sustentados abaixo de 50 fps', () => {
  const g = createQualityGovernor()
  run(g, { from: 0, seconds: 2, fps: 60 })
  const ch = run(g, { from: 2, seconds: 5, fps: 40 })
  assert.deepEqual(ch, [{ at: 5, d: -1 }]) // 2 s + 3 s sustentados
  assert.equal(g.level, 1)
})

test('queda isolada abaixo de 50 zera o contador (não rebaixa)', () => {
  const g = createQualityGovernor()
  run(g, { from: 0, seconds: 2, fps: 60 })
  assert.deepEqual(run(g, { from: 2, seconds: 2.5, fps: 40 }), [])
  assert.deepEqual(run(g, { from: 4.5, seconds: 0.5, fps: 55 }), [])
  assert.deepEqual(run(g, { from: 5, seconds: 2.5, fps: 40 }), [])
  assert.equal(g.level, 2)
})

test('pausado (intro) não acumula nada e reinicia ao retomar', () => {
  const g = createQualityGovernor()
  g.setPaused(true)
  assert.deepEqual(run(g, { from: 3, seconds: 20, fps: 10 }), [])
  g.setPaused(false)
  const ch = run(g, { from: 23, seconds: 3, fps: 10 })
  assert.deepEqual(ch, [{ at: 26, d: -1 }]) // precisa dos 3 s inteiros de novo
})

test('sobe 1 nível após 10 s estáveis acima de 58 fps', () => {
  const g = createQualityGovernor({ level: 0 })
  run(g, { from: 0, seconds: 2, fps: 60 })
  const ch = run(g, { from: 2, seconds: 10, fps: 60 })
  assert.deepEqual(ch, [{ at: 12, d: 1 }])
  assert.equal(g.level, 1)
})

test('no máximo 1 subida por minuto', () => {
  const g = createQualityGovernor({ level: 0 })
  run(g, { from: 0, seconds: 2, fps: 60 })
  const ch = run(g, { from: 2, seconds: 80, fps: 60 })
  // 1ª subida em t=12; a 2ª só a partir de t=72 (12 + 60)
  assert.deepEqual(ch, [
    { at: 12, d: 1 },
    { at: 72, d: 1 },
  ])
  assert.equal(g.level, 2)
})

test('zona morta 50–58 fps: nada acontece', () => {
  const g = createQualityGovernor({ level: 1 })
  run(g, { from: 0, seconds: 2, fps: 60 })
  assert.deepEqual(run(g, { from: 2, seconds: 60, fps: 54 }), [])
  assert.equal(g.level, 1)
})

test('janela incompleta (avg null) é ignorada', () => {
  const g = createQualityGovernor()
  for (let t = 3; t < 20; t += 0.5) assert.equal(g.feed({ sinceLoad: t, dt: 0.5, avg: null }), 0)
})
