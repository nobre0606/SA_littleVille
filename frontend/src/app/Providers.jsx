import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { configurarCliente } from '../api/client.js'
import { criarQueryClient } from '../api/queryClient.js'
import { ToastProvider } from '../ui/Toast.jsx'

/**
 * Sessão encerrada (401) em QUALQUER chamada — inclusive no meio de um polling — manda para o
 * login com RECARGA COMPLETA da página. Recarregar (em vez de só trocar de rota) apaga de uma
 * vez todo o cache em memória com dados da sessão anterior. Ver docs/DECISOES.md.
 */
function irParaLogin() {
  if (window.location.pathname === '/login') return
  window.location.assign('/login?expirou=1')
}

export function Providers({ children }) {
  const [queryClient] = useState(criarQueryClient)

  useEffect(() => {
    configurarCliente({ aoNaoAutenticado: irParaLogin })
    // Evento genérico "os dados mudaram por fora do app": revalida tudo o que está na tela.
    // Quem dispara hoje é o painel de debug do mock; o app não sabe (nem precisa saber) disso.
    const revalidar = () => queryClient.invalidateQueries()
    window.addEventListener('lv:dados-externos', revalidar)
    return () => window.removeEventListener('lv:dados-externos', revalidar)
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}
