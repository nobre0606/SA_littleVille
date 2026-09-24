import { cx } from './cx.js'

/**
 * Bloco de carregamento. Cada tela usa o Skeleton ESPECÍFICO do seu conteúdo (abaixo), com o
 * mesmo formato do conteúdo real: quando os dados chegam, nada "pula" de lugar.
 */
export function Skeleton({ className, style }) {
  return <div aria-hidden="true" className={cx('lv-skeleton rounded-sm', className)} style={style} />
}

/** Invólucro anunciado ao leitor de tela uma vez (os blocos em si são decorativos). */
function Carregando({ rotulo = 'Carregando…', className, children }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{rotulo}</span>
      {children}
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <Carregando rotulo="Carregando indicador…" className="flex flex-col gap-4 rounded-lg bg-surface-card p-6 shadow-1">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-4 w-40" />
    </Carregando>
  )
}

export function SkeletonChartCard({ altura = 240 }) {
  return (
    <Carregando rotulo="Carregando gráfico…" className="flex flex-col gap-4 rounded-lg bg-surface-card p-6 shadow-1">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="flex items-end gap-2" style={{ height: altura }}>
        {[45, 70, 30, 85, 60, 40, 75].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-sm rounded-b-none" style={{ height: `${h}%` }} />
        ))}
      </div>
    </Carregando>
  )
}

export function SkeletonSightingCard() {
  return (
    <Carregando rotulo="Carregando avistamento…" className="flex flex-col gap-3 rounded-lg bg-surface-card p-4 shadow-1">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </Carregando>
  )
}

export function SkeletonTabela({ linhas = 5, colunas = 4 }) {
  return (
    <Carregando rotulo="Carregando lista…" className="overflow-hidden rounded-lg bg-surface-card shadow-1">
      <div className="flex gap-4 border-b border-border bg-surface-raised p-4">
        {Array.from({ length: colunas }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: linhas }, (_, l) => (
        <div key={l} className="flex gap-4 border-b border-border p-4 last:border-b-0">
          {Array.from({ length: colunas }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" style={{ maxWidth: c === 0 ? '40%' : undefined }} />
          ))}
        </div>
      ))}
    </Carregando>
  )
}
