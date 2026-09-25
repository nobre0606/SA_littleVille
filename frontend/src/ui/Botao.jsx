import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { cx } from './cx.js'

const VARIANTES = {
  primario: 'bg-primary text-ink-on-primary hover:bg-primary-hover',
  secundario: 'border border-primary bg-surface-card text-primary hover:bg-primary-soft',
  fantasma: 'bg-transparent text-primary hover:bg-primary-soft',
  perigo: 'bg-danger text-ink-on-primary hover:brightness-90',
  // Ação destrutiva discreta (ex.: ícone de excluir numa linha da tabela). Texto em danger-text.
  perigoDiscreto: 'bg-transparent text-danger-text hover:bg-pastel-rosa',
}

/**
 * Botão do sistema. Altura mínima de 44 px (área de toque) em todas as variantes.
 *
 * - `carregando`: desabilita, mostra o giro e (se houver) troca o texto por `rotuloCarregando`;
 *   o leitor de tela recebe o novo estado por aria-busy.
 * - `to`: vira um <Link> do React Router com a mesma aparência.
 * - Só ícone, sem texto: passe `aria-label` (obrigatório para acessibilidade).
 */
export function Botao({
  variante = 'primario',
  carregando = false,
  rotuloCarregando,
  icone: Icone,
  larguraTotal = false,
  to,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}) {
  const somenteIcone = !children
  const classes = cx(
    'inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-md font-ui text-16 font-semibold',
    'transition-colors duration-(--dur-fast) ease-out disabled:cursor-not-allowed disabled:opacity-60',
    somenteIcone ? 'min-w-11 px-2' : 'px-4',
    larguraTotal && 'w-full',
    VARIANTES[variante],
    className,
  )
  const conteudo = (
    <>
      {carregando ? (
        <LoaderCircle size={20} strokeWidth={1.75} aria-hidden="true" className="animate-spin" />
      ) : (
        Icone && <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
      )}
      {carregando && rotuloCarregando ? rotuloCarregando : children}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {conteudo}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} disabled={disabled || carregando} aria-busy={carregando || undefined} {...props}>
      {conteudo}
    </button>
  )
}
