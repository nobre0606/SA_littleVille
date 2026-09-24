import { ArrowLeft, RotateCw } from 'lucide-react'
import { Botao } from './Botao.jsx'
import { EstadoVazio } from './EstadoVazio.jsx'

/**
 * Estado de erro no mesmo padrão do vazio, escolhido pelo `code` do erro (nunca pelo texto):
 *  - NETWORK_ERROR → sem conexão, com "Tentar de novo"
 *  - FORBIDDEN / NOT_IN_TEAM → sem permissão: tentar de novo não resolve, então a ação é voltar
 *  - NOT_FOUND → "não encontrado" (mascote 404)
 *  - qualquer outro → erro genérico com "Tentar de novo"
 */
export function EstadoErro({ erro, aoTentarDeNovo, voltarPara = '/dashboard', className }) {
  const code = erro?.code

  if (code === 'FORBIDDEN' || code === 'NOT_IN_TEAM') {
    return (
      <EstadoVazio
        variante="erro"
        titulo="Sem permissão"
        descricao={erro?.message ?? 'Você não tem permissão para ver isto.'}
        acao={
          <Botao variante="secundario" icone={ArrowLeft} to={voltarPara}>
            Voltar
          </Botao>
        }
        className={className}
      />
    )
  }

  if (code === 'NOT_FOUND') {
    return (
      <EstadoVazio
        variante="404"
        titulo="Não encontrado"
        descricao="Isto não existe mais ou foi excluído."
        acao={
          <Botao variante="secundario" icone={ArrowLeft} to={voltarPara}>
            Voltar
          </Botao>
        }
        className={className}
      />
    )
  }

  const semRede = code === 'NETWORK_ERROR'
  return (
    <div role="alert" className={className}>
      <EstadoVazio
        variante="erro"
        titulo={semRede ? 'Sem conexão' : 'Algo deu errado'}
        descricao={erro?.message ?? 'Não foi possível carregar agora.'}
        acao={
          aoTentarDeNovo && (
            <Botao icone={RotateCw} onClick={aoTentarDeNovo}>
              Tentar de novo
            </Botao>
          )
        }
      />
    </div>
  )
}
