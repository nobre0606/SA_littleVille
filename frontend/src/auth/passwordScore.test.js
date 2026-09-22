import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreSenha } from './passwordScore.js'

test('scoreSenha: cresce com tamanho(8+)/minúscula/maiúscula/número/tamanho(12+)', () => {
  assert.equal(scoreSenha(''), 0)
  assert.equal(scoreSenha('a'), 1) // <8 chars, mas tem minúscula -> 1 ponto
  assert.equal(scoreSenha('abcdefgh'), 2) // 8+ chars (+1) e minúscula (+1)
  assert.equal(scoreSenha('Abcdefgh'), 3) // + maiúscula
  assert.equal(scoreSenha('Abcdefg1'), 4) // + número (já bate o teto)
  assert.equal(scoreSenha('Abcdefghijk1'), 4) // + 12 chars, mas nunca passa de 4 (teto)
})
