export const STRENGTH_LABELS = ['muito fraca', 'fraca', 'razoável', 'boa', 'forte']

export function scoreSenha(v) {
  const value = v || ''
  let score = 0
  if (value.length >= 8) score++
  if (/[a-z]/.test(value)) score++
  if (/[A-Z]/.test(value)) score++
  if (/[0-9]/.test(value)) score++
  if (value.length >= 12) score++
  return Math.min(score, 4)
}
