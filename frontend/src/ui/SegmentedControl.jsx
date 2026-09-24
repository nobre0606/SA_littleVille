import { useRef } from 'react'
import { cx } from './cx.js'

/**
 * Alternância exclusiva (ex.: Mapa | Lista). Segue o padrão ARIA de radiogroup: Tab entra no
 * grupo pela opção ativa e as SETAS trocam de opção (a mesma navegação de um grupo de rádio).
 *
 * opcoes: [{ valor, rotulo, icone? }]
 */
export function SegmentedControl({ rotulo, opcoes, valor, aoMudar, className }) {
  const refs = useRef([])

  const aoTeclar = (e, i) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!delta) return
    e.preventDefault()
    const proximo = (i + delta + opcoes.length) % opcoes.length
    aoMudar(opcoes[proximo].valor)
    refs.current[proximo]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={rotulo} className={cx('inline-flex rounded-full bg-surface-sunken p-1', className)}>
      {opcoes.map((o, i) => {
        const ativo = o.valor === valor
        const Icone = o.icone
        return (
          <button
            key={o.valor}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => aoMudar(o.valor)}
            onKeyDown={(e) => aoTeclar(e, i)}
            className={cx(
              'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-14 font-semibold transition-colors duration-(--dur-fast)',
              ativo ? 'bg-surface-card text-primary shadow-1' : 'text-ink-2 hover:text-ink-1',
            )}
          >
            {Icone && <Icone size={16} strokeWidth={1.75} aria-hidden="true" />}
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
