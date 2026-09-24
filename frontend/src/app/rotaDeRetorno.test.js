import test from 'node:test'
import assert from 'node:assert/strict'
import { consumirRetorno, guardarRetorno, rotaSegura, temRetorno, urlDoLogin } from './rotaDeRetorno.js'

/** sessionStorage de mentira (Map). */
const memoria = () => {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

test('rotaSegura: só caminhos internos (bloqueia redirecionamento aberto)', () => {
  assert.equal(rotaSegura('/avistamentos?page=2'), '/avistamentos?page=2')
  assert.equal(rotaSegura('//site-malicioso.com'), null)
  assert.equal(rotaSegura('https://site-malicioso.com'), null)
  assert.equal(rotaSegura('/\\site.com'), null)
  assert.equal(rotaSegura('avistamentos'), null)
  assert.equal(rotaSegura(undefined), null)
})

test('rotaSegura: nunca volta para o login, a intro ou a permissão (evita laço)', () => {
  assert.equal(rotaSegura('/login?expirou=1'), null)
  assert.equal(rotaSegura('/'), null)
  assert.equal(rotaSegura('/permissao-localizacao'), null)
})

test('urlDoLogin: expirou só quando havia sessão; voltar codificado', () => {
  assert.equal(urlDoLogin({ voltar: '/perfil', expirou: true }), '/login?expirou=1&voltar=%2Fperfil')
  assert.equal(urlDoLogin({ voltar: '/dashboard', expirou: false }), '/login?voltar=%2Fdashboard')
  assert.equal(urlDoLogin({ voltar: '//mal.com', expirou: false }), '/login')
})

test('guardar/consumir: uso único', () => {
  const m = memoria()
  guardarRetorno('/avistamentos/s_001', m)
  assert.equal(temRetorno(m), true)
  assert.equal(consumirRetorno(m), '/avistamentos/s_001')
  assert.equal(consumirRetorno(m), null)
  assert.equal(temRetorno(m), false)
})

test('guardar/consumir: armazenamento bloqueado não quebra nada', () => {
  const quebrado = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') }, removeItem: () => {} }
  assert.doesNotThrow(() => guardarRetorno('/perfil', quebrado))
  assert.equal(consumirRetorno(quebrado), null)
  assert.equal(temRetorno(quebrado), false)
})
