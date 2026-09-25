import { chaves } from '../../api/queryClient.js'

/**
 * Operações no cache do TanStack Query para as AÇÕES OTIMISTAS (editar/excluir aparecem na
 * tela antes da resposta do servidor).
 *
 * O ciclo é sempre o mesmo, e é o que dá para explicar na defesa:
 *   1. onMutate: cancela buscas em andamento (para não sobrescreverem a mudança), TIRA UMA FOTO
 *      do cache e aplica a mudança na tela;
 *   2. onError: devolve a foto — a tela volta exatamente ao que era antes (reversão);
 *   3. onSettled: invalida, e o servidor dá a palavra final (inclusive a ordem e a paginação,
 *      que o front não recalcula).
 *
 * Nada aqui filtra ou reordena a lista: só troca ou tira um item que JÁ está na página, pelo id.
 */

/** Foto de todas as consultas de avistamentos (listas com qualquer filtro + detalhes). */
export function tirarFoto(queryClient) {
  return queryClient.getQueriesData({ queryKey: chaves.avistamentos })
}

export function restaurarFoto(queryClient, foto) {
  for (const [chave, dados] of foto ?? []) queryClient.setQueryData(chave, dados)
}

const ehLista = (chave) => chave[1] === 'lista'

/** Troca o item `id` pelo resultado de `fn(item)` em todas as listas e no detalhe. */
export function atualizarItem(queryClient, id, fn) {
  queryClient.setQueriesData({ queryKey: chaves.avistamentos }, (envelope) => {
    if (!envelope?.data) return envelope
    if (Array.isArray(envelope.data)) {
      return { ...envelope, data: envelope.data.map((a) => (a.id === id ? fn(a) : a)) }
    }
    return envelope.data.id === id ? { ...envelope, data: fn(envelope.data) } : envelope
  })
}

/** Tira o item `id` de todas as listas (e ajusta o total mostrado), e apaga o detalhe dele. */
export function removerItem(queryClient, id) {
  for (const [chave, envelope] of queryClient.getQueriesData({ queryKey: chaves.avistamentos })) {
    if (!envelope?.data) continue
    if (ehLista(chave) && envelope.data.some((a) => a.id === id)) {
      queryClient.setQueryData(chave, {
        ...envelope,
        data: envelope.data.filter((a) => a.id !== id),
        page: envelope.page ? { ...envelope.page, total: Math.max(0, envelope.page.total - 1) } : envelope.page,
      })
    }
  }
  queryClient.removeQueries({ queryKey: chaves.avistamento(id), exact: true })
}
