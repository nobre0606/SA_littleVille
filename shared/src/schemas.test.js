import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cepSchema,
  cpfSchema,
  loginSchema,
  registerSchema,
  registerStep1Schema,
  registerStep2Schema,
  senhaSchema,
  telefoneSchema,
} from './schemas.js'

const VALID_STEP1 = {
  nome: 'Ana Maria',
  email: 'ANA@Exemplo.com',
  senha: 'Abcdefg1',
  cpf: '111.444.777-35',
  telefone: '(11) 91234-5678',
}
const VALID_STEP2 = {
  cep: '01001-000',
  numero: '10',
  rua: 'Praça da Sé',
  bairro: 'Sé',
  consentimentoLgpd: true,
}

test('loginSchema: aceita e-mail válido com qualquer senha não vazia', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', senha: 'x' }).success, true)
})

test('loginSchema: rejeita e-mail inválido e senha vazia, com mensagens em português', () => {
  const r = loginSchema.safeParse({ email: 'nao-e-email', senha: '' })
  assert.equal(r.success, false)
  const messages = r.error.issues.map((i) => i.message)
  assert.ok(messages.includes('E-mail inválido'))
  assert.ok(messages.includes('Informe a senha'))
})

test('senhaSchema: exige minúscula, maiúscula, número e 8+ caracteres', () => {
  assert.equal(senhaSchema.safeParse('Abcdefg1').success, true)
  assert.equal(senhaSchema.safeParse('abcdefg1').success, false) // sem maiúscula
  assert.equal(senhaSchema.safeParse('ABCDEFG1').success, false) // sem minúscula
  assert.equal(senhaSchema.safeParse('Abcdefgh').success, false) // sem número
  assert.equal(senhaSchema.safeParse('Ab1').success, false) // curta
})

test('cpfSchema: normaliza (só dígitos) e valida os dígitos verificadores', () => {
  const r = cpfSchema.safeParse('111.444.777-35')
  assert.equal(r.success, true)
  assert.equal(r.data, '11144477735') // saiu sem máscara
  assert.equal(cpfSchema.safeParse('111.444.777-36').success, false) // dígito errado
  assert.equal(cpfSchema.safeParse('111.111.111-11').success, false) // repetido
})

test('telefoneSchema: aceita 10 ou 11 dígitos (DDD + fixo/celular), com ou sem máscara', () => {
  assert.equal(telefoneSchema.safeParse('(11) 91234-5678').success, true) // 11 dígitos
  assert.equal(telefoneSchema.safeParse('(11) 3456-7890').success, true) // 10 dígitos
  assert.equal(telefoneSchema.safeParse('123').success, false)
})

test('cepSchema: exige 8 dígitos, com ou sem traço', () => {
  assert.equal(cepSchema.safeParse('01001-000').success, true)
  assert.equal(cepSchema.safeParse('01001000').success, true)
  assert.equal(cepSchema.safeParse('123').success, false)
})

test('registerStep1Schema: valida só os campos da etapa 1', () => {
  assert.equal(registerStep1Schema.safeParse(VALID_STEP1).success, true)
  assert.equal(registerStep1Schema.safeParse({ ...VALID_STEP1, nome: 'Jo' }).success, false) // nome curto
})

test('registerStep2Schema: exige o consentimento LGPD explicitamente true', () => {
  assert.equal(registerStep2Schema.safeParse(VALID_STEP2).success, true)
  const semConsentimento = registerStep2Schema.safeParse({ ...VALID_STEP2, consentimentoLgpd: false })
  assert.equal(semConsentimento.success, false)
  assert.ok(semConsentimento.error.issues.some((i) => i.message.includes('aceitar')))
  assert.equal(registerStep2Schema.safeParse({ ...VALID_STEP2, consentimentoLgpd: undefined }).success, false)
})

test('registerSchema: as duas etapas juntas (o que o back valida no POST)', () => {
  const full = { ...VALID_STEP1, ...VALID_STEP2 }
  const r = registerSchema.safeParse(full)
  assert.equal(r.success, true)
  assert.equal(r.data.email, 'ana@exemplo.com') // normalizado
  assert.equal(r.data.cpf, '11144477735')
  assert.equal(r.data.telefone, '11912345678')
  assert.equal(r.data.cep, '01001000')
})

test('registerSchema: falta de qualquer campo obrigatório rejeita', () => {
  const full = { ...VALID_STEP1, ...VALID_STEP2 }
  for (const key of Object.keys(full)) {
    const partial = { ...full }
    delete partial[key]
    assert.equal(registerSchema.safeParse(partial).success, false, `deveria falhar sem ${key}`)
  }
})
