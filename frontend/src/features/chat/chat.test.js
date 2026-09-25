import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { agruparMensagens, estaNoFim, mesclarMensagens, rotuloDoDia } from './mensagens.js'
import { INTERVALO_ATIVO_MS, INTERVALO_OCIOSO_MS, criarTransporte, intervaloDePolling } from './transporte.js'

const AGORA = Date.parse('2026-09-24T15:00:00.000Z') // 12:00 em Florianópolis
const msg = (id, autorId, iso, extra = {}) => ({ id, autor: { id: autorId, nome: autorId }, texto: id, createdAt: iso, clientId: null, ...extra })

// ------------------------------------------------------------------------ ritmo do polling

test('intervaloDePolling: 3 s ativo, 10 s após 60 s parado, nada com a aba oculta', () => {
  assert.equal(intervaloDePolling({ visivel: true, msDesdeAtividade: 0 }), 3000)
  assert.equal(intervaloDePolling({ visivel: true, msDesdeAtividade: 59_999 }), 3000)
  assert.equal(intervaloDePolling({ visivel: true, msDesdeAtividade: 60_000 }), 10_000)
  assert.equal(intervaloDePolling({ visivel: false, msDesdeAtividade: 0 }), null)
})

test('transporte: busca na hora, depois a cada 3 s; recua para 10 s; interação volta na hora', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  let relogio = 0
  const chamadas = []
  const doc = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }
  const t = criarTransporte({
    buscar: async (since) => {
      chamadas.push({ em: relogio, since })
      return [{ id: `m${chamadas.length}`, createdAt: `2026-09-24T15:00:0${chamadas.length}.000Z` }]
    },
    aoReceber() {},
    agora: () => relogio,
    doc,
  })
  const avancar = async (ms) => {
    relogio += ms
    mock.timers.tick(ms)
    await new Promise((r) => setImmediate(r))
  }

  t.iniciar()
  await new Promise((r) => setImmediate(r))
  assert.equal(chamadas.length, 1)
  assert.equal(chamadas[0].since, undefined, 'primeira busca sem since (últimas 50)')

  await avancar(INTERVALO_ATIVO_MS)
  assert.equal(chamadas.length, 2)
  assert.equal(chamadas[1].since, '2026-09-24T15:00:01.000Z', 'since = createdAt da última recebida')

  // Parado por mais de 60 s: o ritmo cai para 10 s.
  for (let i = 0; i < 20; i++) await avancar(INTERVALO_ATIVO_MS)
  assert.equal(t.intervaloAtual(), INTERVALO_OCIOSO_MS)

  const antes = chamadas.length
  t.atividade() // interagiu: busca na hora e volta a 3 s
  await new Promise((r) => setImmediate(r))
  assert.equal(chamadas.length, antes + 1)
  assert.equal(t.intervaloAtual(), INTERVALO_ATIVO_MS)

  t.parar()
  mock.timers.reset()
})

test('transporte: aba oculta não agenda nada', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  let n = 0
  const doc = { visibilityState: 'hidden', addEventListener() {}, removeEventListener() {} }
  const t = criarTransporte({ buscar: async () => (n++, []), aoReceber() {}, doc })
  t.iniciar()
  await new Promise((r) => setImmediate(r))
  mock.timers.tick(60_000)
  await new Promise((r) => setImmediate(r))
  assert.equal(n, 1, 'só a busca inicial')
  t.parar()
  mock.timers.reset()
})

// ------------------------------------------------------------------------- mensagens

test('mesclarMensagens: sem duplicar, em ordem, e a confirmada substitui a otimista (clientId)', () => {
  const a = msg('m1', 'u1', '2026-09-24T14:00:00.000Z')
  const otimista = { id: undefined, clientId: 'c-1', autor: { id: 'eu' }, texto: 'oi', createdAt: '2026-09-24T14:05:00.000Z', pendente: true }
  let lista = mesclarMensagens([a], [otimista])
  assert.equal(lista.length, 2)
  const confirmada = msg('m2', 'eu', '2026-09-24T14:05:01.000Z', { clientId: 'c-1' })
  lista = mesclarMensagens(lista, [confirmada, a]) // o polling devolve de novo a m1
  assert.deepEqual(lista.map((m) => m.id), ['m1', 'm2'])
  assert.equal(lista.some((m) => m.pendente), false)
})

test('agruparMensagens: separador por dia (fuso de SP) e grupos por autor em até 5 min', () => {
  const lista = [
    msg('m1', 'ana', '2026-09-23T13:00:00.000Z'), // ontem
    msg('m2', 'ana', '2026-09-24T14:00:00.000Z'), // hoje
    msg('m3', 'ana', '2026-09-24T14:03:00.000Z'), // mesmo grupo (3 min)
    msg('m4', 'bruno', '2026-09-24T14:04:00.000Z'), // outro autor
    msg('m5', 'bruno', '2026-09-24T14:30:00.000Z'), // mesmo autor, mas 26 min depois
  ]
  const g = agruparMensagens(lista, AGORA)
  assert.deepEqual(
    g.map((x) => (x.tipo === 'dia' ? x.rotulo : `${x.autor.id}:${x.mensagens.length}`)),
    ['Ontem', 'ana:1', 'Hoje', 'ana:2', 'bruno:1', 'bruno:1'],
  )
})

test('rotuloDoDia: data longa para dias anteriores a ontem', () => {
  assert.equal(rotuloDoDia('2026-09-12T15:00:00.000Z', AGORA), '12 de setembro')
})

test('estaNoFim: só acompanha a rolagem quem já está no fim', () => {
  assert.equal(estaNoFim({ scrollTop: 960, scrollHeight: 1400, clientHeight: 400 }), true)
  assert.equal(estaNoFim({ scrollTop: 500, scrollHeight: 1400, clientHeight: 400 }), false)
})
