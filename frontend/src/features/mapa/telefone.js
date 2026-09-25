/** "192" → "192" · "4837219100" → "(48) 3721-9100" · "48991234567" → "(48) 99123-4567". */
export function formatarTelefone(numero) {
  const d = String(numero)
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return d
}
