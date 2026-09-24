import test from 'node:test'
import assert from 'node:assert/strict'
import { formatarDataHoraCompleta, formatarNumero, formatarTempoRelativo } from './format.js'

// 24/09/2026 13:00 UTC = 10:00 em Florianópolis (UTC−3).
const AGORA = Date.parse('2026-09-24T13:00:00.000Z')

test('formatarTempoRelativo: minutos e horas no mesmo dia', () => {
  assert.equal(formatarTempoRelativo('2026-09-24T12:59:30.000Z', AGORA), 'agora mesmo')
  assert.equal(formatarTempoRelativo('2026-09-24T12:20:00.000Z', AGORA), 'há 40 min')
  assert.equal(formatarTempoRelativo('2026-09-24T10:00:00.000Z', AGORA), 'há 3 h')
})

test('formatarTempoRelativo: "ontem" respeita o fuso de São Paulo, não o UTC', () => {
  // 02:30 UTC do dia 24 = 23:30 do dia 23 em SP → é "ontem", mesmo sendo "hoje" em UTC.
  assert.equal(formatarTempoRelativo('2026-09-24T02:30:00.000Z', AGORA), 'ontem às 23:30')
})

test('formatarTempoRelativo: datas antigas e futuras', () => {
  assert.equal(formatarTempoRelativo('2026-09-12T15:00:00.000Z', AGORA), '12 de set.')
  assert.equal(formatarTempoRelativo('2025-09-12T15:00:00.000Z', AGORA), '12 de set. de 2025')
  assert.equal(formatarTempoRelativo('2026-09-24T13:00:20.000Z', AGORA), 'agora mesmo')
  assert.equal(formatarTempoRelativo('inválido', AGORA), '')
})

test('formatarDataHoraCompleta e formatarNumero: pt-BR', () => {
  assert.equal(formatarDataHoraCompleta('2026-09-24T13:05:00.000Z'), '24 de setembro de 2026 às 10:05')
  assert.equal(formatarNumero(12345), '12.345')
})
