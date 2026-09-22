import { STRENGTH_LABELS, scoreSenha } from './passwordScore.js'

/** Indicador visual de força da senha (barras) + texto lido por leitor de tela. */
export default function PasswordStrength({ value }) {
  if (!value) return null
  const score = scoreSenha(value)
  return (
    <div className="lv-strength">
      <div className="lv-strength-bars" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`lv-strength-bar${i < score ? ' is-filled' : ''}`} data-level={score} />
        ))}
      </div>
      <span className="lv-strength-label" aria-live="polite">
        Força da senha: {STRENGTH_LABELS[score]}
      </span>
    </div>
  )
}
