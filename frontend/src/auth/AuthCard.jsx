import { useState } from 'react'
import LoginForm from './LoginForm.jsx'
import RegisterWizard from './RegisterWizard.jsx'

/** Card "gelo fosco" com abas Entrar/Criar conta (transição animada via CSS, ver auth.css). */
export default function AuthCard() {
  const [tab, setTab] = useState('login') // 'login' | 'register'

  return (
    <div className="lv-card" data-testid="auth-card">
      <div className="lv-tabs" role="tablist" aria-label="Entrar ou criar conta">
        <button
          type="button"
          role="tab"
          id="tab-login"
          aria-selected={tab === 'login'}
          aria-controls="panel-login"
          className={`lv-tab${tab === 'login' ? ' is-active' : ''}`}
          onClick={() => setTab('login')}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          id="tab-register"
          aria-selected={tab === 'register'}
          aria-controls="panel-register"
          className={`lv-tab${tab === 'register' ? ' is-active' : ''}`}
          onClick={() => setTab('register')}
        >
          Criar conta
        </button>
        <span className={`lv-tab-indicator${tab === 'register' ? ' is-register' : ''}`} aria-hidden="true" />
      </div>

      <div id="panel-login" role="tabpanel" aria-labelledby="tab-login" hidden={tab !== 'login'}>
        {tab === 'login' && <LoginForm />}
      </div>
      <div id="panel-register" role="tabpanel" aria-labelledby="tab-register" hidden={tab !== 'register'}>
        {tab === 'register' && <RegisterWizard />}
      </div>
    </div>
  )
}
