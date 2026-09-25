import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chaves } from '../../api/queryClient.js'
import { equipes } from '../../api/recursos.js'

/**
 * Equipe (RF03). Regra de negócio (RN05) é do servidor: uma equipe por vez — criar ou entrar
 * estando em outra dá 409 ALREADY_IN_TEAM. A tela só mostra o que o servidor devolve.
 */

export function useMinhaEquipe() {
  return useQuery({
    queryKey: chaves.equipes,
    queryFn: ({ signal }) => equipes.minhas({ signal }),
    // GET /api/teams devolve lista (0 ou 1 item — contrato §6): a tela quer "a equipe ou nada".
    select: (envelope) => envelope.data[0] ?? null,
  })
}

export function useMembros(tid) {
  return useQuery({
    queryKey: chaves.membros(tid),
    queryFn: ({ signal }) => equipes.membros(tid, { signal }),
    select: (envelope) => envelope.data,
    enabled: Boolean(tid),
  })
}

/** Entrar, criar ou sair muda a equipe E a sessão (user.equipeId): as duas são revalidadas. */
function aoMudarDeEquipe(queryClient) {
  queryClient.invalidateQueries({ queryKey: chaves.equipes })
  queryClient.invalidateQueries({ queryKey: chaves.sessao })
}

export function useCriarEquipe() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (nome) => equipes.criar({ nome }), onSuccess: () => aoMudarDeEquipe(queryClient) })
}

export function useEntrarEquipe() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (codigo) => equipes.entrar(codigo), onSuccess: () => aoMudarDeEquipe(queryClient) })
}

export function useSairEquipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tid) => equipes.sair(tid),
    onSuccess: (_r, tid) => {
      queryClient.removeQueries({ queryKey: chaves.membros(tid) })
      aoMudarDeEquipe(queryClient)
    },
  })
}
