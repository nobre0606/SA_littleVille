import test from 'node:test'
import assert from 'node:assert/strict'
import { LIMITE_DESVIO_MS, calcularDesvio, criarRelogioServidor, relogioDesajustado } from './serverClock.js'

const SERVIDOR = '2026-09-24T13:00:00.000Z'
const SERVIDOR_MS = Date.parse(SERVIDOR)
const MIN = 60 * 1000

test('calcularDesvio: positivo quando o relógio local está atrasado', () => {
  assert.equal(calcularDesvio(SERVIDOR, SERVIDOR_MS - 10 * MIN), 10 * MIN)
  assert.equal(calcularDesvio(SERVIDOR, SERVIDOR_MS + 3 * MIN), -3 * MIN)
  assert.equal(calcularDesvio(SERVIDOR, SERVIDOR_MS), 0)
})

test('calcularDesvio: serverTime inválido não gera desvio', () => {
  assert.equal(calcularDesvio('ontem', SERVIDOR_MS), null)
  assert.equal(calcularDesvio(undefined, SERVIDOR_MS), null)
})

test('relogioDesajustado: só acima de 5 min, para os dois lados', () => {
  assert.equal(relogioDesajustado(LIMITE_DESVIO_MS), false)
  assert.equal(relogioDesajustado(LIMITE_DESVIO_MS + 1), true)
  assert.equal(relogioDesajustado(-(LIMITE_DESVIO_MS + 1)), true)
  assert.equal(relogioDesajustado(4 * MIN), false)
  assert.equal(relogioDesajustado(null), false)
})

test('relógio: agora() devolve a hora do servidor mesmo com o aparelho 2 h adiantado', () => {
  let local = SERVIDOR_MS + 2 * 60 * MIN // aparelho adiantado 2 h
  const relogio = criarRelogioServidor({ agoraLocal: () => local })
  relogio.registrarResposta(SERVIDOR)
  assert.equal(relogio.agora(), SERVIDOR_MS)
  assert.equal(relogio.desajustado(), true)
  local += 90 * 1000 // o tempo passa normalmente no aparelho
  assert.equal(relogio.agora(), SERVIDOR_MS + 90 * 1000)
})

test('relógio: só a PRIMEIRA resposta define o desvio', () => {
  let local = SERVIDOR_MS
  const relogio = criarRelogioServidor({ agoraLocal: () => local })
  relogio.registrarResposta(SERVIDOR)
  local += 5000
  relogio.registrarResposta('2026-09-24T15:00:00.000Z') // ignorada
  assert.equal(relogio.desvio(), 0)
})

test('relógio: antes de qualquer resposta usa o relógio local e ignora serverTime inválido', () => {
  const relogio = criarRelogioServidor({ agoraLocal: () => 1000 })
  assert.equal(relogio.desvio(), null)
  assert.equal(relogio.agora(), 1000)
  assert.equal(relogio.desajustado(), false)
  relogio.registrarResposta('lixo')
  assert.equal(relogio.desvio(), null)
})

test('relógio: avisa os assinantes uma única vez, quando o desvio é definido', () => {
  const relogio = criarRelogioServidor({ agoraLocal: () => SERVIDOR_MS - 7 * MIN })
  const recebidos = []
  const cancelar = relogio.assinar((d) => recebidos.push(d))
  relogio.registrarResposta(SERVIDOR)
  relogio.registrarResposta(SERVIDOR)
  assert.deepEqual(recebidos, [7 * MIN])
  cancelar()
})
