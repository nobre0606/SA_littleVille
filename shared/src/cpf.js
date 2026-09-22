/**
 * Validação de CPF pelos dígitos verificadores (não é regex de formato — calcula os dois
 * dígitos e confere contra os informados). Usado pelo front (Fase 4) e pelo back (Fase 5) a
 * partir do MESMO arquivo, via o pacote `shared`.
 */

export function sanitizeCPF(value) {
  return String(value ?? '').replace(/\D/g, '')
}

function calcDigit(digits, weightStart) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) sum += digits[i] * (weightStart - i)
  const mod = sum % 11
  return mod < 2 ? 0 : 11 - mod
}

/** `raw` pode vir com ou sem máscara (123.456.789-01 ou 12345678901). */
export function isValidCPF(raw) {
  const cpf = sanitizeCPF(raw)
  if (cpf.length !== 11) return false
  // Todos os dígitos iguais (000.000.000-00, 111.111.111-11, ...) passam matematicamente no
  // cálculo abaixo, mas nunca são CPFs reais — a Receita nunca emite esses.
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const nums = cpf.split('').map(Number)
  const d1 = calcDigit(nums.slice(0, 9), 10)
  if (d1 !== nums[9]) return false
  const d2 = calcDigit(nums.slice(0, 10), 11)
  if (d2 !== nums[10]) return false
  return true
}

/** Formata em `123.456.789-01` conforme os dígitos chegam (para máscara ao digitar). */
export function formatCPF(raw) {
  const cpf = sanitizeCPF(raw).slice(0, 11)
  const a = cpf.slice(0, 3)
  const b = cpf.slice(3, 6)
  const c = cpf.slice(6, 9)
  const d = cpf.slice(9, 11)
  let out = a
  if (b) out += `.${b}`
  if (c) out += `.${c}`
  if (d) out += `-${d}`
  return out
}
