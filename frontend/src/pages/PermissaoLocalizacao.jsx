import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LocateFixed, MapPin } from 'lucide-react'
import { consumirRetorno, temRetorno } from '../app/rotaDeRetorno.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { Botao } from '../ui/Botao.jsx'
import { MascotState } from '../ui/mascot/MascotState.jsx'

/**
 * Primeira tela depois do login (o login congelado navega para cá). RN07: a permissão de
 * localização NUNCA é pedida na tela de login — só aqui, quando a pessoa clica no botão.
 *
 * Negar não trava nada: o app segue normalmente e, no registro de avistamento, o local pode
 * ser marcado tocando no mapa.
 */
export default function PermissaoLocalizacao() {
  useDocumentTitle('Localização')
  const navigate = useNavigate()
  const [status, setStatus] = useState('inicial') // inicial | pedindo | negado
  // Veio de uma sessão que caiu? Então, depois daqui, volta para onde estava (rotaDeRetorno.js).
  const [voltaDepois] = useState(temRetorno)

  const continuar = () => navigate(consumirRetorno() ?? '/dashboard', { replace: true })

  const pedirPermissao = () => {
    if (!('geolocation' in navigator)) {
      setStatus('negado')
      return
    }
    setStatus('pedindo')
    navigator.geolocation.getCurrentPosition(continuar, () => setStatus('negado'), { timeout: 15_000 })
  }

  const negado = status === 'negado'
  return (
    <main className="lv-container lv-enter flex min-h-dvh items-center justify-center py-12">
      <section className="flex max-w-lg flex-col items-center gap-6 rounded-lg bg-surface-card p-8 text-center shadow-2">
        <MascotState variante="semGps" tamanho="lg" />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-32 font-semibold text-ink-1">
            {negado ? 'Tudo bem, sem GPS' : 'Compartilhar sua localização?'}
          </h1>
          <p className="text-16 text-ink-2">
            {negado
              ? 'Você pode usar o Little Ville normalmente. Ao registrar um avistamento, é só tocar no mapa para marcar o local. Se mudar de ideia, libere a localização nas configurações do navegador.'
              : 'Usamos sua localização para marcar avistamentos com um toque e mostrar sua posição para a sua equipe. Ela só é enviada enquanto a tela do mapa estiver aberta.'}
          </p>
          {voltaDepois && <p className="text-14 font-semibold text-ink-1">Depois disso, você volta para onde estava.</p>}
        </div>
        <div className="flex w-full flex-col gap-3">
          {negado ? (
            <Botao icone={ArrowRight} onClick={continuar} larguraTotal>
              Continuar
            </Botao>
          ) : (
            <>
              <Botao icone={LocateFixed} onClick={pedirPermissao} carregando={status === 'pedindo'} rotuloCarregando="Aguardando permissão…" larguraTotal>
                Permitir localização
              </Botao>
              <Botao variante="fantasma" icone={MapPin} onClick={continuar} larguraTotal>
                Agora não, vou marcar no mapa
              </Botao>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
