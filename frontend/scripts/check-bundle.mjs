/**
 * Confere o build em dist/ (roda depois do `vite build`). Reprova (exit 1) se:
 *
 *  1. ORÇAMENTO: a entrada inicial (o JS que o index.html carrega + tudo que ele importa de
 *     forma estática) passar de 200 kB gzip.
 *  2. ROTAS: a entrada puxar GSAP, Recharts ou Leaflet; a cena/intro puxar Recharts ou Leaflet;
 *     alguma tela do app (src/pages/*, exceto a cena) puxar o GSAP da cena.
 *  3. MOCK: o build de produção (VITE_USE_MOCK diferente de "true") contiver código de src/mocks/.
 *  4. Algum arquivo JS passar de 500 kB, ou as fontes não forem exatamente 5 woff2.
 *
 * "Puxar" = estar no fecho de imports ESTÁTICOS da rota, lido do dist/.vite/manifest.json.
 * Import dinâmico (lazy) não conta: é justamente o que carrega só quando precisa.
 *
 * Uso: node scripts/check-bundle.mjs [pasta]   (padrão: dist)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const TETO_ENTRADA_GZIP = 200 * 1024
const TETO_ARQUIVO = 500 * 1024

const pasta = process.argv[2] ?? 'dist'
const modoMock = process.env.VITE_USE_MOCK === 'true'
const assets = join(pasta, 'assets')
const manifest = JSON.parse(readFileSync(join(pasta, '.vite', 'manifest.json'), 'utf8'))
const erros = []
const kb = (n) => `${(n / 1024).toFixed(1)} kB`

const tamanhoGzip = new Map()
const gzip = (arquivo) => {
  if (!tamanhoGzip.has(arquivo)) tamanhoGzip.set(arquivo, gzipSync(readFileSync(join(pasta, arquivo))).length)
  return tamanhoGzip.get(arquivo)
}

/** Fecho de imports estáticos a partir de uma chave do manifesto (inclui ela mesma). */
function fecho(chave, vistos = new Set()) {
  if (vistos.has(chave)) return vistos
  vistos.add(chave)
  for (const i of manifest[chave]?.imports ?? []) fecho(i, vistos)
  return vistos
}
/** Nome legível do pedaço: o grupo do codeSplitting (react, gsap...) ou o arquivo-fonte. */
const nomeDe = (chave) => manifest[chave].name ?? chave
const bibliotecas = (chaves) => new Set([...chaves].map(nomeDe))

// ---------------------------------------------------------------- 1. entrada inicial
const [chaveEntrada] = Object.entries(manifest).find(([, v]) => v.isEntry)
const entrada = fecho(chaveEntrada)
const gzipEntrada = [...entrada].reduce((soma, c) => soma + gzip(manifest[c].file), 0)
if (!modoMock && gzipEntrada > TETO_ENTRADA_GZIP) {
  erros.push(`entrada inicial com ${kb(gzipEntrada)} gzip (teto ${kb(TETO_ENTRADA_GZIP)}): ${[...bibliotecas(entrada)].join(', ')}`)
}

// ----------------------------------------------------------------------- 2. rotas
const proibir = (rotulo, chaves, nomes) => {
  const presentes = nomes.filter((n) => bibliotecas(chaves).has(n))
  if (presentes.length) erros.push(`${rotulo} carrega ${presentes.join(', ')} (proibido)`)
}
proibir('a entrada inicial', entrada, ['gsap', 'recharts', 'leaflet'])

const rotas = Object.entries(manifest).filter(([k, v]) => v.isDynamicEntry && k.startsWith('src/pages/'))
const linhasRotas = []
for (const [chave] of rotas) {
  const f = fecho(chave)
  // Só o que a rota acrescenta além da entrada (o resto já está carregado).
  const extra = [...f].filter((c) => !entrada.has(c))
  const gz = extra.reduce((soma, c) => soma + gzip(manifest[c].file), 0)
  linhasRotas.push(`  ${chave.replace('src/pages/', '').padEnd(28)} +${kb(gz).padStart(9)}  ${[...bibliotecas(extra)].filter((n) => !n.startsWith('src/')).join(', ')}`)
  if (chave === 'src/pages/SceneScreen.jsx') proibir('a cena/intro', f, ['recharts', 'leaflet'])
  else proibir(chave, f, ['gsap'])
}

// ----------------------------------------------------------- 3 e 4. mock, tamanhos, fontes
const MARCAS_DO_MOCK = ['setupWorker', 'Servidor simulado', 'SERVIDOR SIMULADO', 'Usuária de Teste']
const js = readdirSync(assets).filter((f) => f.endsWith('.js'))
let total = 0
let totalGzip = 0
for (const f of js) {
  const conteudo = readFileSync(join(assets, f))
  total += conteudo.length
  totalGzip += gzip(`assets/${f}`)
  if (conteudo.length > TETO_ARQUIVO) erros.push(`${f} tem ${kb(conteudo.length)} (limite ${kb(TETO_ARQUIVO)})`)
  if (!modoMock) {
    const achadas = MARCAS_DO_MOCK.filter((m) => conteudo.includes(m))
    if (achadas.length) erros.push(`${f} contém código do mock (${achadas.join(', ')})`)
  }
}
const fontes = readdirSync(assets).filter((f) => /\.(woff2?|ttf|otf)$/.test(f))
if (fontes.length !== 5 || fontes.some((f) => !f.endsWith('.woff2'))) {
  erros.push(`esperava 5 fontes woff2, achei ${fontes.length}: ${fontes.join(', ')}`)
}

// ------------------------------------------------------------------------- relatório
console.log(`Build ${modoMock ? 'COM mock' : 'de produção (sem mock)'}: ${js.length} arquivos JS, ${kb(total)} (${kb(totalGzip)} gzip)`)
console.log(`Entrada inicial: ${kb(gzipEntrada)} gzip de ${kb(TETO_ENTRADA_GZIP)} — ${[...bibliotecas(entrada)].join(', ')}`)
console.log('Rotas (carregadas sob demanda, acréscimo sobre a entrada):')
console.log(linhasRotas.sort().join('\n'))
console.log(`Fontes: ${fontes.length} woff2 (${kb(fontes.reduce((s, f) => s + statSync(join(assets, f)).size, 0))})`)

if (erros.length) {
  for (const e of erros) console.error(`✖ ${e}`)
  process.exit(1)
}
console.log(modoMock ? '✔ Build de demonstração conferido.' : '✔ Orçamento, divisão por rota e ausência do mock conferidos.')
