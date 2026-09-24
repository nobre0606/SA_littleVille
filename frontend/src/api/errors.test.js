import test from 'node:test'
import assert from 'node:assert/strict'
import { apiErrorSchema } from 'shared/schemas'
import { ApiClientError, erroDeRede, normalizarErro, normalizarErroLegado } from './errors.js'

const T = '2026-09-24T13:00:00.000Z'

test('normalizarErro: formato do contrato passa direto', () => {
  const corpo = { error: { code: 'FORBIDDEN', message: 'Sem permissão' }, serverTime: T }
  assert.equal(apiErrorSchema.safeParse(corpo).success, true)
  const e = normalizarErro(corpo, 403)
  assert.ok(e instanceof ApiClientError)
  assert.deepEqual([e.code, e.message, e.status, e.serverTime], ['FORBIDDEN', 'Sem permissão', 403, T])
  assert.deepEqual(e.fields, {})
})

test('normalizarErro: formato do contrato com fields', () => {
  const e = normalizarErro({ error: { code: 'VALIDATION_ERROR', message: 'x', fields: { bairro: 'Escolha' } } }, 400)
  assert.deepEqual(e.fields, { bairro: 'Escolha' })
})

test('normalizarErro: código desconhecido cai no código do status', () => {
  assert.equal(normalizarErro({ error: { code: 'INVENTADO', message: 'x' } }, 404).code, 'NOT_FOUND')
})

test('normalizarErro: formato ANTIGO { message, fieldErrors } vira o do contrato', () => {
  const e = normalizarErro({ message: 'Dados inválidos', fieldErrors: { email: 'E-mail inválido' } }, 400, '/auth/register')
  assert.equal(e.code, 'VALIDATION_ERROR')
  assert.equal(e.message, 'Dados inválidos')
  assert.deepEqual(e.fields, { email: 'E-mail inválido' })
})

test('normalizarErro (antigo): 401 no login é senha errada; fora dele é sessão expirada', () => {
  assert.equal(normalizarErro({ message: 'E-mail ou senha inválidos' }, 401, '/auth/login').code, 'INVALID_CREDENTIALS')
  assert.equal(normalizarErro({ message: 'Não autenticado' }, 401, '/auth/me').code, 'UNAUTHENTICATED')
})

test('normalizarErro (antigo): 409 distingue CPF, e-mail e equipe', () => {
  assert.equal(normalizarErro({ fieldErrors: { cpf: 'x' } }, 409, '/auth/register').code, 'CPF_TAKEN')
  assert.equal(normalizarErro({ fieldErrors: { email: 'x', cpf: 'y' } }, 409, '/auth/register').code, 'EMAIL_TAKEN')
  assert.equal(normalizarErro({ message: 'x' }, 409, '/teams/join').code, 'ALREADY_IN_TEAM')
})

test('normalizarErro: corpo vazio usa o status e a mensagem padrão em pt-BR', () => {
  const e = normalizarErro(null, 503)
  assert.equal(e.code, 'SERVICE_UNAVAILABLE')
  assert.match(e.message, /indisponível/)
  assert.equal(normalizarErro(undefined, 502).code, 'INTERNAL_ERROR')
  assert.equal(normalizarErro(undefined, 418).code, 'VALIDATION_ERROR')
})

test('normalizarErroLegado: aceita o ApiError lançado pelo auth congelado', () => {
  const legado = Object.assign(new Error('Dados já cadastrados'), { status: 409, fieldErrors: { cpf: 'Este CPF já está cadastrado' } })
  const e = normalizarErroLegado(legado, '/auth/register')
  assert.equal(e.code, 'CPF_TAKEN')
  assert.deepEqual(e.fields, { cpf: 'Este CPF já está cadastrado' })
})

test('erroDeRede: código local NETWORK_ERROR com status 0', () => {
  const e = erroDeRede()
  assert.equal(e.code, 'NETWORK_ERROR')
  assert.equal(e.status, 0)
})
