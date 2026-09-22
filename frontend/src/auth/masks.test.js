import test from 'node:test'
import assert from 'node:assert/strict'
import { maskPhone, maskCEP, maskCPF } from './masks.js'

test('maskPhone: celular (11 dígitos)', () => {
  assert.equal(maskPhone('11912345678'), '(11) 91234-5678')
})
test('maskPhone: fixo (10 dígitos)', () => {
  assert.equal(maskPhone('1134567890'), '(11) 3456-7890')
})
test('maskPhone: progressivo enquanto digita', () => {
  assert.equal(maskPhone('1'), '(1')
  assert.equal(maskPhone('11'), '(11) ')
  assert.equal(maskPhone('119'), '(11) 9')
})
test('maskCEP: 01001-000', () => {
  assert.equal(maskCEP('01001000'), '01001-000')
  assert.equal(maskCEP('01001'), '01001')
})
test('maskCPF (reexportado de shared/cpf): 111.444.777-35', () => {
  assert.equal(maskCPF('11144477735'), '111.444.777-35')
})
