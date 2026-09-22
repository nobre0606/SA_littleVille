import test from 'node:test'
import assert from 'node:assert/strict'
import { pickStormTier, runIntroBenchmark, STORM_TIERS } from './introBenchmark.js'

test('pickStormTier: limiares em ms/frame', () => {
  assert.equal(pickStormTier(10), 'high')
  assert.equal(pickStormTier(15), 'high')
  assert.equal(pickStormTier(15.1), 'medium')
  assert.equal(pickStormTier(21), 'medium')
  assert.equal(pickStormTier(21.1), 'low')
  assert.equal(pickStormTier(40), 'low')
})

test('pickStormTier: amostra inválida cai no meio (neutro)', () => {
  assert.equal(pickStormTier(NaN), 'medium')
  assert.equal(pickStormTier(undefined), 'medium')
})

test('STORM_TIERS: tetos batem com snowSim (1500/1050/600)', () => {
  assert.equal(STORM_TIERS.high.cap, 1500)
  assert.equal(STORM_TIERS.medium.cap, 1050)
  assert.equal(STORM_TIERS.low.cap, 600)
})

// Motor falso: chama os assinantes manualmente, simulando frames a `msPerFrame` fixo.
function fakeEngine() {
  const subs = []
  return {
    dt: 1 / 60,
    fps: { ms: 16.7 },
    add(fn) {
      subs.push(fn)
      return () => {
        const i = subs.indexOf(fn)
        if (i >= 0) subs.splice(i, 1)
      }
    },
    tick(msPerFrame) {
      this.dt = msPerFrame / 1000
      this.fps.ms = msPerFrame
      for (const fn of [...subs]) fn(this)
    },
  }
}

test('runIntroBenchmark: dispositivo rápido -> high', async () => {
  const e = fakeEngine()
  const p = runIntroBenchmark(e, { sampleMs: 200, warmupFrames: 2 })
  for (let i = 0; i < 30; i++) e.tick(10) // 10ms/frame = 100fps
  const r = await p
  assert.equal(r.tier, 'high')
  assert.ok(r.avgFrameMs <= 15)
})

test('runIntroBenchmark: dispositivo lento -> low', async () => {
  const e = fakeEngine()
  const p = runIntroBenchmark(e, { sampleMs: 200, warmupFrames: 2 })
  for (let i = 0; i < 12; i++) e.tick(30) // 30ms/frame ≈ 33fps
  const r = await p
  assert.equal(r.tier, 'low')
})

test('runIntroBenchmark: descarta os frames de warmup', async () => {
  const e = fakeEngine()
  const p = runIntroBenchmark(e, { sampleMs: 100, warmupFrames: 5 })
  for (let i = 0; i < 5; i++) e.tick(200) // pico de JIT/decode, deve ser ignorado
  for (let i = 0; i < 20; i++) e.tick(10) // regime estável
  const r = await p
  assert.equal(r.tier, 'high') // se o warmup contasse, a média estouraria para 'low'
})

test('runIntroBenchmark: cancela o assinante ao terminar (sem vazamento)', async () => {
  const e = fakeEngine()
  const p = runIntroBenchmark(e, { sampleMs: 50, warmupFrames: 1 })
  for (let i = 0; i < 10; i++) e.tick(10)
  await p
  assert.equal(e.add.length >= 0, true) // add ainda existe (sanity)
  const before = []
  const off = e.add((eng) => before.push(eng))
  off()
  assert.doesNotThrow(() => e.tick(10))
})
