import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Placeholder (Fase 5, regra de negócio do GPS): depois do login/cadastro, o usuário cai aqui
 * — NUNCA a permissão de localização é pedida no carregamento da tela de login. Só quando a
 * pessoa clica "Permitir localização" aqui é que `navigator.geolocation` é chamado.
 */
export default function PermissaoLocalizacao() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle | asking | granted | denied

  const pedirPermissao = () => {
    setStatus('asking')
    if (!('geolocation' in navigator)) {
      setStatus('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setStatus('granted')
        navigate('/mapa')
      },
      () => setStatus('denied'),
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#05080F] px-6 text-[#EAF6FF]">
      <div className="max-w-md text-center">
        <h1 className="mb-3 text-2xl font-semibold">Compartilhar localização</h1>
        <p className="mb-6 text-sm text-[rgba(234,246,255,0.74)]">
          O Little Ville usa a sua localização só para mostrar o mapa da vila e avisar quando o Pé Grande aparece
          perto de você. Isso só é pedido agora, depois do login — nunca antes.
        </p>
        {status === 'denied' && (
          <p className="mb-4 text-sm text-[#FF8A8A]">Não foi possível obter a localização. Você pode tentar de novo.</p>
        )}
        <button
          type="button"
          onClick={pedirPermissao}
          disabled={status === 'asking'}
          className="rounded-[10px] bg-[#FF9A3C] px-6 py-3 font-medium text-[#05080F] disabled:opacity-60"
        >
          {status === 'asking' ? 'Pedindo permissão…' : 'Permitir localização'}
        </button>
        <div className="mt-4">
          <button type="button" onClick={() => navigate('/mapa')} className="text-sm text-[#7FE3FF] underline">
            Continuar sem compartilhar
          </button>
        </div>
      </div>
    </main>
  )
}
