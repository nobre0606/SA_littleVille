/**
 * Campo genérico do formulário: label + input + erro (abaixo do campo, `aria-describedby`) ou
 * dica. Nenhuma cor fixa aqui — tudo vem de `theme/tokens.css` via as classes `lv-*`.
 */
export default function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  hint,
  autoComplete,
  inputMode,
  maxLength,
  required = true,
  rightSlot,
  className = '',
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={`lv-field ${className}`}>
      <label htmlFor={id} className="lv-field-label">
        {label}
      </label>
      <div className="lv-field-control">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          required={required}
          className={`lv-input${error ? ' lv-input-error' : ''}`}
        />
        {rightSlot}
      </div>
      {error && (
        <p id={`${id}-error`} className="lv-field-error" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="lv-field-hint">
          {hint}
        </p>
      )}
    </div>
  )
}
