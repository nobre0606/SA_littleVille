import { useMutation, useQuery } from '@tanstack/react-query'
import { sessao } from '../api/recursos.js'
import { chaves } from '../api/queryClient.js'

/**
 * Sessão do usuário logado (GET /api/auth/me). staleTime de 5 min: o nome/papel quase nunca
 * mudam, e qualquer 401 em outra chamada já derruba a sessão pelo client.
 * `select` devolve só o `data` do envelope para as telas.
 */
export function useSessao() {
  return useQuery({
    queryKey: chaves.sessao,
    queryFn: ({ signal }) => sessao.obter({ signal }),
    select: (envelope) => envelope.data,
    staleTime: 5 * 60_000,
  })
}

/**
 * Sair: avisa o servidor (apaga o cookie) e RECARREGA no login. A recarga completa já apaga
 * todo o cache em memória. Não chamamos `queryClient.clear()` antes: isso esvaziaria a sessão
 * com a tela ainda montada, e o layout quebraria por um instante antes da recarga.
 */
export function useSair() {
  return useMutation({
    mutationFn: sessao.sair,
    onSettled: () => window.location.assign('/login'),
  })
}
