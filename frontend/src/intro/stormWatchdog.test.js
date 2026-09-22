import test from 'node:test'
import assert from 'node:assert/strict'
import { createStormWatchdog } from './stormWatchdog.js'
import { STORM_TIERS } from '../scene/engine/introBenchmark.js'

function fakeEngine() {
  const subs = []
  const engine = {
    snow: { intensity: STORM_TIERS.high.snowIntensity },
    setSnow(patch) {
      Object.assign(engine.snow, patch)
    },
    add(fn) {
      subs.push(fn)
      return () => {
        const i = subs.indexOf(fn)
        if (i >= 0) subs.splice(i, 1)
      }
    },
    clock: 0,
    /** Avança o relógio e dispara os assinantes `n` vezes, `intervalMs` cada. */
    ticks(n, intervalMs) {
      for (let i = 0; i < n; i++) {
        engine.clock += intervalMs
        for (const fn of [...subs]) fn(engine)
      }
    },
  }
  return engine
}

test('mediana da janela abaixo de 2x o refresh: não aciona', () => {
  const e = fakeEngine()
  const wd = createStormWatchdog({ engine: e, refreshMs: 16.67, startTier: 'high', now: () => e.clock })
  e.ticks(40, 16.67) // ~667ms a 60Hz perfeito, mais de uma janela de 0.5s
  assert.equal(wd.trippedCount, 0)
  assert.equal(wd.currentTier, 'high')
  assert.equal(e.snow.intensity, STORM_TIERS.high.snowIntensity)
})

test('mediana da janela acima de 2x o refresh por 0,5s: reduz um nível na hora', () => {
  const e = fakeEngine()
  const wd = createStormWatchdog({ engine: e, refreshMs: 16.67, startTier: 'high', now: () => e.clock })
  e.ticks(15, 40) // 40ms/frame = 2.4x o refresh (16.67ms), sustentado por 600ms (>0.5s)
  assert.equal(wd.trippedCount, 1)
  assert.equal(wd.currentTier, 'medium')
  assert.equal(e.snow.intensity, STORM_TIERS.medium.snowIntensity)
})

test('continua ruim: cascateia até o piso (low), sem passar disso', () => {
  const e = fakeEngine()
  const wd = createStormWatchdog({ engine: e, refreshMs: 16.67, startTier: 'high', now: () => e.clock })
  e.ticks(15, 40) // janela 1: dispara high -> medium
  e.ticks(15, 40) // janela 2: continua ruim, medium -> low
  e.ticks(15, 40) // janela 3: já está no piso, não passa disso
  assert.equal(wd.currentTier, 'low')
  assert.equal(wd.trippedCount, 2) // só 2 quedas possíveis (high->medium->low)
  assert.equal(e.snow.intensity, STORM_TIERS.low.snowIntensity)
})

test('sem recuperação: melhora depois de acionar, mas o nível não volta a subir', () => {
  const e = fakeEngine()
  const wd = createStormWatchdog({ engine: e, refreshMs: 16.67, startTier: 'high', now: () => e.clock })
  e.ticks(15, 40) // dispara: high -> medium
  assert.equal(wd.currentTier, 'medium')
  e.ticks(40, 16.67) // volta a rodar liso por bastante tempo
  assert.equal(wd.currentTier, 'medium') // continua reduzido — é um freio, não um governador
  assert.equal(wd.trippedCount, 1)
})

test('amostras insuficientes na janela: não decide em cima de ruído', () => {
  const e = fakeEngine()
  const wd = createStormWatchdog({ engine: e, refreshMs: 16.67, startTier: 'high', now: () => e.clock })
  e.ticks(1, 600) // 1 frame só cobrindo a janela toda — abaixo de MIN_SAMPLES
  assert.equal(wd.trippedCount, 0)
})

test('já começando em low: não tenta reduzir além do piso', () => {
  const e = fakeEngine()
  const wd = createStormWatchdog({ engine: e, refreshMs: 16.67, startTier: 'low', now: () => e.clock })
  e.ticks(15, 200) // bem pior que 2x, mas já não há pra onde cair
  assert.equal(wd.currentTier, 'low')
  assert.equal(wd.trippedCount, 0)
})

test('dispose() para de monitorar (sem vazamento, sem reduzir depois de desligado)', () => {
  const e = fakeEngine()
  const wd = createStormWatchdog({ engine: e, refreshMs: 16.67, startTier: 'high', now: () => e.clock })
  wd.dispose()
  e.ticks(15, 40) // deveria disparar se ainda estivesse ativo
  assert.equal(wd.trippedCount, 0)
  assert.equal(e.snow.intensity, STORM_TIERS.high.snowIntensity)
})

test('refreshMs inválido (NaN): usa o piso de ~24fps como base, não trava', () => {
  const e = fakeEngine()
  const wd = createStormWatchdog({ engine: e, refreshMs: NaN, startTier: 'high', now: () => e.clock })
  e.ticks(20, 16.67) // 60Hz de verdade: bem abaixo do piso de 24fps, não deveria acionar
  assert.equal(wd.trippedCount, 0)
})
