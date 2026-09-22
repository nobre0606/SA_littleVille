import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeFrameIntervals, classifyByDropRatio, runIntroBenchmark, STORM_TIERS } from './introBenchmark.js'

test('classifyByDropRatio: limiares pela proporção de frames perdidos', () => {
  assert.equal(classifyByDropRatio(0), 'high')
  assert.equal(classifyByDropRatio(0.05), 'high')
  assert.equal(classifyByDropRatio(0.051), 'medium')
  assert.equal(classifyByDropRatio(0.2), 'medium')
  assert.equal(classifyByDropRatio(0.201), 'low')
  assert.equal(classifyByDropRatio(0.6), 'low')
  assert.equal(classifyByDropRatio(NaN), 'medium') // amostra inválida: neutro
})

test('STORM_TIERS: tetos batem com snowSim (1500/1050/600)', () => {
  assert.equal(STORM_TIERS.high.cap, 1500)
  assert.equal(STORM_TIERS.medium.cap, 1050)
  assert.equal(STORM_TIERS.low.cap, 600)
})

/** Gera N intervalos em `baseMs`, trocando 1 a cada `dropEvery` por um frame perdido (2.2x). */
function buildIntervals(n, baseMs, dropEvery = 0) {
  return Array.from({ length: n }, (_, i) => (dropEvery > 0 && (i + 1) % dropEvery === 0 ? baseMs * 2.2 : baseMs))
}

test('analyzeFrameIntervals: 60Hz estável (0% perdidos) -> high, mediana ~16.7ms', () => {
  const r = analyzeFrameIntervals(buildIntervals(30, 1000 / 60))
  assert.equal(r.tier, 'high')
  assert.ok(Math.abs(r.refreshMs - 16.667) < 0.01)
  assert.ok(Math.abs(r.hz - 60) < 0.5)
  assert.equal(r.dropRatio, 0)
})

test('analyzeFrameIntervals: 120Hz estável (0% perdidos) -> high, mediana ~8.3ms', () => {
  const r = analyzeFrameIntervals(buildIntervals(40, 1000 / 120))
  assert.equal(r.tier, 'high')
  assert.ok(Math.abs(r.refreshMs - 8.333) < 0.01)
  assert.ok(Math.abs(r.hz - 120) < 1)
})

test('analyzeFrameIntervals: 144Hz com ~33% de frames perdidos -> low (não confunde com "só 6.9ms é ruim")', () => {
  const r = analyzeFrameIntervals(buildIntervals(30, 1000 / 144, 3)) // 1 a cada 3 = ~33%
  assert.equal(r.tier, 'low')
  assert.ok(Math.abs(r.refreshMs - 1000 / 144) < 0.05) // a mediana ignora os drops (robusta)
  assert.ok(r.dropRatio > 0.2)
})

test('analyzeFrameIntervals: 60Hz com ~10% de frames perdidos -> medium', () => {
  const r = analyzeFrameIntervals(buildIntervals(40, 1000 / 60, 10))
  assert.equal(r.tier, 'medium')
})

test('analyzeFrameIntervals: 15ms constante em 60Hz NÃO seria mais rápido que 16.7ms real (regressão do bug antigo)', () => {
  // O bug antigo classificava por "<=15ms -> alta", que nunca disparava em 60Hz mesmo perfeito.
  // Agora um 60Hz perfeito (16.7ms, 0% perdidos) tem que dar 'high' mesmo sem nenhum frame <=15ms.
  const r = analyzeFrameIntervals(buildIntervals(24, 16.667))
  assert.ok(r.refreshMs > 15) // nenhum frame individual chega a 15ms, e ainda assim...
  assert.equal(r.tier, 'high') // ...classifica como alta, porque não há frame perdido
})

test('analyzeFrameIntervals: dispositivo consistentemente lento (~47ms, sem variar) -> low pelo piso absoluto', () => {
  // 0% de "frames perdidos" em relação à própria mediana (nada varia), mas ~21fps sustentados
  // não é uma taxa de display de verdade — é o piso absoluto (ABSOLUTE_FLOOR_MS) que pega isso.
  const r = analyzeFrameIntervals(buildIntervals(30, 47))
  assert.equal(r.dropRatio, 0)
  assert.equal(r.tier, 'low')
})

test('analyzeFrameIntervals: 24fps exatos (limite do piso) -> ainda high; um pouco abaixo -> low', () => {
  const noFloor = analyzeFrameIntervals(buildIntervals(20, 1000 / 24))
  assert.equal(noFloor.tier, 'high')
  const belowFloor = analyzeFrameIntervals(buildIntervals(20, 1000 / 23))
  assert.equal(belowFloor.tier, 'low')
})

test('analyzeFrameIntervals: amostra vazia -> medium (neutro), sem lançar', () => {
  const r = analyzeFrameIntervals([])
  assert.equal(r.tier, 'medium')
  assert.ok(Number.isNaN(r.refreshMs))
})

