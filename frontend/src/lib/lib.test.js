import test from 'node:test'
import assert from 'node:assert/strict'
import { PASTEIS, iniciais, pastelDoId } from './avatar.js'
import { paginasVisiveis } from './paginacao.js'
import { corDaArea } from '../domain/idadeArea.js'

test('pastelDoId: estável e sempre um dos 5 pastéis', () => {
  assert.equal(pastelDoId('u_01'), pastelDoId('u_01'))
  for (const id of ['a', 'b', 'u_01', 'u_02', '123', '']) assert.ok(PASTEIS.includes(pastelDoId(id)))
  // Ids diferentes espalham entre as cores (não cai tudo na mesma).
  const cores = new Set(Array.from({ length: 30 }, (_, i) => pastelDoId(`u_${i}`)))
  assert.ok(cores.size >= 4)
})

test('iniciais: primeiro e último nome, maiúsculas', () => {
  assert.equal(iniciais('Ana Maria Souza'), 'AS')
  assert.equal(iniciais('  bruno  '), 'B')
  assert.equal(iniciais('élida ramos'), 'ÉR')
  assert.equal(iniciais(''), '?')
  assert.equal(iniciais(undefined), '?')
})

test('paginasVisiveis: poucas páginas mostra todas', () => {
  assert.deepEqual(paginasVisiveis(1, 1), [1])
  assert.deepEqual(paginasVisiveis(3, 7), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(paginasVisiveis(1, 0), [])
})

test('paginasVisiveis: reticências no meio e nas pontas, nunca mais de 7 itens', () => {
  assert.deepEqual(paginasVisiveis(6, 12), [1, '…', 5, 6, 7, '…', 12])
  assert.deepEqual(paginasVisiveis(1, 12), [1, 2, 3, 4, 5, '…', 12])
  assert.deepEqual(paginasVisiveis(12, 12), [1, '…', 8, 9, 10, 11, 12])
  for (let p = 1; p <= 30; p++) assert.ok(paginasVisiveis(p, 30).length <= 7, `página ${p}`)
})

const AGORA = Date.parse('2026-09-24T13:00:00.000Z')
const haMin = (m) => new Date(AGORA - m * 60 * 1000).toISOString()

test('corDaArea: faixas < 1 h, 1–2 h e > 2 h, com rótulo e traço (não só cor)', () => {
  assert.equal(corDaArea(haMin(0), AGORA).estado, 'fresh')
  assert.equal(corDaArea(haMin(59), AGORA).rotulo, 'Recente')
  assert.equal(corDaArea(haMin(60), AGORA).estado, 'warm')
  assert.equal(corDaArea(haMin(120), AGORA).traco, 'tracejado')
  assert.equal(corDaArea(haMin(121), AGORA).estado, 'cold')
  assert.equal(corDaArea(haMin(121), AGORA).traco, 'pontilhado')
})

test('corDaArea: usa o "agora" recebido, não o relógio da máquina', () => {
  // Um avistamento de 2020 é "Recente" se o agora do servidor for 10 min depois dele.
  const antigo = '2020-01-01T00:00:00.000Z'
  assert.equal(corDaArea(antigo, Date.parse(antigo) + 10 * 60 * 1000).estado, 'fresh')
  assert.equal(corDaArea(haMin(-5), AGORA).estado, 'fresh') // futuro próximo
  assert.equal(corDaArea('lixo', AGORA).estado, 'cold')
})
