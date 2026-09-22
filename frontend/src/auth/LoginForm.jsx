import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginSchema } from 'shared/schemas'
import { login, ApiError } from './api.js'
import Field from './Field.jsx'
import PasswordField from './PasswordField.jsx'

const fieldErrorsFromZod = (error) => {
  const fe = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (key && !fe[key]) fe[key] = issue.message
  }
  return fe
}

export default function LoginForm() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', senha: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | loading | success
  const [formError, setFormError] = useState('')

  const setField = (name) => (e) => {
    const v = e.target.value
    setValues((prev) => ({ ...prev, [name]: v }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (formError) setFormError('')
  }

  const validateOne = (name, nextValues) => {
    const r = loginSchema.safeParse(nextValues)
    if (r.success) return ''
    return r.error.issues.find((i) => i.path[0] === name)?.message ?? ''
  }

  const handleBlur = (name) => () => setErrors((prev) => ({ ...prev, [name]: validateOne(name, values) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const r = loginSchema.safeParse(values)
    if (!r.success) {
      setErrors(fieldErrorsFromZod(r.error))
      return
    }
    setStatus('loading')
    setFormError('')
    try {
      await login(values)
      setStatus('success')
      navigate('/permissao-localizacao')
    } catch (err) {
      setStatus('idle')
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(err.fieldErrors)
      } else {
        setFormError(err.message ?? 'Não foi possível entrar. Tente de novo.')
      }
    }
  }

  return (
    <form className="lv-form" onSubmit={handleSubmit} noValidate data-testid="login-form">
      <Field
        id="login-email"
        label="E-mail"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={setField('email')}
        onBlur={handleBlur('email')}
        error={errors.email}
      />
      <PasswordField
        id="login-senha"
        label="Senha"
        autoComplete="current-password"
        value={values.senha}
        onChange={setField('senha')}
        onBlur={handleBlur('senha')}
        error={errors.senha}
      />
      <div className="lv-form-row lv-form-row-end">
        <a
          href="#"
          className="lv-link"
          onClick={(e) => e.preventDefault()}
          data-testid="forgot-password-link"
        >
          Esqueci minha senha
        </a>
      </div>
      {formError && (
        <p className="lv-form-error" role="alert" data-testid="login-error">
          {formError}
        </p>
      )}
      <button type="submit" className="lv-button-primary" disabled={status === 'loading'} data-testid="login-submit">
        {status === 'loading' ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
