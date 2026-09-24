/**
 * Gera a arte PROVISÓRIA do mascote a partir do logo: isola só a silhueta do pé grande (sem a
 * montanha em volta) e salva como PNG com transparência em `src/ui/mascot/art/base.png`.
 *
 * Por que um script e não um recorte feito à mão: é reproduzível. Se o logo mudar, roda de novo.
 * Quando a arte definitiva do mascote chegar, este script deixa de ser usado — basta trocar os
 * arquivos em `src/ui/mascot/art/` (ver mascotArt.js).
 *
 * Como funciona: binariza o recorte do logo e faz um "flood fill" (balde de tinta) a partir de
 * um ponto no peito do pé grande. Só os pixels escuros CONECTADOS a esse ponto entram — as
 * linhas da montanha, que não encostam nele, ficam de fora. O chão encosta nos pés, então a
 * busca é limitada a `CORTE_Y` (logo acima da linha do chão).
 *
 * Uso: node scripts/extract-mascot.mjs
 */
import sharp from 'sharp'

const ORIGEM = 'public/assets/logo-littleville.png'
const DESTINO = 'src/ui/mascot/art/base.png'
const RECORTE = { left: 600, top: 340, width: 380, height: 450 } // caixa em volta do pé grande
const SEMENTE = [200, 200] // ponto dentro do corpo, dentro do recorte
const CORTE_Y = 412 // linha do chão, medida no recorte

const { data, info } = await sharp(ORIGEM)
  .extract(RECORTE)
  .flatten({ background: '#fff' })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true })

const W = info.width
const H = info.height
const escuro = (x, y) => data[y * W + x] < 128
const dentro = new Uint8Array(W * H)
const pilha = [SEMENTE]
while (pilha.length) {
  const [x, y] = pilha.pop()
  if (x < 0 || y < 0 || x >= W || y >= CORTE_Y) continue
  const i = y * W + x
  if (dentro[i] || !escuro(x, y)) continue
  dentro[i] = 1
  pilha.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
}

// Canal alfa: opaco no corpo; na borda, usa o cinza do original para manter o antisserrilhado.
const rgba = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) {
  let alfa = 0
  if (dentro[i]) alfa = 255
  else {
    const x = i % W
    const y = (i / W) | 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (y + dy) * W + (x + dx)
      if (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H && dentro[j]) {
        alfa = 255 - data[i]
        break
      }
    }
  }
  rgba[i * 4 + 3] = alfa
}

await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).trim().png({ compressionLevel: 9 }).toFile(DESTINO)
const meta = await sharp(DESTINO).metadata()
console.log(`${DESTINO}: ${meta.width}x${meta.height}`)
