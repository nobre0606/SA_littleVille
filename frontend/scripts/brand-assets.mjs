/**
 * Gera os ativos de marca em public/ a partir das artes de src/ui e das cores do tokens.css:
 *
 *   favicon.svg ................ pegada branca sobre o roxo primário
 *   icons/favicon-32.png, apple-touch-icon.png (180), icon-192.png, icon-512.png,
 *   icons/icon-maskable-512.png  (ícone "maskable": pegada dentro da zona segura de 80%)
 *   og-image.png ............... 1200x630 para prévia de link (WhatsApp, redes sociais)
 *   manifest.webmanifest ....... app instalável
 *
 * As CORES vêm do tokens.css (lidas aqui, nunca digitadas): mudou o token, roda de novo.
 * A imagem Open Graph é renderizada num Chromium (Playwright) para usar as fontes de verdade.
 *
 * Uso: node scripts/brand-assets.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { chromium } from 'playwright'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const ler = (p, enc) => readFileSync(join(RAIZ, p), enc)
const PUBLIC = join(RAIZ, 'public')
mkdirSync(join(PUBLIC, 'icons'), { recursive: true })

// ------------------------------------------------------------- cores do tokens.css
const css = ler('src/theme/tokens.css', 'utf8')
const token = (nome) => {
  const m = css.match(new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{3,8})`))
  if (!m) throw new Error(`token --${nome} não encontrado no tokens.css`)
  return m[1].toLowerCase()
}
const COR = {
  primary: token('primary'),
  surfaceApp: token('surface-app'),
  surfaceCard: token('surface-card'),
  ink1: token('ink-1'),
  ink2: token('ink-2'),
  lavanda: token('pastel-lavanda'),
  azul: token('pastel-azul'),
}

// ------------------------------------------------------------------------- favicon
const pegadaSvg = ler('src/ui/brand/pegada.svg', 'utf8')
const pegadaMiolo = pegadaSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

/** Pegada centralizada num quadrado de 64; `escala` controla a margem (maskable precisa de mais). */
function iconeSvg({ escala, arredondado }) {
  const w = 64 * escala
  const h = 96 * escala
  const miolo = pegadaMiolo.replaceAll('fill="black"', `fill="${COR.surfaceCard}"`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${arredondado ? 14 : 0}" fill="${COR.primary}"/><g transform="translate(${(64 - w) / 2} ${(64 - h) / 2}) scale(${escala})">${miolo}</g></svg>\n`
}

const favicon = iconeSvg({ escala: 0.5, arredondado: true })
writeFileSync(join(PUBLIC, 'favicon.svg'), favicon)

const png = (svg, tamanho, destino) =>
  sharp(Buffer.from(svg), { density: 600 }).resize(tamanho, tamanho).png({ compressionLevel: 9 }).toFile(join(PUBLIC, destino))

// Ícones "any" com cantos arredondados; "maskable" em quadrado cheio (o sistema recorta) e com
// a pegada menor, dentro da zona segura central de 80%.
await png(favicon, 32, 'icons/favicon-32.png')
await png(iconeSvg({ escala: 0.5, arredondado: false }), 180, 'icons/apple-touch-icon.png')
await png(favicon, 192, 'icons/icon-192.png')
await png(favicon, 512, 'icons/icon-512.png')
await png(iconeSvg({ escala: 0.38, arredondado: false }), 512, 'icons/icon-maskable-512.png')

// ------------------------------------------------------------------------ manifest
const manifest = {
  name: 'Little Ville — Avistamentos do Pé Grande',
  short_name: 'Little Ville',
  description: 'Registre e acompanhe avistamentos do Pé Grande em Florianópolis.',
  lang: 'pt-BR',
  start_url: '/dashboard',
  scope: '/',
  display: 'standalone',
  background_color: COR.surfaceApp,
  theme_color: COR.surfaceApp,
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
writeFileSync(join(PUBLIC, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`)

// ---------------------------------------------------------------------- Open Graph
const dataUri = (p, tipo) => `data:${tipo};base64,${ler(p).toString('base64')}`
const fredoka = dataUri('node_modules/@fontsource/fredoka/files/fredoka-latin-600-normal.woff2', 'font/woff2')
const nunito = dataUri('node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-400-normal.woff2', 'font/woff2')
const mascote = dataUri('src/ui/mascot/art/base.png', 'image/png')
const pegada = dataUri('src/ui/brand/pegada.svg', 'image/svg+xml')
const montanha = dataUri('public/assets/generated/logo.svg', 'image/svg+xml')

const mask = (url) => `-webkit-mask:url(${url}) center/contain no-repeat;mask:url(${url}) center/contain no-repeat;`
const trilha = [
  [70, 520, 80],
  [150, 480, 100],
  [230, 525, 80],
  [310, 485, 100],
  [390, 530, 80],
]
  .map(([x, y, r], i) => `<i style="left:${x}px;top:${y}px;transform:rotate(${r}deg) scaleX(${i % 2 ? -1 : 1})"></i>`)
  .join('')

const html = `<!doctype html><html><head><style>
@font-face{font-family:Fredoka;font-weight:600;src:url(${fredoka}) format('woff2')}
@font-face{font-family:Nunito;font-weight:400;src:url(${nunito}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:${COR.surfaceApp};font-family:Nunito;position:relative;overflow:hidden}
.texto{position:absolute;left:80px;top:150px;width:560px}
h1{font-family:Fredoka;font-weight:600;font-size:104px;line-height:1.05;color:${COR.primary}}
p{margin-top:24px;font-size:36px;line-height:1.35;color:${COR.ink2}}
.circulo{position:absolute;right:90px;top:75px;width:480px;height:480px;border-radius:50%;background:${COR.lavanda};overflow:hidden}
.mascote{position:absolute;left:90px;bottom:0;width:300px;height:360px;background:${COR.surfaceCard};${mask(mascote)}}
.sombra{position:absolute;inset:0;filter:drop-shadow(0 4px 0 ${COR.ink2})}
.montanha{position:absolute;left:-40px;bottom:-60px;width:520px;height:240px;background:${COR.lavanda};opacity:.45;${mask(montanha)}}
i{position:absolute;width:36px;height:54px;background:${COR.lavanda};${mask(pegada)}}
</style></head><body>
<div class="montanha"></div>${trilha}
<div class="texto"><h1>Little Ville</h1><p>Avistamentos do Pé Grande em Florianópolis</p></div>
<div class="circulo"><div class="sombra"><div class="mascote"></div></div></div>
</body></html>`

const navegador = await chromium.launch()
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } })
await pagina.setContent(html)
await pagina.evaluate(() => document.fonts.ready)
await pagina.screenshot({ path: join(PUBLIC, 'og-image.png') })
await navegador.close()

console.log('✔ favicon.svg, icons/*.png, manifest.webmanifest e og-image.png gerados em public/')
