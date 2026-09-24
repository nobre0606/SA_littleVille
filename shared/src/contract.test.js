import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ERROR_CODES,
  apiErrorSchema,
  dashboardStatsSchema,
  emergencyPlaceSchema,
  envelope,
  isoUtcSchema,
  locationUpdateSchema,
  messageCreateSchema,
  messageSchema,
  pagedEnvelope,
  sessionSchema,
  sightingInputSchema,
  sightingListQuerySchema,
  sightingSchema,
  teamJoinSchema,
  teamMemberSchema,
  teamSchema,
  userSchema,
} from './schemas.js'

const T = '2026-09-24T13:05:00.000Z'
const USER = { id: 'u1', nome: 'Ana Souza', email: 'ana@example.com', papel: 'usuario', equipeId: null, createdAt: T }
const SIGHTING = {
  id: 's1',
  autor: { id: 'u1', nome: 'Ana Souza' },
  descricao: 'Pegadas enormes na areia perto das dunas.',
  lat: -27.6267,
  lng: -48.4499,
  origemLocal: 'gps',
  precisaoM: 12,
  bairro: 'Joaquina',
  vistoEm: T,
  createdAt: T,
  updatedAt: T,
  deletedAt: null,
  acoes: { podeEditar: true, podeExcluir: true },
}
const zeros30 = Array.from({ length: 30 }, (_, i) => ({ data: `2026-09-${String(i + 1).padStart(2, '0')}`, total: 0 }))

test('isoUtcSchema: aceita UTC com Z e recusa hora local com offset', () => {
  assert.equal(isoUtcSchema.safeParse(T).success, true)
  assert.equal(isoUtcSchema.safeParse('2026-09-24T10:05:00-03:00').success, false)
  assert.equal(isoUtcSchema.safeParse('24/09/2026 10:05').success, false)
})

test('envelope: toda resposta de sucesso exige serverTime', () => {
  const schema = envelope(userSchema)
  assert.equal(schema.safeParse({ data: USER, serverTime: T }).success, true)
  assert.equal(schema.safeParse({ data: USER }).success, false)
})

test('pagedEnvelope: exige metadados de paginação', () => {
  const schema = pagedEnvelope(sightingSchema)
  const page = { page: 1, pageSize: 20, total: 1, totalPages: 1 }
  assert.equal(schema.safeParse({ data: [SIGHTING], page, serverTime: T }).success, true)
  assert.equal(schema.safeParse({ data: [SIGHTING], serverTime: T }).success, false)
})

test('apiErrorSchema: formato único de erro, com fields opcional e código conhecido', () => {
  assert.equal(
    apiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'Avistamento não encontrado' }, serverTime: T }).success,
    true,
  )
  assert.equal(
    apiErrorSchema.safeParse({
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', fields: { lat: 'Latitude inválida' } },
      serverTime: T,
    }).success,
    true,
  )
  assert.equal(apiErrorSchema.safeParse({ error: { code: 'INVENTADO', message: 'x' }, serverTime: T }).success, false)
  // Formato antigo do mock de auth ({ message, fieldErrors }) não vale mais.
  assert.equal(apiErrorSchema.safeParse({ message: 'x', fieldErrors: {} }).success, false)
})

test('ERROR_CODES: todo código mapeia para um status HTTP de erro', () => {
  for (const [code, status] of Object.entries(ERROR_CODES)) {
    assert.ok(status >= 400 && status < 600, code)
  }
})

test('userSchema/sessionSchema: papel restrito e sem dados sensíveis obrigatórios', () => {
  assert.equal(sessionSchema.safeParse({ user: USER, expiraEm: T }).success, true)
  assert.equal(userSchema.safeParse({ ...USER, papel: 'root' }).success, false)
  // Campos a mais (ex.: cpf) são descartados pelo parse — nunca chegam ao front via schema.
  assert.equal('cpf' in userSchema.parse({ ...USER, cpf: '11144477735' }), false)
})

test('sightingInputSchema: local obrigatório e descrição com limites', () => {
  const ok = { descricao: '  Vi um vulto branco  ', lat: -27.6, lng: -48.5, origemLocal: 'manual' }
  const r = sightingInputSchema.safeParse(ok)
  assert.equal(r.success, true)
  assert.equal(r.data.descricao, 'Vi um vulto branco')
  assert.equal(r.data.precisaoM, null)

  const { lat: _lat, ...semLat } = ok
  assert.equal(sightingInputSchema.safeParse(semLat).success, false)
  assert.equal(sightingInputSchema.safeParse({ ...ok, lat: 91 }).success, false)
  assert.equal(sightingInputSchema.safeParse({ ...ok, descricao: 'ab' }).success, false)
  assert.equal(sightingInputSchema.safeParse({ ...ok, descricao: 'x'.repeat(501) }).success, false)
  assert.equal(sightingInputSchema.safeParse({ ...ok, descricao: 'x'.repeat(500) }).success, true)
})

test('sightingInputSchema: cliente não consegue mandar a hora (hora automática)', () => {
  const r = sightingInputSchema.safeParse({
    descricao: 'Vi um vulto branco',
    lat: -27.6,
    lng: -48.5,
    origemLocal: 'gps',
    vistoEm: '2020-01-01T00:00:00.000Z',
  })
  assert.equal(r.success, false)
})

test('sightingSchema: exige permissões calculadas pelo servidor', () => {
  assert.equal(sightingSchema.safeParse(SIGHTING).success, true)
  const { acoes: _acoes, ...semAcoes } = SIGHTING
  assert.equal(sightingSchema.safeParse(semAcoes).success, false)
})

