/**
 * Dados iniciais do servidor simulado — Florianópolis.
 *
 * Tudo é gerado RELATIVO ao "agora" do servidor no momento em que o mock sobe: sempre existem
 * avistamentos de 12, 35 e 52 min atrás (RF04 "Recente"), de 75 e 105 min ("1–2 h") e o resto
 * espalhado pelos últimos ~28 dias (gráfico de 30 dias do dashboard).
 *
 * Determinístico: usa um gerador pseudoaleatório com semente fixa, então os mesmos bairros,
 * autores e textos aparecem em toda recarga (bom para capturas de tela e testes e2e).
 */

/** Gerador pseudoaleatório "mulberry32" — pequeno, rápido e reproduzível pela semente. */
export function criarAleatorio(semente) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MIN = 60 * 1000

/** Centro aproximado dos bairros usados nos dados simulados (só o mock precisa disto). */
export const CENTROS = {
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

// Bairros com mais "atividade" aparecem mais vezes (dá forma ao gráfico por bairro).
const BAIRROS_PONDERADOS = [
  'Lagoa da Conceição', 'Lagoa da Conceição', 'Lagoa da Conceição', 'Lagoa da Conceição',
  'Joaquina', 'Joaquina', 'Joaquina', 'Campeche', 'Campeche', 'Campeche', 'Rio Vermelho',
  'Rio Vermelho', 'Barra da Lagoa', 'Barra da Lagoa', 'Ingleses', 'Santinho', 'Canasvieiras',
  'Jurerê', 'Santo Antônio de Lisboa', 'Rio Tavares', 'Armação', 'Pântano do Sul',
  'Ribeirão da Ilha', 'Itacorubi', 'Córrego Grande', 'Trindade', 'Centro', 'Estreito',
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
  'Algo grande observando da borda da mata, depois sumiu.',
  'Marcas de arranhão no tronco de uma figueira.',
  'Pedras empilhadas no meio da trilha, que não estavam lá ontem.',
  '',
  '',
]

/** Idade (em minutos) de cada avistamento semeado — ver o comentário do topo. */
const IDADES_MIN = [
  12, 35, 52, 75, 105, 170, 260, 400, 610, 900, 1300, 1700, 2300, 2900, 3600, 4400, 5200, 6100,
  7000, 8200, 9500, 11000, 12800, 14500, 16500, 18700, 21000, 24000, 27500, 31000, 35000, 40000,
]

export const USUARIO_DEMO_ID = 'u_teste'

export function gerarSeed(agoraMs) {
  const rnd = criarAleatorio(42)
  const escolher = (lista) => lista[Math.floor(rnd() * lista.length)]
  const iso = (ms) => new Date(ms).toISOString()
  const criadoEmConta = iso(agoraMs - 60 * 24 * 60 * MIN)

  // A usuária demo usa a MESMA credencial semeada no mock congelado do login
  // (auth/mockApi.js): quem entra com usada@example.com vê o nome dela no app.
  const usuarios = [
    { id: USUARIO_DEMO_ID, nome: 'Usuária de Teste', email: 'usada@example.com', senha: 'Abcdefg1', cpf: '11144477735', papel: 'usuario' },
    { id: 'u_bruno', nome: 'Bruno Lima', email: 'bruno@example.com', senha: 'Abcdefg1', cpf: '52998224725', papel: 'usuario' },
    { id: 'u_carla', nome: 'Carla Menezes', email: 'carla@example.com', senha: 'Abcdefg1', cpf: '00000000191', papel: 'admin' },
    { id: 'u_diego', nome: 'Diego Martins', email: 'diego@example.com', senha: 'Abcdefg1', cpf: '00000000272', papel: 'usuario' },
    { id: 'u_elisa', nome: 'Elisa Farias', email: 'elisa@example.com', senha: 'Abcdefg1', cpf: '00000000353', papel: 'usuario' },
    { id: 'u_felipe', nome: 'Felipe Costa', email: 'felipe@example.com', senha: 'Abcdefg1', cpf: '00000000434', papel: 'usuario' },
  ].map((u) => ({ ...u, createdAt: criadoEmConta }))

  // Autoria fixa em alguns índices: a demo tem avistamentos próprios (inclusive um recente,
  // para demonstrar editar/excluir) e a admin também.
  const AUTOR_FIXO = { 0: USUARIO_DEMO_ID, 4: USUARIO_DEMO_ID, 9: USUARIO_DEMO_ID, 15: USUARIO_DEMO_ID, 22: USUARIO_DEMO_ID, 2: 'u_carla', 11: 'u_carla' }
  const OUTROS = ['u_bruno', 'u_diego', 'u_elisa', 'u_felipe']

  const avistamentos = IDADES_MIN.map((idade, i) => {
    const bairro = escolher(BAIRROS_PONDERADOS)
    const [lat, lng] = CENTROS[bairro]
    const vistoMs = agoraMs - idade * MIN
    const gps = rnd() > 0.25
    const editado = i % 7 === 3
    return {
      id: `s_${String(i + 1).padStart(3, '0')}`,
      autorId: AUTOR_FIXO[i] ?? escolher(OUTROS),
      descricao: escolher(DESCRICOES),
      bairro,
      // ±0,006° ≈ ±600 m em volta do centro do bairro.
      lat: Number((lat + (rnd() - 0.5) * 0.012).toFixed(5)),
      lng: Number((lng + (rnd() - 0.5) * 0.012).toFixed(5)),
      origemLocal: gps ? 'gps' : 'manual',
      precisaoM: gps ? Math.round(8 + rnd() * 32) : null,
      vistoEm: iso(vistoMs),
      createdAt: iso(vistoMs),
      updatedAt: iso(editado ? vistoMs + 10 * MIN : vistoMs),
      deletedAt: null,
      excluidoPor: null,
    }
  })

  // Um item já excluído (exclusão lógica): não pode aparecer em nenhuma lista nem no dashboard.
  avistamentos.push({
    ...avistamentos[5],
    id: 's_900',
    descricao: 'Registro duplicado (excluído).',
    deletedAt: iso(agoraMs - 100 * MIN),
    excluidoPor: 'u_carla',
  })

  const equipes = [
    { id: 't_lagoa', nome: 'Patrulha da Lagoa', codigo: 'K7M2QA', liderId: USUARIO_DEMO_ID, createdAt: iso(agoraMs - 20 * 24 * 60 * MIN) },
    { id: 't_norte', nome: 'Vigias do Norte', codigo: 'N4RT3X', liderId: 'u_diego', createdAt: iso(agoraMs - 12 * 24 * 60 * MIN) },
  ]

  const membros = [
    { equipeId: 't_lagoa', userId: USUARIO_DEMO_ID, entrouEm: iso(agoraMs - 20 * 24 * 60 * MIN) },
    { equipeId: 't_lagoa', userId: 'u_bruno', entrouEm: iso(agoraMs - 19 * 24 * 60 * MIN) },
    { equipeId: 't_lagoa', userId: 'u_carla', entrouEm: iso(agoraMs - 15 * 24 * 60 * MIN) },
    { equipeId: 't_norte', userId: 'u_diego', entrouEm: iso(agoraMs - 12 * 24 * 60 * MIN) },
    { equipeId: 't_norte', userId: 'u_felipe', entrouEm: iso(agoraMs - 11 * 24 * 60 * MIN) },
  ]

  const posicoes = {
    u_bruno: { lat: -27.6012, lng: -48.4731, precisaoM: 18, em: iso(agoraMs - 2 * MIN) },
    u_carla: { lat: -27.5889, lng: -48.5236, precisaoM: 35, em: iso(agoraMs - 25 * MIN) },
    u_diego: { lat: -27.4371, lng: -48.4602, precisaoM: 12, em: iso(agoraMs - 6 * MIN) },
  }

  const falas = [
    ['u_bruno', 1560, 'Bom dia, pessoal! Alguém vai fazer a ronda da Joaquina hoje?'],
    [USUARIO_DEMO_ID, 1552, 'Eu vou no fim da tarde.'],
    ['u_carla', 1500, 'Lembrem de registrar o bairro certinho no avistamento.'],
    ['u_bruno', 1320, 'Achei pegadas perto das dunas, já registrei.'],
    [USUARIO_DEMO_ID, 1318, 'Vi agora no mapa, a área ainda está vermelha.'],
    ['u_carla', 900, 'Movimento estranho na trilha do Lagoinha ontem à noite.'],
    ['u_bruno', 600, 'Isso aqui aparece como texto mesmo? <b>teste</b>'],
    [USUARIO_DEMO_ID, 598, 'Aparece sim, sem formatação. Tudo certo.'],
    ['u_carla', 240, 'Nova área perto do Rio Vermelho.'],
    ['u_bruno', 120, 'Estou indo para a Lagoa agora.'],
    ['u_bruno', 58, 'Ouvi um uivo longo aqui perto do canal.'],
    [USUARIO_DEMO_ID, 50, 'Cuidado! Manda a posição quando chegar.'],
    ['u_bruno', 3, 'Cheguei. Tudo calmo por enquanto.'],
  ]
  const mensagens = falas.map(([autorId, minAtras, texto], i) => ({
    id: `m_${String(i + 1).padStart(4, '0')}`,
    equipeId: 't_lagoa',
    autorId,
    texto,
    createdAt: iso(agoraMs - minAtras * MIN),
    clientId: null,
  }))

  // Telefones: só os números públicos de emergência (190, 192, 193, 199) — nada inventado
  // que possa ser o telefone de alguém de verdade. Endereços são aproximados (dados simulados).
  const locais = [
    ['e_01', 'Hospital Universitário (HU-UFSC)', 'hospital', -27.6003, -48.5186, 'R. Profa. Maria Flora Pausewang, s/n — Trindade', [['SAMU', '192']], '24 horas'],
    ['e_02', 'Hospital Governador Celso Ramos', 'hospital', -27.5923, -48.5566, 'R. Irmã Benwarda, 297 — Centro', [['SAMU', '192']], '24 horas'],
    ['e_03', 'UPA Norte da Ilha', 'hospital', -27.4386, -48.4666, 'Canasvieiras', [['SAMU', '192']], '24 horas'],
    ['e_04', 'UPA Sul da Ilha', 'hospital', -27.6517, -48.497, 'Rio Tavares', [['SAMU', '192']], '24 horas'],
    ['e_05', 'Polícia Militar — Centro', 'policia', -27.5969, -48.5495, 'Centro', [['Polícia Militar', '190']], '24 horas'],
    ['e_06', 'Polícia Militar — Lagoa da Conceição', 'policia', -27.6049, -48.4676, 'Lagoa da Conceição', [['Polícia Militar', '190']], '24 horas'],
    ['e_07', 'Corpo de Bombeiros — Centro', 'bombeiros', -27.5941, -48.5452, 'Centro', [['Bombeiros', '193']], '24 horas'],
    ['e_08', 'Corpo de Bombeiros — Canasvieiras', 'bombeiros', -27.4302, -48.4588, 'Canasvieiras', [['Bombeiros', '193']], '24 horas'],
    ['e_09', 'Defesa Civil de Florianópolis', 'defesa_civil', -27.5935, -48.5512, 'Centro', [['Defesa Civil', '199']], 'Plantão 24 horas pelo 199'],
    ['e_10', 'Abrigo temporário — Campeche', 'abrigo', -27.6755, -48.4862, 'Campeche', [['Defesa Civil', '199']], 'Aberto em alertas da Defesa Civil'],
  ].map(([id, nome, tipo, lat, lng, endereco, tels, horario]) => ({
    id,
    nome,
    tipo,
    lat,
    lng,
    endereco,
    telefones: tels.map(([rotulo, numero]) => ({ rotulo, numero })),
    horario,
  }))

  return { usuarios, avistamentos, equipes, membros, posicoes, mensagens, locais }
}
