import { Check } from 'lucide-react'
import { cx } from './cx.js'

/**
 * Filtros em "chips" (ex.: período: Hoje · 7 dias · 30 dias). Botões com aria-pressed: o
 * estado é anunciado pelo leitor de tela e mostrado com ✓ + fundo, não só com cor.
 * Quebram linha em telas estreitas (nunca rolagem lateral).
 *
 * `multiplo`: permite vários ao mesmo tempo; senão, um só (clicar no ativo não o desmarca).
 * O filtro vira parâmetro da API — quem filtra de verdade é o servidor.
 */
export function FilterChips({ rotulo, opcoes, selecionados, aoMudar, multiplo = false, className }) {
  const alternar = (valor) => {
    if (!multiplo) return aoMudar([valor])
    aoMudar(selecionados.includes(valor) ? selecionados.filter((v) => v !== valor) : [...selecionados, valor])
  }
  return (
    <div role="group" aria-label={rotulo} className={cx('flex flex-wrap gap-2', className)}>
      {opcoes.map((o) => {
        const ativo = selecionados.includes(o.valor)
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => alternar(o.valor)}
            className={cx(
              'inline-flex min-h-11 items-center gap-1 rounded-full border px-4 text-14 font-semibold transition-colors duration-(--dur-fast)',
              ativo ? 'border-primary bg-primary-soft text-primary' : 'border-ink-3 bg-surface-card text-ink-1 hover:bg-surface-raised',
            )}
          >
            {ativo && <Check size={16} strokeWidth={1.75} aria-hidden="true" />}
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
