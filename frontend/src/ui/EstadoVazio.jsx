import { MascotState } from './mascot/MascotState.jsx'
import { Pegada } from './brand/Pegada.jsx'
import { cx } from './cx.js'

/**
 * Padrão ÚNICO de estado vazio: mascote + título curto + uma linha explicativa + ação
 * principal. Nunca só texto. A trilha de pegadas ao fundo é decorativa.
 *
 * `acao`: um <Botao> (a próxima coisa útil a fazer — ex.: "Registrar avistamento").
 */
export function EstadoVazio({ variante = 'vazio', titulo, descricao, acao, className, nivelTitulo = 2, compacto = false }) {
  const Titulo = `h${nivelTitulo}`
  if (compacto) {
    // Versão para DENTRO de um card (ex.: gráfico sem dados): sem fundo próprio, mascote menor.
    return (
      <div className={cx('flex flex-col items-center gap-3 py-8 text-center', className)}>
        <MascotState variante={variante} tamanho="sm" />
        <Titulo className="font-display text-20 font-semibold text-ink-1">{titulo}</Titulo>
        {descricao && <p className="max-w-sm text-14 text-ink-2">{descricao}</p>}
        {acao}
      </div>
    )
  }
  return (
    <section className={cx('relative overflow-hidden rounded-lg bg-surface-card px-6 py-12 shadow-1', className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-surface-raised">
        {/* Só nas bordas (x ≤ 10% ou ≥ 86%), para nunca passar por trás do texto. */}
        {[
          [4, 18, 30],
          [8, 68, 50],
          [90, 12, 200],
          [86, 60, 220],
          [94, 36, 190],
        ].map(([x, y, r], i) => (
          <Pegada key={i} tamanho={40} rotacao={r} pe={i % 2 ? 'direito' : 'esquerdo'} className="absolute" style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
      </div>
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <MascotState variante={variante} />
        <Titulo className="font-display text-24 font-semibold text-ink-1">{titulo}</Titulo>
        {descricao && <p className="text-16 text-ink-2">{descricao}</p>}
        {acao && <div className="mt-2">{acao}</div>}
      </div>
    </section>
  )
}