test('sightingListQuerySchema: converte texto da URL e aplica padrões', () => {
  const r = sightingListQuerySchema.parse({ page: '2', pageSize: '10' })
  assert.deepEqual(r, { page: 2, pageSize: 10, sort: '-vistoEm' })
  assert.equal(sightingListQuerySchema.safeParse({ autor: 'me' }).success, true)
  assert.equal(sightingListQuerySchema.safeParse({ pageSize: '500' }).success, false)
  assert.equal(sightingListQuerySchema.safeParse({ sort: 'descricao' }).success, false)
  assert.equal(
    sightingListQuerySchema.safeParse({ de: '2026-09-24T00:00:00.000Z', ate: '2026-09-01T00:00:00.000Z' }).success,
    false,
  )
})

test('dashboardStatsSchema: série de 30 dias e 4 períodos, sempre completos', () => {
  const stats = {
    total: 30,
    ultimos7Dias: { total: 9, anterior: 6, variacaoPct: 50 },
    ativosAgora: 3,
    minhaContribuicao: { total: 4, percentual: 13 },
    seriePorDia: zeros30,
    porPeriodo: [
      { periodo: 'madrugada', total: 2 },
      { periodo: 'manha', total: 8 },
      { periodo: 'tarde', total: 11 },
      { periodo: 'noite', total: 9 },
    ],
    porBairro: [{ bairro: 'Lagoa da Conceição', total: 7 }],
    topLocais: [{ rotulo: 'Joaquina', lat: -27.63, lng: -48.45, total: 5 }],
  }
  assert.equal(dashboardStatsSchema.safeParse(stats).success, true)
  assert.equal(dashboardStatsSchema.safeParse({ ...stats, seriePorDia: zeros30.slice(1) }).success, false)
  assert.equal(dashboardStatsSchema.safeParse({ ...stats, porPeriodo: stats.porPeriodo.slice(1) }).success, false)
  assert.equal(
    dashboardStatsSchema.safeParse({ ...stats, ultimos7Dias: { total: 1, anterior: 0, variacaoPct: null } }).success,
    true,
  )
})

test('teamJoinSchema: normaliza o código digitado e recusa caracteres ambíguos', () => {
  assert.equal(teamJoinSchema.parse({ codigo: ' k7m-2qa ' }).codigo, 'K7M2QA')
  assert.equal(teamJoinSchema.safeParse({ codigo: 'K7M2Q0' }).success, false) // 0 é ambíguo
  assert.equal(teamJoinSchema.safeParse({ codigo: 'K7M2' }).success, false)
})

test('teamSchema/teamMemberSchema: posição pode ser nula (membro nunca enviou)', () => {
  assert.equal(
    teamSchema.safeParse({ id: 't1', nome: 'Patrulha Leste', codigo: 'K7M2QA', liderId: 'u1', membrosCount: 3, createdAt: T })
      .success,
    true,
  )
  const membro = { userId: 'u2', nome: 'Bruno', papelNaEquipe: 'membro', entrouEm: T, ultimaPosicao: null }
  assert.equal(teamMemberSchema.safeParse(membro).success, true)
  assert.equal(
    teamMemberSchema.safeParse({ ...membro, ultimaPosicao: { lat: -27.6, lng: -48.5, precisaoM: 20, em: T } }).success,
    true,
  )
})

test('messageCreateSchema: texto 1..500, sem mensagem só de espaços', () => {
  assert.equal(messageCreateSchema.safeParse({ texto: 'Estou na trilha' }).success, true)
  assert.equal(messageCreateSchema.safeParse({ texto: '   ' }).success, false)
  assert.equal(messageCreateSchema.safeParse({ texto: 'x'.repeat(501) }).success, false)
  // Texto com "HTML" é só texto: o schema aceita, quem garante a segurança é a renderização.
  assert.equal(messageCreateSchema.safeParse({ texto: '<img src=x onerror=alert(1)>' }).success, true)
})

test('messageSchema: clientId ecoado pode ser nulo', () => {
  const msg = { id: 'm1', equipeId: 't1', autor: { id: 'u1', nome: 'Ana' }, texto: 'Oi', createdAt: T, clientId: null }
  assert.equal(messageSchema.safeParse(msg).success, true)
})

test('emergencyPlaceSchema: telefone só com dígitos e ao menos um', () => {
  const place = {
    id: 'e1',
    nome: 'Hospital Universitário',
    tipo: 'hospital',
    lat: -27.6003,
    lng: -48.5186,
    endereco: 'R. Profa. Maria Flora Pausewang, s/n — Trindade',
    telefones: [{ rotulo: 'Emergência', numero: '4837219100' }],
    horario: '24 horas',
  }
  assert.equal(emergencyPlaceSchema.safeParse(place).success, true)
  assert.equal(emergencyPlaceSchema.safeParse({ ...place, telefones: [] }).success, false)
  assert.equal(
    emergencyPlaceSchema.safeParse({ ...place, telefones: [{ rotulo: 'x', numero: '(48) 3721-9100' }] }).success,
    false,
  )
})

test('locationUpdateSchema: aceita sem precisão e recusa coordenada impossível', () => {
  assert.equal(locationUpdateSchema.parse({ lat: -27.6, lng: -48.5 }).precisaoM, null)
  assert.equal(locationUpdateSchema.safeParse({ lat: -27.6, lng: 200 }).success, false)
})
