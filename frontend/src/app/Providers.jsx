import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { configurarCliente } from '../api/client.js'
import { chaves, criarQueryClient } from '../api/queryClient.js'
import { ToastProvider } from '../ui/Toast.jsx'
import { guardarRetorno, urlDoLogin } from './rotaDeRetorno.js'

/**
 * Sessão encerrada (401) em QUALQUER chamada — inclusive no meio de um polling — manda para o
 * login com RECARGA COMPLETA da página. Recarregar (em vez de só trocar de rota) apaga de uma
 * vez todo o cache em memória com dados da sessão anterior. Ver docs/DECISOES.md.
 *
 * A rota atual é guardada para a pessoa voltar a ela depois de entrar de novo (rotaDeRetorno.js).
 * `expirou=1` só quando JÁ havia sessão (ela caiu); abrir uma rota protegida sem nunca ter
 * entrado leva ao login sem esse aviso.
 */
function irParaLogin(queryClient) {
  if (['/', '/login'].includes(window.location.pathname)) return
  const voltar = window.location.pathname + window.location.search
  const expirou = queryClient.getQueryData(chaves.sessao) !== undefined
  guardarRetorno(voltar)
  window.location.assign(urlDoLogin({ voltar, expirou }))
}

export function Providers({ children }) {
  const [queryClient] = useState(criarQueryClient)

  useEffect(() => {
    configurarCliente({ aoNaoAutenticado: () => irParaLogin(queryClient) })
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
