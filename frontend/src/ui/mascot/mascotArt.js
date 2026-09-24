import base from './art/base.png'

/**
 * Arte de cada estado do mascote. PROVISÓRIO: todos usam a mesma silhueta (extraída do logo por
 * scripts/extract-mascot.mjs), variando escala, espelhamento, rotação e o pastel de fundo.
 *
 * Quando a arte definitiva chegar: coloque os arquivos em ./art/ (ex.: erro.png), troque o
 * `src` da variante e, se a arte já vier colorida, mude `mascara` para false. Nenhum componente
 * precisa mudar.
 *
 * `mascara: true` = o PNG é só a forma; a cor do mascote vem do token (branco da superfície).
 */
export const MASCARA = true

export const ARTE_MASCOTE = {
  vazio: { src: base, fundo: 'lavanda', escala: 1, espelhar: false, rotacao: 0 },
  erro: { src: base, fundo: 'rosa', escala: 0.92, espelhar: true, rotacao: -8 },
  404: { src: base, fundo: 'azul', escala: 1, espelhar: true, rotacao: 6 },
  sucesso: { src: base, fundo: 'menta', escala: 1.06, espelhar: false, rotacao: 4 },
  carregando: { src: base, fundo: 'lavanda', escala: 0.95, espelhar: false, rotacao: 0, animar: true },
  // Creme não serve de fundo do mascote: é quase branco e o mascote branco some.
  semGps: { src: base, fundo: 'menta', escala: 0.95, espelhar: true, rotacao: -4 },
  semEquipe: { src: base, fundo: 'azul', escala: 0.9, espelhar: false, rotacao: -6 },
}
