import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cx } from './cx.js'

/**
 * Modal sobre o <dialog> NATIVO (showModal). Por que nativo: o navegador já prende o foco
 * dentro, torna o resto da página inerte para leitor de tela, fecha com Esc e devolve o foco
 * ao botão que abriu. Reimplementar isso à mão é onde modais costumam falhar em acessibilidade.
 *
 * `variante="sheet"`: no mobile (< 768 px) vira uma folha presa na base da tela, que sobe;
 * no desktop continua um modal centralizado.
 *
 * Controlado: quem usa decide `aberto` e recebe `aoFechar` (Esc, clique fora ou botão X).
 */
export function Modal({ aberto, aoFechar, titulo, descricao, children, rodape, variante = 'modal', className }) {
  const ref = useRef(null)
  const idTitulo = useId()
  const idDescricao = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) {
      dialogo.showModal()
      // O `autoFocus` do React dispara quando o botão MONTA — antes do showModal — e o
      // navegador então joga o foco no primeiro elemento (o X). Por isso quem quer o foco
      // inicial se marca com `data-autofocus` e o aplicamos aqui, com o diálogo já aberto.
      dialogo.querySelector('[data-autofocus]')?.focus()
    }
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto])

  const sheet = variante === 'sheet'
  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={descricao ? idDescricao : undefined}
      // Esc: o navegador fecharia sozinho; cancelamos e deixamos o estado do React mandar.
      onCancel={(e) => {
        e.preventDefault()
        aoFechar()
      }}
      // Clique no fundo escurecido (o próprio <dialog>, fora do conteúdo) fecha.
      onClick={(e) => e.target === ref.current && aoFechar()}
      className={cx(
        'lv-dialog m-auto w-[calc(100%-32px)] max-w-lg rounded-lg bg-surface-card p-0 text-ink-1 shadow-3',
        sheet && 'lv-sheet max-md:mb-0 max-md:w-full max-md:max-w-full max-md:rounded-b-none',
        className,
      )}
    >
      {aberto && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-4 p-6 pb-4">
            <div className="flex flex-col gap-1">
              <h2 id={idTitulo} className="font-display text-24 font-semibold text-ink-1">
                {titulo}
              </h2>
              {descricao && (
                <p id={idDescricao} className="text-16 text-ink-2">
                  {descricao}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-raised"
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-6 pb-4">{children}</div>}
          {rodape && (
            <div className="flex flex-col-reverse gap-3 border-t border-border p-6 pt-4 md:flex-row md:justify-end">{rodape}</div>
          )}
        </div>
      )}
    </dialog>
  )
}
