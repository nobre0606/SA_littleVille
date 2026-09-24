import test from 'node:test'
import assert from 'node:assert/strict'
import { cenariosDaUrl, criarCenarios, observarLoginCongelado } from './cenarios.js'

/** history/location de mentira, o bastante para o React Router e para a ponte. */
function navegadorFalso(caminhoInicial) {
  const local = { pathname: caminhoInicial, href: `http://x${caminhoInicial}` }
  const ir = (_estado, _titulo, url) => {
    const u = new URL(url, local.href)
    local.pathname = u.pathname
    local.href = u.href
  }
  return { historico: { pushState: ir, replaceState: ir }, local }
}

test('mock começa deslogado; ?mock=logged-in começa logado', () => {
  assert.equal(criarCenarios(cenariosDaUrl('')).estado.sessao, 'encerrada')
  assert.equal(criarCenarios(cenariosDaUrl('?mock=logged-in')).estado.sessao, 'ativa')
  assert.equal(criarCenarios(cenariosDaUrl('?debug=1&mock=logged-in')).estado.sessao, 'ativa')
})

test('ponte: login congelado ("/" → /permissao-localizacao) ativa a sessão simulada', () => {
  const { historico, local } = navegadorFalso('/')
  let entrou = 0
  observarLoginCongelado(historico, local, () => entrou++)
  historico.pushState(null, '', '/permissao-localizacao')
  assert.equal(entrou, 1)
  assert.equal(local.pathname, '/permissao-localizacao', 'a navegação original continua acontecendo')
})

test('ponte: também a partir de /login?expirou=1', () => {
  const { historico, local } = navegadorFalso('/login')
  let entrou = 0
  observarLoginCongelado(historico, local, () => entrou++)
  historico.pushState(null, '', '/permissao-localizacao')
  assert.equal(entrou, 1)
})

test('ponte: outras navegações NÃO logam', () => {
  const { historico, local } = navegadorFalso('/dashboard')
  let entrou = 0
  observarLoginCongelado(historico, local, () => entrou++)
  historico.pushState(null, '', '/permissao-localizacao') // não veio do login
  historico.pushState(null, '', '/')
  historico.pushState(null, '', '/perfil') // saiu do login, mas não pela tela de permissão
  assert.equal(entrou, 0)
})
