import { Flame, Hourglass, Snowflake } from 'lucide-react'
import { cx } from './cx.js'

/**
 * Selo: fundo pastel + texto ink-1 + ícone na cor semântica. O TEXTO nunca usa a cor semântica
 * sobre pastel (daria só 3.6–3.9:1); o ÍCONE pode, porque para gráfico o mínimo é 3:1.
 */
const TONS = {
  neutro: { fundo: 'bg-surface-raised', icone: 'text-ink-2' },
  primario: { fundo: 'bg-primary-soft', icone: 'text-primary' },
  sucesso: { fundo: 'bg-pastel-menta', icone: 'text-success' },
  aviso: { fundo: 'bg-pastel-creme border border-border', icone: 'text-icone-warning' },
  perigo: { fundo: 'bg-pastel-rosa', icone: 'text-danger' },
  info: { fundo: 'bg-pastel-azul', icone: 'text-info' },
}

const BASE = 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-12 font-bold whitespace-nowrap text-ink-1'

export function Badge({ tom = 'neutro', icone: Icone, children, className }) {
  const t = TONS[tom]
  return (
    <span className={cx(BASE, t.fundo, className)}>
      {Icone && <Icone size={16} strokeWidth={1.75} aria-hidden="true" className={t.icone} />}
      {children}
    </span>
  )
}

/**
 * Selo da idade da área (RF04). Recebe o resultado de `corDaArea()`: cor + ícone + rótulo,
 * nunca só a cor (quem não distingue vermelho de laranja ainda lê "Recente" e vê a chama).
 */
const IDADE = {
  fresh: { tom: 'perigo', icone: Flame, cor: 'text-status-fresh' },
  warm: { tom: 'aviso', icone: Hourglass, cor: 'text-status-warm' },
  cold: { tom: 'neutro', icone: Snowflake, cor: 'text-status-cold' },
}

export function BadgeIdade({ faixa, className }) {
  const d = IDADE[faixa.estado]
  const Icone = d.icone
  return (
    <span className={cx(BASE, TONS[d.tom].fundo, className)}>
      <Icone size={16} strokeWidth={1.75} aria-hidden="true" className={d.cor} />
      <span>
        <span className="sr-only">Área: </span>
        {faixa.rotulo}
      </span>
    </span>
  )
}
