import { QueryClient } from '@tanstack/react-query'

/**
 * Configuração do cache do TanStack Query — e o PORQUÊ de cada número:
 *
 * staleTime 30 s: dentro desse tempo, voltar para uma tela usa o cache sem nova chamada
 *   (navegação instantânea). Depois, mostra o cache E busca de novo em segundo plano.
 *   Dados que precisam de mais frescor (chat, 3 s) usam `refetchInterval` na própria query.
 *
 * gcTime 5 min: quanto tempo um dado sem ninguém usando fica guardado antes de ser apagado.
 *
 * retry: erro 4xx é definitivo (dado inválido, sem permissão, não existe) — repetir não
 *   adianta e só atrasa a mensagem de erro. Só vale tentar de novo em falha de rede, 5xx
 *   e 429, no máximo 2 vezes, com espera crescente (1 s, 2 s).
 *
 * refetchIntervalInBackground false (padrão, deixado explícito): polling PARA quando a aba
 *   fica oculta — economiza bateria e dados móveis, e volta sozinho quando a aba reaparece.
 */
const podeRepetir = (erro) => {
  const status = erro?.status ?? 0
  return status === 0 || status === 429 || status >= 500
}

export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (tentativas, erro) => tentativas < 2 && podeRepetir(erro),
        retryDelay: (tentativa) => 1000 * 2 ** tentativa,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
      },
      mutations: {
        // Mutação nunca repete sozinha: repetir um POST poderia criar o avistamento duas vezes.
        retry: false,
      },
    },
  })
}

/**
 * Chaves do cache num lugar só. Hierárquicas de propósito: invalidar `['avistamentos']`
 * invalida a lista (com qualquer filtro) E os detalhes de uma vez só.
 */
export const chaves = {
  sessao: ['sessao'],
  avistamentos: ['avistamentos'],
  listaAvistamentos: (filtros) => ['avistamentos', 'lista', filtros],
  avistamento: (sid) => ['avistamentos', 'detalhe', sid],
  dashboard: ['dashboard'],
  equipes: ['equipes'],
  membros: (tid) => ['equipes', tid, 'membros'],
  mensagens: (tid) => ['equipes', tid, 'mensagens'],
  emergencia: ['emergencia'],
}
