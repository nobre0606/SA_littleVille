/**
 * Dados iniciais do banco (npm run db:seed). Pode rodar de novo: apaga tudo e recria.
 *
 * - 1 admin e 3 usuários comuns, todos com a senha Abcdefg1 (hash bcrypt cost 12).
 *   A "Usuária de Teste" usa a MESMA credencial do login de demonstração do front
 *   (usada@example.com), para o front funcionar igual com o mock e com a API real.
 * - 30 avistamentos em Florianópolis com horários RELATIVOS a agora: sempre há um de menos de
 *   1 h, um entre 1 e 2 h e vários antigos — os 3 estados do RF04 aparecem no mapa.
 *   Mais 1 já excluído (exclusão lógica), que não pode aparecer em lugar nenhum.
 * - 2 equipes e uma conversa já iniciada entre 3 pessoas.
 * - Locais de emergência de Florianópolis com os números públicos (190, 192, 193, 199).
 *
 * Determinístico (gerador com semente fixa): os mesmos bairros e textos a cada execução.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const MIN = 60 * 1000
const DIA = 24 * 60 * MIN
const agora = Date.now()
const haMin = (m) => new Date(agora - m * MIN)

/** Gerador pseudoaleatório "mulberry32": reproduzível pela semente. */
function criarAleatorio(semente) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = criarAleatorio(42)
const escolher = (lista) => lista[Math.floor(rnd() * lista.length)]

