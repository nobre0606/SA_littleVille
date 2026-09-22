import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidCPF, sanitizeCPF, formatCPF } from './cpf.js'

// Os dois CPFs abaixo foram conferidos à mão pelo algoritmo (pesos 10..2 e 11..2, módulo 11)
// antes de entrarem aqui — não são só "CPFs de exemplo conhecidos" copiados sem checar.
const VALID = ['111.444.777-35', '529.982.247-25']

test('isValidCPF: aceita CPFs válidos, com ou sem máscara', () => {
  for (const cpf of VALID) {
    assert.equal(isValidCPF(cpf), true, cpf)
    assert.equal(isValidCPF(sanitizeCPF(cpf)), true, cpf)
  }
})

test('isValidCPF: rejeita dígito verificador errado', () => {
  assert.equal(isValidCPF('111.444.777-36'), false)
  assert.equal(isValidCPF('529.982.247-26'), false)
})

test('isValidCPF: rejeita todos os dígitos iguais (matematicamente "válido", mas nunca emitido)', () => {
  for (const d of '0123456789') assert.equal(isValidCPF(d.repeat(11)), false, d)
})

test('isValidCPF: rejeita tamanho errado e entrada vazia/inválida', () => {
  assert.equal(isValidCPF('123'), false)
  assert.equal(isValidCPF('123456789012'), false)
  assert.equal(isValidCPF(''), false)
  assert.equal(isValidCPF(null), false)
  assert.equal(isValidCPF(undefined), false)
})

test('sanitizeCPF: tira tudo que não é dígito', () => {
  assert.equal(sanitizeCPF('111.444.777-35'), '11144477735')
  assert.equal(sanitizeCPF('abc111def'), '111')
})

test('formatCPF: aplica a máscara progressivamente, conforme os dígitos chegam', () => {
  assert.equal(formatCPF('111'), '111')
  assert.equal(formatCPF('111444'), '111.444')
  assert.equal(formatCPF('111444777'), '111.444.777')
  assert.equal(formatCPF('11144477735'), '111.444.777-35')
  assert.equal(formatCPF('11144477735999'), '111.444.777-35') // ignora dígitos a mais
})