// Motor falso: chama os assinantes manualmente, simulando frames a `msPerFrame` fixo, e
// registra as chamadas de setSnow/setWindIntensity para verificar a integração.
function fakeEngine() {
  const subs = []
  const engine = {
    dt: 1 / 60,
    fps: { ms: 16.7 },
    snow: { intensity: 0.2 },
    wind: { intensity: 1 },
    calls: { setSnow: [], setWindIntensity: [] },
    add(fn) {
      subs.push(fn)
      return () => {
        const i = subs.indexOf(fn)
        if (i >= 0) subs.splice(i, 1)
      }
    },
    setSnow(patch) {
      Object.assign(engine.snow, patch)
      engine.calls.setSnow.push({ ...patch })
    },
    setWindIntensity(v) {
      engine.wind.intensity = v
      engine.calls.setWindIntensity.push(v)
    },
    clock: 0, // relógio de parede falso: avança por `tick`, independente do dt (clampado) do motor
    /** `realMs` (opcional): tempo real que passou, se DIFERENTE do `msPerFrame` que o motor usa
     * para o dt — é assim que o teste de regressão do clamp de 50ms simula a situação real. */
    tick(msPerFrame, realMs = msPerFrame) {
      engine.dt = msPerFrame / 1000
      engine.fps.ms = msPerFrame
      engine.clock += realMs
      for (const fn of [...subs]) fn(engine)
    },
  }
  return engine
}

const withClock = (e, extra) => ({ now: () => e.clock, ...extra })

test('runIntroBenchmark: força tempestade cheia para medir, aplica o tier decidido ao terminar', async () => {
  const e = fakeEngine()
  const p = runIntroBenchmark(e, withClock(e, { sampleMs: 150, warmupFrames: 2 }))
  assert.equal(e.snow.intensity, 1) // já forçou tempestade cheia (escondida atrás do overlay)
  assert.equal(e.wind.intensity, 1.6)
  for (let i = 0; i < 20; i++) e.tick(1000 / 60) // 60Hz perfeito -> deve decidir 'high'
  const r = await p
  assert.equal(r.tier, 'high')
  assert.equal(e.snow.intensity, STORM_TIERS.high.snowIntensity) // aplicou o tier
  assert.equal(e.wind.intensity, 1) // devolveu o vento ao normal
})

test('runIntroBenchmark: dispositivo lento (muitos drops) -> aplica snowIntensity baixa', async () => {
  // 1 a cada 3 frames é perdido (~33%, minoria — a mediana continua ancorada nos 16.7ms
  // normais, que é a maioria; um 50/50 mudaria a própria mediana e deixaria de ser "drop").
  const e = fakeEngine()
  const p = runIntroBenchmark(e, withClock(e, { sampleMs: 150, warmupFrames: 2 }))
  for (let i = 0; i < 24; i++) e.tick((i + 1) % 3 === 0 ? 16.667 * 2.2 : 16.667)
  const r = await p
  assert.equal(r.tier, 'low')
  assert.equal(e.snow.intensity, STORM_TIERS.low.snowIntensity)
})

test('runIntroBenchmark: descarta os frames de warmup (não conta o pico de JIT/decode)', async () => {
  const e = fakeEngine()
  const p = runIntroBenchmark(e, withClock(e, { sampleMs: 100, warmupFrames: 5 }))
  for (let i = 0; i < 5; i++) e.tick(200) // pico inicial: se contasse, derrubaria para 'low'
  for (let i = 0; i < 20; i++) e.tick(1000 / 60)
  const r = await p
  assert.equal(r.tier, 'high')
})

test('runIntroBenchmark: cancela o assinante ao terminar (sem vazamento)', async () => {
  const e = fakeEngine()
  const p = runIntroBenchmark(e, withClock(e, { sampleMs: 50, warmupFrames: 1 }))
  for (let i = 0; i < 15; i++) e.tick(1000 / 60)
  await p
  const seen = []
  const off = e.add((eng) => seen.push(eng))
  e.tick(1000 / 60)
  assert.equal(seen.length, 1) // só o novo assinante roda; o do benchmark já foi removido
  off()
})

test('runIntroBenchmark: regressão do clamp de 50ms — mede pelo relógio de parede, não por engine.dt', async () => {
  // O motor limita dt a 50ms (proteção contra picos ao voltar de aba oculta, createEngine.js).
  // Sob carga pesada de verdade (aqui: 120ms reais por frame), TODO frame bateria nesse teto
  // e ficaria com dt=50ms — se o benchmark ainda lesse engine.dt, veria 0% de frames perdidos
  // (tudo "igual" a 50ms) e decidiria 'high' mesmo com o aparelho a menos de 10fps reais. Com
  // `now` (relógio de parede próprio), o benchmark precisa ver os 120ms de verdade.
  const e = fakeEngine()
  const p = runIntroBenchmark(e, withClock(e, { sampleMs: 150, warmupFrames: 2 }))
  for (let i = 0; i < 12; i++) e.tick(50, 120) // dt do motor sempre 50ms; relógio real avança 120ms
  const r = await p
  assert.ok(r.refreshMs > 100, `refreshMs deveria refletir os 120ms reais, veio ${r.refreshMs}`)
  assert.equal(r.tier, 'low')
  assert.notEqual(r.tier, 'high') // a leitura antiga (via engine.dt) cairia aqui, incorretamente
})
