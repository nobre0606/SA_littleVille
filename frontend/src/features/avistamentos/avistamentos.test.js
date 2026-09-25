import test from 'node:test'
import assert from 'node:assert/strict'
import { QueryClient } from '@tanstack/react-query'
import { chaves } from '../../api/queryClient.js'
import { atualizarItem, removerItem, restaurarFoto, tirarFoto } from './cache.js'
import { estaAlterado, motivosDeBloqueio, paraEnvio, validar, valoresIniciais } from './formulario.js'

const A = { id: 's1', bairro: 'Joaquina', descricao: 'Pegadas', lat: -27.6, lng: -48.4, origemLocal: 'gps', precisaoM: 12 }
const B = { id: 's2', bairro: 'Campeche', descricao: '', lat: -27.7, lng: -48.5, origemLocal: 'manual', precisaoM: null }

function clienteComDados() {
  const qc = new QueryClient()
  const pagina = { page: 1, pageSize: 10, total: 2, totalPages: 1 }
  qc.setQueryData(chaves.listaAvistamentos({ page: 1 }), { data: [A, B], page: pagina })
  qc.setQueryData(chaves.listaAvistamentos({ q: 'x' }), { data: [B], page: { ...pagina, total: 1 } })
  qc.setQueryData(chaves.avistamento('s1'), { data: A })
  return qc
}

// ----------------------------------------------------------------------------- cache

test('cache: atualizarItem troca o item em todas as listas e no detalhe', () => {
  const qc = clienteComDados()
  atualizarItem(qc, 's1', (a) => ({ ...a, descricao: 'Editada' }))
  assert.equal(qc.getQueryData(chaves.listaAvistamentos({ page: 1 })).data[0].descricao, 'Editada')
  assert.equal(qc.getQueryData(chaves.avistamento('s1')).data.descricao, 'Editada')
  assert.equal(qc.getQueryData(chaves.listaAvistamentos({ q: 'x' })).data[0].id, 's2', 'lista sem o item fica igual')
})

test('cache: removerItem tira das listas, ajusta o total e apaga o detalhe', () => {
  const qc = clienteComDados()
  removerItem(qc, 's1')
  const lista = qc.getQueryData(chaves.listaAvistamentos({ page: 1 }))
  assert.deepEqual(lista.data.map((a) => a.id), ['s2'])
  assert.equal(lista.page.total, 1)
  assert.equal(qc.getQueryData(chaves.listaAvistamentos({ q: 'x' })).page.total, 1, 'lista sem o item não muda o total')
  assert.equal(qc.getQueryData(chaves.avistamento('s1')), undefined)
})

test('cache: a foto desfaz qualquer mudança (reversão da ação otimista)', () => {
  const qc = clienteComDados()
  const foto = tirarFoto(qc)
  removerItem(qc, 's1')
  atualizarItem(qc, 's2', (a) => ({ ...a, bairro: 'Centro' }))
  restaurarFoto(qc, foto)
  assert.deepEqual(qc.getQueryData(chaves.listaAvistamentos({ page: 1 })).data, [A, B])
  assert.deepEqual(qc.getQueryData(chaves.avistamento('s1')).data, A)
})

// ------------------------------------------------------------------------ formulário

test('formulário: sem local e sem bairro, o envio é bloqueado com os motivos', () => {
  const v = valoresIniciais()
  assert.deepEqual(motivosDeBloqueio(v), ['Marque o local: toque no mapa ou use sua localização.', 'Escolha o bairro.'])
  assert.deepEqual(motivosDeBloqueio({ ...v, bairro: 'Centro', local: { lat: 1, lng: 1, origem: 'manual' } }), [])
})

test('formulário: descrição acima de 500 também bloqueia', () => {
  const v = { descricao: 'x'.repeat(501), bairro: 'Centro', local: { lat: 1, lng: 1, origem: 'manual' } }
  assert.equal(motivosDeBloqueio(v).length, 1)
  assert.equal(validar(v).ok, false)
})

test('formulário: validar usa o schema do contrato; descrição opcional', () => {
  const ok = validar({ descricao: '', bairro: 'Campeche', local: { lat: -27.6, lng: -48.4, origem: 'gps', precisaoM: 20 } })
  assert.equal(ok.ok, true)
  assert.deepEqual(ok.dados, { descricao: '', bairro: 'Campeche', lat: -27.6, lng: -48.4, origemLocal: 'gps', precisaoM: 20 })
  const ruim = validar({ descricao: '', bairro: 'Bairro Inventado', local: null })
  assert.equal(ruim.ok, false)
  assert.ok(ruim.erros.bairro)
  assert.ok(ruim.erros.local, 'lat/lng viram o erro do campo "local"')
})

test('formulário: editar começa preenchido e detecta alteração', () => {
  const inicio = valoresIniciais(A)
  assert.deepEqual(paraEnvio(inicio), { descricao: 'Pegadas', bairro: 'Joaquina', lat: -27.6, lng: -48.4, origemLocal: 'gps', precisaoM: 12 })
  assert.equal(estaAlterado(inicio, inicio), false)
  assert.equal(estaAlterado({ ...inicio, descricao: 'Pegadas!' }, inicio), true)
  assert.equal(estaAlterado({ ...inicio, local: { ...inicio.local, lat: -27.61 } }, inicio), true)
  assert.equal(estaAlterado({ ...inicio, local: { ...inicio.local } }, inicio), false, 'mesmo ponto, objeto novo')
  assert.equal(estaAlterado(valoresIniciais(), valoresIniciais()), false)
})
