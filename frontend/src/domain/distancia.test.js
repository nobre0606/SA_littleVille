import test from 'node:test'
import assert from 'node:assert/strict'
import { distanciaM, formatarDistancia, ordenarPorDistanciaEHora } from './distancia.js'

test('distanciaM: Centro de Floripa → Lagoa da Conceição ≈ 8 km', () => {
  const d = distanciaM({ lat: -27.5954, lng: -48.548 }, { lat: -27.603, lng: -48.468 })
  assert.ok(d > 7500 && d < 8500, `${d}`)
  assert.equal(distanciaM({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0)
})

test('formatarDistancia: m, km com vírgula e km inteiro', () => {
  assert.equal(formatarDistancia(347), '350 m')
  assert.equal(formatarDistancia(1234), '1,2 km')
  assert.equal(formatarDistancia(18_400), '18 km')
})

test('ordenarPorDistanciaEHora: mais perto primeiro; sem posição, mais recente primeiro; não altera a original', () => {
  const lista = [
    { id: 'longe', lat: -27.44, lng: -48.5, vistoEm: '2026-09-24T13:00:00.000Z' },
    { id: 'perto', lat: -27.6, lng: -48.47, vistoEm: '2026-09-24T10:00:00.000Z' },
  ]
  const copia = structuredClone(lista)
  assert.deepEqual(ordenarPorDistanciaEHora(lista, { lat: -27.601, lng: -48.471 }).map((a) => a.id), ['perto', 'longe'])
  assert.deepEqual(ordenarPorDistanciaEHora(lista, null).map((a) => a.id), ['longe', 'perto'])
  assert.deepEqual(lista, copia)
})
