import { iniciais, pastelDoId } from '../lib/avatar.js'
import { cx } from './cx.js'

// Por extenso para o Tailwind gerar as classes.
const FUNDO = {
  lavanda: 'bg-pastel-lavanda',
  azul: 'bg-pastel-azul',
  menta: 'bg-pastel-menta',
  rosa: 'bg-pastel-rosa',
  creme: 'bg-pastel-creme',
}
const TAMANHO = { sm: 'size-8 text-12', md: 'size-10 text-14', lg: 'size-12 text-16' }

/**
 * Iniciais sobre um pastel derivado do id (a mesma pessoa tem sempre a mesma cor). Texto ink-1
 * sobre pastel: ≥ 8:1. Por padrão é decorativo, porque o nome aparece ao lado; sem o nome ao
 * lado, use `decorativo={false}` para o leitor de tela ler o nome.
 */
export function UserAvatar({ id, nome, tamanho = 'md', decorativo = true, className }) {
  const a11y = decorativo ? { 'aria-hidden': true } : { role: 'img', 'aria-label': nome }
  return (
    <span
      {...a11y}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink-1 ring-2 ring-surface-card',
        FUNDO[pastelDoId(id)],
        TAMANHO[tamanho],
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  )
}
