/**
 * Varredura do sistema visual (definição de pronto, item 6). Reprova (exit 1) se achar:
 *
 *  1. Hexadecimal fora de src/theme/tokens.css.
 *     Exceção: arquivos que o navegador lê ANTES do CSS (index.html, manifest, favicon) não têm
 *     como usar var(--token). Neles o hex é permitido SÓ se for igual a um valor do tokens.css.
 *  2. Espaçamento fora da escala 4/8/12/16/24/32/48/64/96 (p-5, gap-7, mt-[13px]...).
 *  3. Tamanho de texto ou peso de fonte fora do sistema (text-[15px], font-medium...).
 *  4. Emoji, SVG solto no JSX ou biblioteca de ícones que não seja o lucide.
 *
 * Arquivos CONGELADOS (cena, intro, login/cadastro) ficam de fora: são anteriores ao sistema
 * visual e não podem ser alterados.
 *
 * Uso: node scripts/check-design.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const TOKENS = 'src/theme/tokens.css'
const CONGELADOS = ['src/auth/', 'src/scene/', 'src/intro/', 'src/pages/SceneScreen.jsx']
const LEITURA_ANTES_DO_CSS = ['index.html', 'public/manifest.webmanifest', 'public/favicon.svg']

const rel = (p) => relative(RAIZ, p).split(sep).join('/')

function listar(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const p = join(dir, nome)
    return statSync(p).isDirectory() ? listar(p) : [p]
  })
}

const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/g
// Escala de espaçamento em unidades do Tailwind (1 = 4px): 4, 8, 12, 16, 24, 32, 48, 64, 96.
const ESCALA = new Set(['0', '1', '2', '3', '4', '6', '8', '12', '16', '24'])
const ESPACO = /(?<![\w-])-?(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left)-(\d+(?:\.\d+)?|\[[^\]\s]+\])(?![\w.[-])/g
const TEXTO_OU_PESO = /(?<![\w-])(?:text-\[\d[^\]]*\]|text-(?:xs|sm|base|lg|xl|[2-9]xl)|font-(?:thin|extralight|light|medium|extrabold|black))(?![\w-])/g
const EMOJI = /\p{Extended_Pictographic}/u
const ICONES_PROIBIDOS = /from\s+['"](react-icons|@heroicons|@mui\/icons-material|@fortawesome|phosphor-react|@tabler\/icons)/

const tokensCss = readFileSync(join(RAIZ, TOKENS), 'utf8')
const valoresDosTokens = new Set((tokensCss.match(HEX) ?? []).map((h) => h.toLowerCase()))

const problemas = []
const registrar = (arquivo, linha, msg) => problemas.push(`${arquivo}:${linha}  ${msg}`)

function porLinha(arquivo, texto, fn) {
  texto.split('\n').forEach((conteudo, i) => fn(conteudo, i + 1))
}

// ------------------------------------------------------------------------ src/
for (const caminho of listar(join(RAIZ, 'src'))) {
  const arquivo = rel(caminho)
  if (!/\.(jsx?|css)$/.test(arquivo)) continue
  if (arquivo === TOKENS || CONGELADOS.some((c) => arquivo.startsWith(c))) continue
  const texto = readFileSync(caminho, 'utf8')
  const ehJsx = arquivo.endsWith('.jsx') || arquivo.endsWith('.js')

  porLinha(arquivo, texto, (l, n) => {
    for (const hex of l.match(HEX) ?? []) registrar(arquivo, n, `hexadecimal fora do tokens.css: ${hex}`)
    if (!ehJsx) return
    for (const m of l.matchAll(ESPACO)) {
      const valor = m[1]
      if (!ESCALA.has(valor)) registrar(arquivo, n, `espaçamento fora da escala: ${m[0]}`)
    }
    for (const m of l.match(TEXTO_OU_PESO) ?? []) registrar(arquivo, n, `texto/peso fora do sistema: ${m}`)
    if (EMOJI.test(l)) registrar(arquivo, n, 'emoji (proibido: use ícone do lucide)')
    if (/<svg[\s>]/.test(l)) registrar(arquivo, n, 'SVG solto no JSX (use lucide-react ou um arquivo de arte)')
    if (ICONES_PROIBIDOS.test(l)) registrar(arquivo, n, 'biblioteca de ícones proibida (só lucide-react)')
  })
}

// -------------------------------------------- arquivos lidos antes do CSS existir
for (const arquivo of LEITURA_ANTES_DO_CSS) {
  let texto
  try {
    texto = readFileSync(join(RAIZ, arquivo), 'utf8')
  } catch {
    continue
  }
  porLinha(arquivo, texto, (l, n) => {
    for (const hex of l.match(HEX) ?? []) {
      if (!valoresDosTokens.has(hex.toLowerCase())) registrar(arquivo, n, `hexadecimal que não existe no tokens.css: ${hex}`)
    }
  })
}

if (problemas.length) {
  console.error(`✖ Sistema visual: ${problemas.length} problema(s)\n`)
  for (const p of problemas) console.error(`  ${p}`)
  process.exit(1)
}
console.log('✔ Sistema visual: nenhum hexadecimal fora dos tokens, espaçamento e tipografia dentro da escala.')
