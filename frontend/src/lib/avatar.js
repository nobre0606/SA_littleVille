/** Os 5 pastéis dos tokens. O avatar usa o NOME do token; a cor em si só existe no tokens.css. */
export const PASTEIS = ['lavanda', 'azul', 'menta', 'rosa', 'creme']

/**
 * Pastel derivado do id — estável: a mesma pessoa tem sempre a mesma cor, em qualquer tela e
 * em qualquer recarga (não é aleatório). Hash simples (djb2) do id módulo 5.
 */
export function pastelDoId(id) {
  let h = 5381
  for (const ch of String(id)) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0
  return PASTEIS[h % PASTEIS.length]
}

/** "Ana Maria Souza" → "AS" (primeiro + último nome); "Ana" → "A"; vazio → "?". */
export function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toLocaleUpperCase('pt-BR')
}
