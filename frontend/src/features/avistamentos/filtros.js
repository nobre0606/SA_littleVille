import { SIGHTING_SORTS } from 'shared/constantes'

/**
 * Filtros da lista de avistamentos. Moram na URL (?q=&periodo=&autor=&sort=&page=): o link é
 * compartilhável, o "voltar" do navegador desfaz um filtro e recarregar mantém a tela.
 *
 * IMPORTANTE: aqui só se TRADUZ a URL em parâmetros da API. Quem filtra, ordena e pagina é o
 * servidor (GET /api/sightings) — a tela nunca recebe a lista inteira para filtrar sozinha.
 */

export const TAMANHO_PAGINA = 10

export const PERIODOS = [
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
]

export const AUTORES = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'me', rotulo: 'Meus' },
]

/** Rótulos da ordenação para o select do mobile (no desktop, o cabeçalho da tabela ordena). */
export const ORDENACOES = [
  { valor: '-vistoEm', rotulo: 'Mais recentes' },
  { valor: 'vistoEm', rotulo: 'Mais antigos' },
  { valor: 'bairro', rotulo: 'Bairro (A–Z)' },
  { valor: '-bairro', rotulo: 'Bairro (Z–A)' },
  { valor: 'autor', rotulo: 'Autor (A–Z)' },
  { valor: '-autor', rotulo: 'Autor (Z–A)' },
]

export const PADRAO = { q: '', periodo: 'tudo', autor: 'todos', sort: '-vistoEm', page: 1 }

const PERIODOS_VALIDOS = new Set(PERIODOS.map((p) => p.valor))

/** URL → filtros. Valor inválido na URL (editado à mão) vira o padrão, nunca erro. */
export function lerFiltros(params) {
  const page = Number.parseInt(params.get('page') ?? '', 10)
  const periodo = params.get('periodo')
  const sort = params.get('sort')
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    periodo: PERIODOS_VALIDOS.has(periodo) ? periodo : PADRAO.periodo,
    autor: params.get('autor') === 'me' ? 'me' : 'todos',
    sort: SIGHTING_SORTS.includes(sort) ? sort : PADRAO.sort,
    page: Number.isFinite(page) && page >= 1 ? page : 1,
  }
}

/** Filtros → URL, omitindo o que é padrão (URL curta e legível). */
export function paraUrl(filtros) {
  const p = new URLSearchParams()
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== PADRAO[chave] && valor !== '' && valor !== undefined) p.set(chave, String(valor))
  }
  return p
}

/**
 * Começo do dia de hoje em Florianópolis, em ms UTC, a partir do "agora" do SERVIDOR.
 * Lê a hora local de SP pelo Intl (sem supor o fuso) e volta até a meia-noite.
 */
const fmtSP = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
export function inicioDoDiaSP(agoraMs) {
  const [h, m, s] = fmtSP.format(agoraMs).split(':').map(Number)
  return agoraMs - ((h * 60 + m) * 60 + s) * 1000 - (agoraMs % 1000)
}

const DIA = 24 * 60 * 60 * 1000

/** Filtros → query string da API (contrato §4). O período vira `de` com a hora do servidor. */
export function paraApi(filtros, agoraMs) {
  let de
  if (filtros.periodo === 'hoje') de = inicioDoDiaSP(agoraMs)
  if (filtros.periodo === '7d') de = agoraMs - 7 * DIA
  if (filtros.periodo === '30d') de = agoraMs - 30 * DIA
  return {
    q: filtros.q.trim() || undefined,
    autor: filtros.autor === 'me' ? 'me' : undefined,
    de: de === undefined ? undefined : new Date(de).toISOString(),
    sort: filtros.sort,
    page: filtros.page,
    pageSize: TAMANHO_PAGINA,
  }
}

/**
 * Clique no cabeçalho da tabela: mesma coluna inverte; coluna nova começa no sentido "natural"
 * (data: mais recente primeiro; texto: A–Z).
 */
export function alternarOrdem(sortAtual, campo) {
  const atual = sortAtual.replace('-', '')
  if (atual === campo) return sortAtual.startsWith('-') ? campo : `-${campo}`
  return campo === 'vistoEm' ? '-vistoEm' : campo
}

/** "-bairro" → { campo: 'bairro', direcao: 'desc' } (formato do componente Tabela). */
export const ordenacaoDaTabela = (sort) => ({ campo: sort.replace('-', ''), direcao: sort.startsWith('-') ? 'desc' : 'asc' })

/** Há algum filtro além do padrão? (para o estado vazio dizer "nenhum resultado para o filtro"). */
export const temFiltro = (f) => f.q !== '' || f.periodo !== 'tudo' || f.autor !== 'todos'
