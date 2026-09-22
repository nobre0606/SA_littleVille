import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerSchema, registerStep1Schema, registerStep2Schema } from 'shared/schemas'
import { register, ApiError } from './api.js'
import { lookupCep } from './viaCep.js'
import { maskCEP, maskCPF, maskPhone } from './masks.js'
import Field from './Field.jsx'
import PasswordField from './PasswordField.jsx'
import PasswordStrength from './PasswordStrength.jsx'

const STEP1_FIELDS = ['nome', 'email', 'senha', 'cpf', 'telefone']
const EMPTY = { nome: '', email: '', senha: '', cpf: '', telefone: '', cep: '', numero: '', rua: '', bairro: '', consentimentoLgpd: false }

const fieldErrorsFromZod = (error) => {
  const fe = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (key && !fe[key]) fe[key] = issue.message
  }
  return fe
}

export default function RegisterWizard({ onSuccess }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [formError, setFormError] = useState('')
  const [cepStatus, setCepStatus] = useState('idle') // idle | loading | done | error

  const setField = (name) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setValues((prev) => ({ ...prev, [name]: v }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (formError) setFormError('')
  }

  const schemaFor = (name) => (STEP1_FIELDS.includes(name) ? registerStep1Schema : registerStep2Schema)

  const validateOne = (name, nextValues) => {
    const r = schemaFor(name).safeParse(nextValues)
    if (r.success) return ''
    return r.error.issues.find((i) => i.path[0] === name)?.message ?? ''
  }

  const handleBlur = (name) => () => setErrors((prev) => ({ ...prev, [name]: validateOne(name, values) }))

  const handleCepBlur = async () => {
    const msg = validateOne('cep', values)
    setErrors((prev) => ({ ...prev, cep: msg }))
    if (msg) return
    setCepStatus('loading')
    const data = await lookupCep(values.cep)
    if (data && (data.logradouro || data.bairro)) {
      setValues((prev) => ({ ...prev, rua: data.logradouro || prev.rua, bairro: data.bairro || prev.bairro }))
      setCepStatus('done')
    } else {
      setCepStatus('error')
    }
  }

  const goNext = (e) => {
    e.preventDefault()
    const r = registerStep1Schema.safeParse(values)
    if (!r.success) {
      setErrors((prev) => ({ ...prev, ...fieldErrorsFromZod(r.error) }))
      return
    }
    setStep(2)
  }

  const goBack = () => setStep(1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const r = registerSchema.safeParse(values)
    if (!r.success) {
      const fe = fieldErrorsFromZod(r.error)
      setErrors((prev) => ({ ...prev, ...fe }))
      if (Object.keys(fe).some((k) => STEP1_FIELDS.includes(k))) setStep(1)
      return
    }
    setStatus('loading')
    setFormError('')
    try {
      await register(values)
      setStatus('success')
      onSuccess?.()
      navigate('/permissao-localizacao')
    } catch (err) {
      setStatus('idle')
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }))
        if (Object.keys(err.fieldErrors).some((k) => STEP1_FIELDS.includes(k))) setStep(1)
      } else {
        setFormError(err.message ?? 'Não foi possível criar a conta. Tente de novo.')
      }
    }
  }

  return (
    <div data-testid="register-wizard">
      <div className="lv-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2} aria-label="Etapa do cadastro">
        <span className={`lv-progress-step${step >= 1 ? ' is-active' : ''}`}>1</span>
        <span className="lv-progress-line" />
        <span className={`lv-progress-step${step >= 2 ? ' is-active' : ''}`}>2</span>
      </div>

      {step === 1 && (
        <form className="lv-form" onSubmit={goNext} noValidate data-testid="register-step1">
          <Field id="reg-nome" label="Nome completo" autoComplete="name" value={values.nome} onChange={setField('nome')} onBlur={handleBlur('nome')} error={errors.nome} />
          <Field id="reg-email" label="E-mail" type="email" autoComplete="email" value={values.email} onChange={setField('email')} onBlur={handleBlur('email')} error={errors.email} />
          <PasswordField id="reg-senha" label="Senha" autoComplete="new-password" value={values.senha} onChange={setField('senha')} onBlur={handleBlur('senha')} error={errors.senha} />
          <PasswordStrength value={values.senha} />
          <Field
            id="reg-cpf"
            label="CPF"
            value={maskCPF(values.cpf)}
            onChange={setField('cpf')}
            onBlur={handleBlur('cpf')}
            error={errors.cpf}
            inputMode="numeric"
            maxLength={14}
            autoComplete="off"
          />
          <Field
            id="reg-telefone"
            label="Telefone"
            value={maskPhone(values.telefone)}
            onChange={setField('telefone')}
            onBlur={handleBlur('telefone')}
            error={errors.telefone}
            inputMode="numeric"
            maxLength={15}
            autoComplete="tel"
          />
          <button type="submit" className="lv-button-primary" data-testid="register-next">
            Continuar
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="lv-form" onSubmit={handleSubmit} noValidate data-testid="register-step2">
          <Field
            id="reg-cep"
            label="CEP"
            value={maskCEP(values.cep)}
            onChange={setField('cep')}
            onBlur={handleCepBlur}
            error={errors.cep}
            inputMode="numeric"
            maxLength={9}
            autoComplete="postal-code"
            hint={cepStatus === 'loading' ? 'Buscando endereço…' : cepStatus === 'error' ? 'Não encontramos esse CEP — preencha manualmente.' : undefined}
          />
          <Field id="reg-numero" label="Número" value={values.numero} onChange={setField('numero')} onBlur={handleBlur('numero')} error={errors.numero} inputMode="numeric" />
          <Field id="reg-rua" label="Rua" value={values.rua} onChange={setField('rua')} onBlur={handleBlur('rua')} error={errors.rua} autoComplete="address-line1" />
          <Field id="reg-bairro" label="Bairro" value={values.bairro} onChange={setField('bairro')} onBlur={handleBlur('bairro')} error={errors.bairro} />

          <label className="lv-checkbox" htmlFor="reg-lgpd">
            <input
              id="reg-lgpd"
              type="checkbox"
              checked={values.consentimentoLgpd}
              onChange={setField('consentimentoLgpd')}
              aria-describedby={errors.consentimentoLgpd ? 'reg-lgpd-error' : undefined}
              required
            />
            <span>Autorizo o uso do meu CPF e endereço para identificar minha conta e mostrar minha localização no mapa da vila (LGPD).</span>
          </label>
          {errors.consentimentoLgpd && (
            <p id="reg-lgpd-error" className="lv-field-error" role="alert">
              {errors.consentimentoLgpd}
            </p>
          )}

          {formError && (
            <p className="lv-form-error" role="alert" data-testid="register-error">
              {formError}
            </p>
          )}
          <div className="lv-form-row">
            <button type="button" className="lv-button-secondary" onClick={goBack} data-testid="register-back">
              Voltar
            </button>
            <button type="submit" className="lv-button-primary" disabled={status === 'loading'} data-testid="register-submit">
              {status === 'loading' ? 'Criando conta…' : 'Criar conta'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
