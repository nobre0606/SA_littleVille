import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chaves } from '../../api/queryClient.js'
import { avistamentos } from '../../api/recursos.js'
import { useServerNow } from '../../hooks/useServerNow.js'
import { atualizarItem, removerItem, restaurarFoto, tirarFoto } from './cache.js'
import { paraApi } from './filtros.js'

/**
 * Consultas e mutações de avistamentos (TanStack Query). As telas usam só estes hooks.
 *
 * ATENÇÃO (bug real achado no e2e): callbacks passados em `mutate(dados, { onSuccess })` NÃO
 * rodam se a tela for desmontada antes da resposta — e as ações otimistas saem da tela na hora.
 * Por isso toast, "Revisar" e "Desfazer" vão nas opções do PRÓPRIO hook (`onSuccess`/`onError`
 * abaixo), que ficam guardadas na mutação e rodam mesmo com a tela já fechada.
 */

/**
 * Lista paginada. Os filtros viram parâmetros da API; o SERVIDOR filtra, ordena e pagina.
 *
 * O "agora" usado no período (ex.: últimos 7 dias) é o do servidor e só muda a cada 60 s. Se
 * fosse o instante de cada renderização, a chave da consulta mudaria o tempo todo e a lista
 * seria buscada sem parar.
 *
 * `placeholderData: keepPreviousData`: ao trocar de página ou filtro, a lista antiga continua
 * na tela (esmaecida) até a nova chegar — nada de "piscar" um carregando a cada clique.
 */
export function useListaAvistamentos(filtros) {
  const agora = useServerNow(60_000)
  const params = paraApi(filtros, agora)
  return useQuery({
    queryKey: chaves.listaAvistamentos(params),
    queryFn: ({ signal }) => avistamentos.listar(params, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useAvistamento(id) {
  return useQuery({
    queryKey: chaves.avistamento(id),
    queryFn: ({ signal }) => avistamentos.obter(id, { signal }),
    select: (envelope) => envelope.data,
  })
}

/** Depois de qualquer mudança: o servidor dá a palavra final nas listas e no dashboard. */
function revalidar(queryClient) {
  queryClient.invalidateQueries({ queryKey: chaves.avistamentos })
  queryClient.invalidateQueries({ queryKey: chaves.dashboard })
}

/**
 * Criar. O otimismo da criação fica na TELA: enquanto a mutação está pendente, a lista mostra
 * um cartão "Enviando…" (useMutationState com esta mutationKey). Não inserimos no cache porque
 * o item novo só aparece em algumas listas (depende de filtro, ordem e página) — decidir onde
 * seria recalcular no front o que o servidor decide.
 */
export const CHAVE_CRIAR = ['avistamentos', 'criar']

export function useCriarAvistamento({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CHAVE_CRIAR,
    mutationFn: (dados) => avistamentos.criar(dados),
    onSuccess: (envelope, dados) => {
      // O detalhe do novo já entra no cache: abrir o item recém-criado é instantâneo.
      queryClient.setQueryData(chaves.avistamento(envelope.data.id), envelope)
      onSuccess?.(envelope, dados)
    },
    onError,
    onSettled: () => revalidar(queryClient),
  })
}

/** Editar, com atualização OTIMISTA e reversão (ver o ciclo em cache.js). */
export function useAtualizarAvistamento({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }) => avistamentos.atualizar(id, dados),
    onMutate: async ({ id, dados }) => {
      await queryClient.cancelQueries({ queryKey: chaves.avistamentos })
      const foto = tirarFoto(queryClient)
      atualizarItem(queryClient, id, (a) => ({ ...a, ...dados }))
      return { foto }
    },
    onSuccess,
    onError: (erro, vars, contexto) => {
      restaurarFoto(queryClient, contexto?.foto)
      onError?.(erro, vars)
    },
    onSettled: () => revalidar(queryClient),
  })
}

/** Excluir, com remoção OTIMISTA e reversão. O "desfazer" é o useRestaurarAvistamento. */
export function useExcluirAvistamento({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    // A variável é o AVISTAMENTO inteiro (não só o id): o toast precisa do nome dele mesmo
    // depois que a tela que pediu a exclusão já saiu.
    mutationFn: (avistamento) => avistamentos.excluir(avistamento.id),
    onMutate: async (avistamento) => {
      await queryClient.cancelQueries({ queryKey: chaves.avistamentos })
      const foto = tirarFoto(queryClient)
      removerItem(queryClient, avistamento.id)
      return { foto }
    },
    onSuccess,
    onError: (erro, avistamento, contexto) => {
      restaurarFoto(queryClient, contexto?.foto)
      onError?.(erro, avistamento)
    },
    onSettled: () => revalidar(queryClient),
  })
}

/**
 * Desfazer a exclusão. Função comum (não hook): é chamada pelo botão do TOAST, que continua na
 * tela depois que a página de origem já saiu — um hook dessa página não existiria mais.
 */
export async function restaurarAvistamento(queryClient, id) {
  try {
    const envelope = await avistamentos.restaurar(id)
    queryClient.setQueryData(chaves.avistamento(id), envelope)
    return envelope
  } finally {
    revalidar(queryClient)
  }
}
