import { useQueryClient } from '@tanstack/react-query'
import { relogioServidor } from '../../api/serverClock.js'
import { formatarTempoRelativo } from '../../lib/format.js'
import { useToast } from '../../ui/Toast.jsx'
import { restaurarAvistamento, useExcluirAvistamento } from './consultas.js'

/**
 * Nome curto e inequívoco de um avistamento, para confirmação e toast:
 * "Joaquina, há 12 min". Bairro + quando identificam o item sem depender da descrição
 * (que é opcional e pode estar vazia).
 */
export const nomeDoAvistamento = (a, agoraMs) => `${a.bairro}, ${formatarTempoRelativo(a.vistoEm, agoraMs)}`

/**
 * Excluir com "Desfazer" (RN04): some da tela na hora (otimista), e o toast oferece desfazer
 * por 10 s. O servidor aceita restaurar por 30 s (folga para latência).
 *
 * Os avisos ficam nas opções do hook (e não no `mutate`) porque quem exclui pela tela de
 * detalhe sai dela na hora — ver o comentário do topo de consultas.js.
 */
export function useExcluirComDesfazer() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  // Nome calculado no momento do aviso, com a hora do servidor daquele instante.
  const nome = (a) => nomeDoAvistamento(a, relogioServidor.agora())

  const excluir = useExcluirAvistamento({
    onSuccess: (_envelope, a) =>
      toast({
        mensagem: `Avistamento “${nome(a)}” excluído.`,
        acao: {
          rotulo: 'Desfazer',
          aoClicar: () =>
            restaurarAvistamento(queryClient, a.id).then(
              () => toast({ tom: 'info', mensagem: `Exclusão desfeita: “${nome(a)}” voltou.` }),
              (erro) => toast({ tom: 'erro', mensagem: erro.message }),
            ),
        },
      }),
    // A remoção otimista já foi revertida pelo hook; aqui só avisamos.
    onError: (erro) => toast({ tom: 'erro', mensagem: `Não foi possível excluir: ${erro.message}` }),
  })

  return {
    pendente: excluir.isPending,
    /**
     * `aoIniciar`: roda JÁ, antes da resposta (ex.: sair da tela de detalhe). A exclusão é
     * otimista: esperar o servidor para sair mostraria "não encontrado" por um instante.
     */
    excluir(avistamento, { aoIniciar } = {}) {
      aoIniciar?.()
      excluir.mutate(avistamento)
    },
  }
}
