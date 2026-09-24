import { ChevronLeft, ChevronRight } from 'lucide-react'
import { paginasVisiveis } from '../lib/paginacao.js'
import { cx } from './cx.js'

const BOTAO = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-3 text-16 font-semibold'

/**
 * Paginação. A página vem do SERVIDOR (`page` do envelope); aqui só se escolhe qual pedir.
 * Mobile: "Anterior · 3 de 12 · Próxima" (7 números de 44 px não cabem em 390 px).
 * Desktop: números com reticências (lib/paginacao.js).
 */
export function Paginacao({ pagina, totalPaginas, aoMudar, className }) {
  if (totalPaginas <= 1) return null
  const anterior = pagina > 1
  const proxima = pagina < totalPaginas
  return (
    <nav aria-label="Paginação" className={cx('flex items-center justify-between gap-2 md:justify-center', className)}>
      <button
        type="button"
        onClick={() => aoMudar(pagina - 1)}
        disabled={!anterior}
        className={cx(BOTAO, 'text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:text-ink-3 disabled:hover:bg-transparent')}
      >
        <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        Anterior
      </button>

      <p className="text-16 text-ink-2 md:hidden">
        <span className="font-bold text-ink-1">{pagina}</span> de {totalPaginas}
      </p>

      <ul className="hidden items-center gap-1 md:flex">
        {paginasVisiveis(pagina, totalPaginas).map((p, i) =>
          p === '…' ? (
            <li key={`r${i}`} aria-hidden="true" className="px-2 text-ink-2">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => aoMudar(p)}
                aria-current={p === pagina ? 'page' : undefined}
                aria-label={`Página ${p}`}
                className={cx(BOTAO, p === pagina ? 'bg-primary text-ink-on-primary' : 'text-ink-1 hover:bg-surface-raised')}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        onClick={() => aoMudar(pagina + 1)}
        disabled={!proxima}
        className={cx(BOTAO, 'text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:text-ink-3 disabled:hover:bg-transparent')}
      >
        Próxima
        <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </nav>
  )
}
