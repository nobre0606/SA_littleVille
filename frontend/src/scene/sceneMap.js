/**
 * Mapa da cena. TODAS as coordenadas estão em % da imagem (1672x941), origem no
 * canto superior esquerdo. Nenhum overlay usa coordenadas da viewport.
 *
 * Proveniência de cada valor (campo `src`):
 *   'brief'      valor do brief, conferido e mantido.
 *   'measured'   estimado visualmente na imagem em resolução nativa (±1–2%).
 *   'corrected'  valor do brief que foi corrigido após a medição.
 *   'calibrated' ajustado depois de olhar as capturas com ?debug=1.
 * Sempre que um valor for recalibrado, troque o `src` e escreva o motivo em `note`.
 */

export const IMAGE = { w: 1672, h: 941, src: '/assets/caverna-yeti.png' }

const pt = (x, y, src, note = '') => ({ x, y, src, note })
const box = (x0, y0, x1, y1, src, note = '') => ({ x0, y0, x1, y1, src, note })

export const SCENE = {
  fire: {
    base: pt(24, 79, 'corrected', 'brief dizia y 76%; toras/brasas ficam em y 79–80%'),
    tipY: { y: 67, src: 'corrected', note: 'brief ~68%; ponta da chama pintada em ~67%' },
    lightRadius: { r: 18, src: 'brief', note: '% da largura da imagem' },
    snowWarmRadius: { r: 15, src: 'brief', note: 'usado na Fase 2' },
  },
  bigfoot: {
    bbox: box(9.3, 55.5, 20.7, 80.5, 'corrected', 'brief 9–21.5 / 55–81'),
    head: pt(16.5, 58.5, 'corrected', 'brief x 15%; ele olha para a direita, cabeça em ~16.5%'),
    // Região usada pelas cópias (respiração/pelo): bbox + folga para a máscara suave.
    region: box(7.5, 53, 23, 82.5, 'measured', 'bbox + folga; máscara radial esconde a borda'),
  },
  ceilingLight: pt(30.2, 14.9, 'brief', 'confirmado; o feixe alarga até x 27–37% e desce até y ~55%'),
  portal: pt(37.7, 68, 'corrected', 'brief 37.5/67; centro medido 37.7/68. Glow ~5% x ~15%'),
  // Pontas reais de estalactites (origem das gotas). Faixa medida: x 5–58%, y 2–54%.
  stalactiteTips: [
    pt(6.6, 26, 'measured'),
    pt(8.4, 31, 'measured'),
    pt(14.7, 2, 'measured'),
    pt(22.7, 5, 'measured'),
    pt(28, 38.5, 'calibrated', 'debug 1920x1080: y 36 → 38.5 (ponta fina termina mais abaixo)'),
    pt(36.2, 54, 'calibrated', 'a maior, ao centro; batia exatamente no debug'),
    pt(37.2, 45.5, 'calibrated', 'debug: y 35 caía no meio da estalactite; ponta real em ~45.5'),
    pt(42.8, 38, 'measured'),
    pt(50.8, 42, 'measured'),
    pt(55, 51, 'measured'),
  ],
  // Área do formulário: o escuro começa em ~63% e é total a partir de ~70%.
  formArea: { xMin: 62, src: 'brief', note: 'confirmado; card fica em x 66–98%' },
  // Caixa que o enquadramento "cover" nunca pode cortar (pé grande + fogueira).
  focus: box(9, 55, 25, 81, 'measured', 'pé grande + fogueira; comanda o deslocamento do cover'),
  floor: { yMin: 80, yMax: 92, src: 'measured', note: 'faixa do chão para névoa rasteira e queda das gotas' },
}
