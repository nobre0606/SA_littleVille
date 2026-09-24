import { Outlet } from 'react-router-dom'
import { CarregandoPegadas } from '../ui/brand/Pegada.jsx'
import { EstadoErro } from '../ui/EstadoErro.jsx'
import { useSessao } from './sessao.js'

/**
 * Portão das rotas autenticadas. Enquanto confere a sessão, mostra o carregador de pegadas;
 * se a sessão não existe (401), o client já está redirecionando para /login; qualquer outro
 * erro (servidor fora, sem rede) mostra o estado de erro com "Tentar de novo" — o app nunca
 * fica numa tela branca.
 */
export function RequireSession() {
  const { isPending, isError, error, refetch } = useSessao()

  if (isPending || error?.code === 'UNAUTHENTICATED') {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <CarregandoPegadas rotulo="Conferindo sua sessão…" />
      </main>
    )
  }
  if (isError) {
    return (
      <main className="lv-container flex min-h-dvh items-center">
        <EstadoErro erro={error} aoTentarDeNovo={refetch} className="w-full" />
      </main>
    )
  }
  return <Outlet />
}
