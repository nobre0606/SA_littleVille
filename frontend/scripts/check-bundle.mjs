/**
 * Confere o build em dist/ (roda depois do `vite build`):
 *  - Build de produção (VITE_USE_MOCK diferente de "true"): NENHUM código do servidor simulado
 *    pode estar no bundle (regra de fronteira 3 — docs/DECISOES.md).
 *  - Nenhum arquivo JS acima de 500 kB.
 *  - Exatamente 5 arquivos de fonte, todos woff2.
 * Imprime o tamanho total para comparar os dois modos.
 *
 * Uso: node scripts/check-bundle.mjs [pasta]   (padrão: dist)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const pasta = process.argv[2] ?? 'dist'
const modoMock = process.env.VITE_USE_MOCK === 'true'
const assets = join(pasta, 'assets')
const arquivos = readdirSync(assets)
const js = arquivos.filter((f) => f.endsWith('.js'))
const erros = []

// Marcas que só existem no código de src/mocks/ (MSW, banco simulado, painel de debug).
const MARCAS_DO_MOCK = ['setupWorker', 'Servidor simulado', 'SERVIDOR SIMULADO', 'Usuária de Teste', 'lv:mock']

let total = 0
let totalGzip = 0
for (const f of js) {
  const conteudo = readFileSync(join(assets, f))
  total += conteudo.length
  totalGzip += gzipSync(conteudo).length
  if (conteudo.length > 500 * 1024) erros.push(`${f} tem ${Math.round(conteudo.length / 1024)} kB (limite 500 kB)`)
  if (!modoMock) {
    const texto = conteudo.toString('utf8')
    const achadas = MARCAS_DO_MOCK.filter((m) => texto.includes(m))
    if (achadas.length) erros.push(`${f} contém código do mock (${achadas.join(', ')})`)
  }
}

const fontes = arquivos.filter((f) => /\.(woff2?|ttf|otf)$/.test(f))
if (fontes.length !== 5 || fontes.some((f) => !f.endsWith('.woff2'))) {
  erros.push(`esperava 5 fontes woff2, achei ${fontes.length}: ${fontes.join(', ')}`)
}

const kb = (n) => `${Math.round(n / 1024)} kB`
console.log(`Build ${modoMock ? 'COM mock' : 'de produção (sem mock)'}: ${js.length} arquivos JS, ${kb(total)} (${kb(totalGzip)} gzip), ${fontes.length} fontes woff2 (${kb(fontes.reduce((s, f) => s + statSync(join(assets, f)).size, 0))})`)

if (erros.length) {
  for (const e of erros) console.error(`✖ ${e}`)
  process.exit(1)
}
console.log(modoMock ? '✔ Build de demonstração conferido.' : '✔ Nenhum código do mock no bundle de produção.')
