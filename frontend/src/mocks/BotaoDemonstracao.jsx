import { useSyncExternalStore } from 'react'
import { ArrowRight } from 'lucide-react'
import { ROTAS_DE_LOGIN } from './cenarios.js'

/**
 * Atalho de APRESENTAÇÃO: na tela de login, um botão leva direto ao app já logado, sem digitar
 * e-mail e senha. Só existe em modo mock (vem de src/mocks/, que sai do bundle de produção com
 * API real) e não toca nos arquivos congelados do login: é uma camada por cima, num canto livre
 * da tela (canto superior esquerdo; o "Pular" da intro fica embaixo à direita).
 *
 * Navegação COMPLETA (<a href>, não o roteador): recarrega com `?mock=logged-in`, que liga a
 * sessão simulada desde o início.
 */
export function BotaoDemonstracao({ assinarRota }) {
  const caminho = useSyncExternalStore(assinarRota, () => window.location.pathname)
  if (!ROTAS_DE_LOGIN.includes(caminho)) return null
  return (
    <a
      href="/dashboard?mock=logged-in"
      className="fixed top-4 left-4 z-[70] inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-ui text-16 font-semibold text-ink-on-primary shadow-3 hover:bg-primary-hover"
    >
      Ver o app sem login (demonstração)
      <ArrowRight size={20} strokeWidth={1.75} aria-hidden="true" />
    </a>
  )
}
