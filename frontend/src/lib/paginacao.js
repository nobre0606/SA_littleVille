/**
 * Quais números de página mostrar: sempre a primeira, a última e 1 vizinha de cada lado da
 * atual; o resto vira reticências. Máximo de 7 itens, cabendo numa tela de 390px com botões
 * de 44px.
 *
 * paginasVisiveis(6, 12) → [1, '…', 5, 6, 7, '…', 12]
 */
export function paginasVisiveis(atual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const paginas = new Set([1, total, atual - 1, atual, atual + 1])
  // Perto das pontas, completa para não mostrar "1 … 3" (reticência escondendo uma página só).
  if (atual <= 4) [2, 3, 4, 5].forEach((p) => paginas.add(p))
  if (atual >= total - 3) [total - 4, total - 3, total - 2, total - 1].forEach((p) => paginas.add(p))
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const saida = []
  for (const p of ordenadas) {
    if (saida.length && p - saida[saida.length - 1] > 1) saida.push('…')
    saida.push(p)
  }
  return saida
}
