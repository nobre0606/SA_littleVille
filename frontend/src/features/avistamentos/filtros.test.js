import test from 'node:test'
import assert from 'node:assert/strict'
import { alternarOrdem, inicioDoDiaSP, lerFiltros, ordenacaoDaTabela, paraApi, paraUrl, temFiltro } from './filtros.js'

// 24/09/2026 13:30:15.250 UTC = 10:30:15 em Florianópolis.
const AGORA = Date.parse('2026-09-24T13:30:15.250Z')
const url = (qs) => new URLSearchParams(qs)

test('lerFiltros: padrões quando a URL está vazia', () => {
  assert.deepEqual(lerFiltros(url('')), { q: '', periodo: 'tudo', autor: 'todos', sort: '-vistoEm', page: 1 })
})

test('lerFiltros: valores inválidos (URL editada à mão) viram o padrão', () => {
  const f = lerFiltros(url('periodo=ontem&autor=u_9&sort=descricao&page=-3'))
  assert.deepEqual(f, { q: '', periodo: 'tudo', autor: 'todos', sort: '-vistoEm', page: 1 })
  assert.equal(lerFiltros(url(`q=${'x'.repeat(200)}`)).q.length, 100)
})

test('paraUrl e lerFiltros: ida e volta, omitindo padrões', () => {
  const f = { q: 'dunas', periodo: '7d', autor: 'me', sort: 'bairro', page: 2 }
  assert.equal(paraUrl(f).toString(), 'q=dunas&periodo=7d&autor=me&sort=bairro&page=2')
  assert.deepEqual(lerFiltros(paraUrl(f)), f)
  assert.equal(paraUrl({ q: '', periodo: 'tudo', autor: 'todos', sort: '-vistoEm', page: 1 }).toString(), '')
})

test('inicioDoDiaSP: meia-noite de Florianópolis, não de UTC', () => {
  assert.equal(new Date(inicioDoDiaSP(AGORA)).toISOString(), '2026-09-24T03:00:00.000Z')
  // 01:00 UTC do dia 25 ainda é dia 24 em SP (22:00): começo do dia continua 24/09 03:00 UTC.
  assert.equal(new Date(inicioDoDiaSP(Date.parse('2026-09-25T01:00:00.000Z'))).toISOString(), '2026-09-24T03:00:00.000Z')
})

test('paraApi: período vira "de" calculado com o agora do SERVIDOR', () => {
  const base = { q: '', autor: 'todos', sort: '-vistoEm', page: 1 }
  assert.equal(paraApi({ ...base, periodo: 'tudo' }, AGORA).de, undefined)
  assert.equal(paraApi({ ...base, periodo: 'hoje' }, AGORA).de, '2026-09-24T03:00:00.000Z')
  assert.equal(paraApi({ ...base, periodo: '7d' }, AGORA).de, '2026-09-17T13:30:15.250Z')
  const api = paraApi({ ...base, periodo: '30d', q: '  lagoa ', autor: 'me' }, AGORA)
  assert.equal(api.q, 'lagoa')
  assert.equal(api.autor, 'me')
  assert.equal(api.pageSize, 10)
})

test('alternarOrdem: mesma coluna inverte; coluna nova no sentido natural', () => {
  assert.equal(alternarOrdem('-vistoEm', 'vistoEm'), 'vistoEm')
  assert.equal(alternarOrdem('vistoEm', 'vistoEm'), '-vistoEm')
  assert.equal(alternarOrdem('-vistoEm', 'bairro'), 'bairro')
  assert.equal(alternarOrdem('bairro', 'bairro'), '-bairro')
  assert.equal(alternarOrdem('bairro', 'vistoEm'), '-vistoEm')
  assert.deepEqual(ordenacaoDaTabela('-autor'), { campo: 'autor', direcao: 'desc' })
})

test('temFiltro: página e ordenação não contam como filtro', () => {
  assert.equal(temFiltro({ q: '', periodo: 'tudo', autor: 'todos', sort: 'bairro', page: 3 }), false)
  assert.equal(temFiltro({ q: 'x', periodo: 'tudo', autor: 'todos', sort: '-vistoEm', page: 1 }), true)
})
