import { IMAGE, SCENE } from './sceneMap.js'

/**
 * Equivalente a object-fit: cover em JS, mas com `object-position: left center` e uma
 * caixa de foco (pé grande + fogueira) que nunca pode ser cortada.
 *
 * Retorna o retângulo do stage (proporção 1672:941) em px, relativo ao container:
 * { w, h, x, y, scale } onde scale = px por px-da-imagem.
 */
export function computeCover(vw, vh, focus = SCENE.focus, padPx = 24) {
  const scale = Math.max(vw / IMAGE.w, vh / IMAGE.h)
  // Tamanho em px INTEIROS (ceil mantém a cobertura): frações de pixel fariam as cópias da
  // região (pé grande) serem reamostradas de forma diferente do original.
  const w = Math.ceil(IMAGE.w * scale)
  const h = Math.ceil(IMAGE.h * scale)

  // Horizontal: começa à esquerda; desloca só o necessário para caber o foco.
  const fx0 = (focus.x0 / 100) * w - padPx
  const fx1 = (focus.x1 / 100) * w + padPx
  let x = 0
  if (fx1 > vw) x = vw - fx1
  if (fx0 + x < 0) x = (vw - (fx1 - fx0)) / 2 - fx0 // foco maior que a viewport: centraliza
  x = Math.min(0, Math.max(vw - w, x))

  // Vertical: centro; desloca só se o foco sairia do quadro.
  const fy0 = (focus.y0 / 100) * h - padPx
  const fy1 = (focus.y1 / 100) * h + padPx
  let y = (vh - h) / 2
  if (fy1 + y > vh) y = vh - fy1
  if (fy0 + y < 0) y = -fy0
  y = Math.min(0, Math.max(vh - h, y))

  return { w, h, x: Math.round(x), y: Math.round(y), scale }
}
