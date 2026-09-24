import { Botao } from './Botao.jsx'
import { Modal } from './Modal.jsx'

/**
 * Confirmação de ação. O título deve NOMEAR o item ("Excluir o avistamento na Joaquina?"),
 * para a pessoa saber exatamente o que vai acontecer.
 *
 * Em ação destrutiva, o foco inicial vai para "Cancelar": um Enter apressado nunca exclui nada.
 */
export function ConfirmDialog({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  descricao,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  perigoso = false,
  carregando = false,
}) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={carregando ? () => {} : aoFechar}
      titulo={titulo}
      descricao={descricao}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar} disabled={carregando} data-autofocus={perigoso || undefined}>
            {rotuloCancelar}
          </Botao>
          <Botao
            variante={perigoso ? 'perigo' : 'primario'}
            onClick={aoConfirmar}
            carregando={carregando}
            data-autofocus={!perigoso || undefined}
          >
            {rotuloConfirmar}
          </Botao>
        </>
      }
    />
  )
}
