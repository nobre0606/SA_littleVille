import { useId, useState } from 'react'
import Field from './Field.jsx'

/** Field de senha com botão mostrar/ocultar (acessível: aria-pressed + label muda). */
export default function PasswordField({ id, label, ...rest }) {
  const [visible, setVisible] = useState(false)
  const uid = useId()
  const fieldId = id ?? uid
  return (
    <Field
      id={fieldId}
      label={label}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          className="lv-field-toggle"
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((v) => !v)}
          tabIndex={0}
        >
          {visible ? '🙈' : '👁'}
        </button>
      }
      {...rest}
    />
  )
}
