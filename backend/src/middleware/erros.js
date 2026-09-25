import { ErroApi, erro } from '../lib/resposta.js'

/** Rota inexistente: 404 no formato do contrato (nunca a página HTML padrão do Express). */
export function rotaNaoEncontrada(_req, res) {
  return erro(res, 'NOT_FOUND', 'Rota não encontrada.')
}

/**
 * Último middleware: transforma QUALQUER erro em resposta do contrato.
 *  - ErroApi (lançado de propósito pelos controllers) → o código dele;
 *  - corpo acima do limite / JSON malformado (vindos do express.json) → 413 / 400;
 *  - qualquer outra coisa → 500 SEM detalhes internos em produção (a mensagem de um erro de
 *    banco pode revelar nome de tabela, coluna ou dado). Em desenvolvimento, loga a pilha.
 */
export function tratarErros({ producao }) {
  // 4 parâmetros (mesmo sem usar o último): é assim que o Express reconhece um tratador de erro.
  return (e, _req, res, _next) => {
    if (e instanceof ErroApi) return erro(res, e.code, e.message, e.fields)
    if (e?.type === 'entity.too.large') return erro(res, 'PAYLOAD_TOO_LARGE', 'O conteúdo enviado é grande demais.')
    if (e?.type === 'entity.parse.failed') return erro(res, 'VALIDATION_ERROR', 'Corpo da requisição não é um JSON válido.')
    if (!producao) console.error(e)
    else console.error('[erro interno]', e?.name, e?.code ?? '')
    return erro(res, 'INTERNAL_ERROR', producao ? 'Algo deu errado no servidor. Tente de novo.' : `Erro interno: ${e?.message}`)
  }
}
