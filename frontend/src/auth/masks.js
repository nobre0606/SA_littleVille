export { formatCPF as maskCPF, sanitizeCPF } from 'shared/cpf'

const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '')

/** `(11) 91234-5678` (celular, 11 dígitos) ou `(11) 3456-7890` (fixo, 10 dígitos). */
export function maskPhone(raw) {
  const d = onlyDigits(raw).slice(0, 11)
  if (d.length === 0) return ''
  let out = `(${d.slice(0, 2)}`
  if (d.length >= 2) out += ') '
  if (d.length <= 2) return out
  const isCell = d.length > 10
  const mid = isCell ? d.slice(2, 7) : d.slice(2, 6)
  const end = isCell ? d.slice(7, 11) : d.slice(6, 10)
  out += mid
  if (end) out += `-${end}`
  return out
}

/** `01001-000`. */
export function maskCEP(raw) {
  const d = onlyDigits(raw).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export const sanitizeDigits = onlyDigits
