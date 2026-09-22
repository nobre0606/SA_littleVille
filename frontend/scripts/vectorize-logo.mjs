// Vetoriza a logo (preta sobre transparente) em SVG com preenchimento #EAF6FF.
// Uso: node scripts/vectorize-logo.mjs
// A logo original NÃO é modificada; a saída vai para public/assets/generated/.
import { Potrace } from 'potrace'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../public/assets/logo-littleville.png', import.meta.url))
const OUT_DIR = fileURLToPath(new URL('../public/assets/generated/', import.meta.url))
const OUT = OUT_DIR + 'logo.svg'

mkdirSync(OUT_DIR, { recursive: true })

const trace = new Potrace({
  color: '#EAF6FF',
  background: 'transparent',
  threshold: 128, // a logo já é preto/transparente puro; a alfa vira preto abaixo do limiar
  turdSize: 4, // remove ruído/speckles pequenos (halo de antialiasing do PNG)
  optTolerance: 0.35,
})

trace.loadImage(SRC, (err) => {
  if (err) {
    console.error('Falha ao carregar a imagem:', err)
    process.exit(1)
  }
  const svg = trace.getSVG()
  writeFileSync(OUT, svg)
  console.log('Gerado:', OUT, `(${(svg.length / 1024).toFixed(1)} KB)`)
})