/** CPF válido a partir de 9 dígitos (calcula os 2 verificadores) — só para dados de teste. */
function cpfValido(nove) {
  const d = nove.split('').map(Number)
  const digito = (nums, peso) => {
    const r = nums.reduce((s, n, i) => s + n * (peso - i), 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  d.push(digito(d, 10))
  d.push(digito(d, 11))
  return d.join('')
}

// Centro aproximado dos bairros usados nos avistamentos.
const CENTROS = {
  Centro: [-27.5954, -48.548],
  Trindade: [-27.588, -48.522],
  'Lagoa da Conceição': [-27.603, -48.468],
  Joaquina: [-27.629, -48.449],
  Campeche: [-27.678, -48.487],
  'Barra da Lagoa': [-27.574, -48.423],
  Ingleses: [-27.435, -48.396],
  Canasvieiras: [-27.428, -48.461],
  Jurerê: [-27.44, -48.498],
  'Santo Antônio de Lisboa': [-27.507, -48.519],
  'Rio Tavares': [-27.642, -48.493],
  Armação: [-27.749, -48.505],
  'Pântano do Sul': [-27.78, -48.508],
  'Ribeirão da Ilha': [-27.714, -48.562],
  Itacorubi: [-27.587, -48.498],
  'Córrego Grande': [-27.6, -48.505],
  Estreito: [-27.592, -48.585],
  Santinho: [-27.46, -48.383],
  'Rio Vermelho': [-27.496, -48.419],
}
const BAIRROS_PONDERADOS = [
  'Lagoa da Conceição', 'Lagoa da Conceição', 'Lagoa da Conceição', 'Joaquina', 'Joaquina', 'Campeche',
  'Campeche', 'Rio Vermelho', 'Barra da Lagoa', 'Ingleses', 'Santinho', 'Canasvieiras', 'Jurerê',
  'Santo Antônio de Lisboa', 'Rio Tavares', 'Armação', 'Pântano do Sul', 'Ribeirão da Ilha', 'Itacorubi',
  'Córrego Grande', 'Trindade', 'Centro', 'Estreito',
]
const DESCRICOES = [
  'Pegadas enormes na areia, indo em direção às dunas.',
  'Vulto branco atravessando a trilha perto do costão.',
  'Uivo longo vindo da mata, ouvido por três pessoas.',
  'Galhos quebrados a mais de dois metros de altura.',
  'Tufos de pelo branco presos na cerca do terreno.',
  'Cheiro forte e passos pesados perto do riacho.',
  'Silhueta enorme na neblina da madrugada.',
  'Latas de lixo reviradas e pegadas de uns 40 cm.',
  'Pescadores contam de uma figura alta na beira da lagoa.',
  'Marcas de arranhão no tronco de uma figueira.',
  '',
]
// Idade (min) de cada avistamento: 12/35/52 → "Recente"; 75/105 → "1–2 h"; o resto → "Antigo".
const IDADES_MIN = [
  12, 35, 52, 75, 105, 170, 260, 400, 610, 900, 1300, 1700, 2300, 2900, 3600, 4400, 5200, 6100,
  7000, 8200, 9500, 11000, 12800, 14500, 16500, 18700, 21000, 24000, 27500, 31000,
]

async function main() {
  // Ordem de limpeza respeita as chaves estrangeiras.
  await prisma.message.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.sighting.deleteMany()
  await prisma.emergencyPlace.deleteMany()
  await prisma.user.deleteMany()

  const senhaHash = await bcrypt.hash('Abcdefg1', 12)
  const pessoa = (nome, email, cpfNove, papel = 'USER') => ({
    nome,
    email,
    senhaHash,
    cpf: cpfValido(cpfNove),
    telefone: '48999990000',
    cep: '88062300',
    numero: '100',
    rua: 'Rua das Rendeiras',
    bairro: 'Lagoa da Conceição',
    papel,
    consentimentoLgpdEm: new Date(agora - 60 * DIA),
    createdAt: new Date(agora - 60 * DIA),
  })

  const [teste, bruno, carla, diego] = await Promise.all([
    prisma.user.create({ data: pessoa('Usuária de Teste', 'usada@example.com', '111444777') }),
    prisma.user.create({ data: pessoa('Bruno Lima', 'bruno@example.com', '529982247') }),
    prisma.user.create({ data: pessoa('Carla Menezes', 'carla@example.com', '248438034', 'ADMIN') }),
    prisma.user.create({ data: pessoa('Diego Martins', 'diego@example.com', '936521840') }),
  ])

  // Autoria: a Usuária de Teste tem avistamentos próprios (inclusive o mais recente, para
  // demonstrar editar/excluir); a admin também; o resto se espalha entre Bruno e Diego.
  const AUTOR_FIXO = { 0: teste.id, 4: teste.id, 9: teste.id, 15: teste.id, 22: teste.id, 2: carla.id, 11: carla.id }
  const avistamentos = IDADES_MIN.map((idade, i) => {
    const bairro = escolher(BAIRROS_PONDERADOS)
    const [lat, lng] = CENTROS[bairro]
    const gps = rnd() > 0.25
    const visto = haMin(idade)
    return {
      autorId: AUTOR_FIXO[i] ?? escolher([bruno.id, diego.id]),
      latitude: Number((lat + (rnd() - 0.5) * 0.012).toFixed(5)),
      longitude: Number((lng + (rnd() - 0.5) * 0.012).toFixed(5)),
      bairro,
      descricao: escolher(DESCRICOES),
      origemLocal: gps ? 'GPS' : 'MANUAL',
      precisaoM: gps ? Math.round(8 + rnd() * 32) : null,
      vistoEm: visto,
      createdAt: visto,
      updatedAt: visto,
    }
  })
  // Um já excluído (exclusão lógica): fica no banco, mas não aparece em lista nem dashboard.
  avistamentos.push({ ...avistamentos[5], descricao: 'Registro duplicado (excluído).', deletedAt: haMin(100), excluidoPorId: carla.id })
  await prisma.sighting.createMany({ data: avistamentos })

  const lagoa = await prisma.team.create({
    data: { nome: 'Patrulha da Lagoa', codigo: 'K7M2QA', liderId: teste.id, createdAt: new Date(agora - 20 * DIA) },
  })
  const norte = await prisma.team.create({
    data: { nome: 'Vigias do Norte', codigo: 'N4RT3X', liderId: diego.id, createdAt: new Date(agora - 12 * DIA) },
  })
  await prisma.teamMember.createMany({
    data: [
      { teamId: lagoa.id, userId: teste.id, entrouEm: new Date(agora - 20 * DIA) },
      { teamId: lagoa.id, userId: bruno.id, entrouEm: new Date(agora - 19 * DIA) },
      { teamId: lagoa.id, userId: carla.id, entrouEm: new Date(agora - 15 * DIA) },
      { teamId: norte.id, userId: diego.id, entrouEm: new Date(agora - 12 * DIA) },
    ],
  })

  // Últimas posições (aparecem no mapa para a equipe).
  await prisma.user.update({ where: { id: bruno.id }, data: { posicaoLat: -27.6012, posicaoLng: -48.4731, posicaoPrecisaoM: 18, posicaoEm: haMin(2) } })
  await prisma.user.update({ where: { id: carla.id }, data: { posicaoLat: -27.5889, posicaoLng: -48.5236, posicaoPrecisaoM: 35, posicaoEm: haMin(25) } })
  await prisma.user.update({ where: { id: diego.id }, data: { posicaoLat: -27.4371, posicaoLng: -48.4602, posicaoPrecisaoM: 12, posicaoEm: haMin(6) } })

  // Conversa já iniciada entre 3 pessoas (para o chat não abrir vazio na apresentação).
  const falas = [
    [bruno, 1560, 'Bom dia, pessoal! Alguém vai fazer a ronda da Joaquina hoje?'],
    [teste, 1552, 'Eu vou no fim da tarde.'],
    [carla, 1500, 'Lembrem de registrar o bairro certinho no avistamento.'],
    [bruno, 1320, 'Achei pegadas perto das dunas, já registrei.'],
    [teste, 1318, 'Vi agora no mapa, a área ainda está vermelha.'],
    [carla, 900, 'Movimento estranho na trilha do Lagoinha ontem à noite.'],
    [carla, 240, 'Nova área perto do Rio Vermelho.'],
    [bruno, 120, 'Estou indo para a Lagoa agora.'],
    [bruno, 58, 'Ouvi um uivo longo aqui perto do canal.'],
    [teste, 50, 'Cuidado! Manda a posição quando chegar.'],
    [bruno, 3, 'Cheguei. Tudo calmo por enquanto.'],
  ]
  await prisma.message.createMany({
    data: falas.map(([autor, minAtras, texto]) => ({ teamId: lagoa.id, autorId: autor.id, texto, createdAt: haMin(minAtras) })),
  })

  // Locais de emergência de Florianópolis. Telefones: só os números PÚBLICOS de emergência.
  // Coordenadas e endereços aproximados.
  const local = (nome, tipo, lat, lng, endereco, rotulo, numero, horario = '24 horas') => ({
    nome,
    tipo,
    latitude: lat,
    longitude: lng,
    endereco,
    telefones: [{ rotulo, numero }],
    horario,
  })
  await prisma.emergencyPlace.createMany({
    data: [
      local('Hospital Universitário (HU-UFSC)', 'HOSPITAL', -27.6003, -48.5186, 'R. Profa. Maria Flora Pausewang, s/n — Trindade', 'SAMU', '192'),
      local('Hospital Governador Celso Ramos', 'HOSPITAL', -27.5923, -48.5566, 'R. Irmã Benwarda, 297 — Centro', 'SAMU', '192'),
      local('UPA Norte da Ilha', 'HOSPITAL', -27.4386, -48.4666, 'Canasvieiras', 'SAMU', '192'),
      local('UPA Sul da Ilha', 'HOSPITAL', -27.6517, -48.497, 'Rio Tavares', 'SAMU', '192'),
      local('Polícia Militar — Centro', 'POLICIA', -27.5969, -48.5495, 'Centro', 'Polícia Militar', '190'),
      local('Polícia Militar — Lagoa da Conceição', 'POLICIA', -27.6049, -48.4676, 'Lagoa da Conceição', 'Polícia Militar', '190'),
      local('Corpo de Bombeiros — Centro', 'BOMBEIROS', -27.5941, -48.5452, 'Centro', 'Bombeiros', '193'),
      local('Corpo de Bombeiros — Canasvieiras', 'BOMBEIROS', -27.4302, -48.4588, 'Canasvieiras', 'Bombeiros', '193'),
      local('Defesa Civil de Florianópolis', 'DEFESA_CIVIL', -27.5935, -48.5512, 'Centro', 'Defesa Civil', '199', 'Plantão 24 horas pelo 199'),
      local('Abrigo temporário — Campeche', 'ABRIGO', -27.6755, -48.4862, 'Campeche', 'Defesa Civil', '199', 'Aberto em alertas da Defesa Civil'),
    ],
  })

  const [u, s, t, m, e] = await Promise.all([
    prisma.user.count(),
    prisma.sighting.count({ where: { deletedAt: null } }),
    prisma.team.count(),
    prisma.message.count(),
    prisma.emergencyPlace.count(),
  ])
  console.log(`✔ Seed: ${u} usuários, ${s} avistamentos ativos (+1 excluído), ${t} equipes, ${m} mensagens, ${e} locais de emergência.`)
}

main()
  .catch((erro) => {
    console.error('✖ Seed falhou:', erro.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
