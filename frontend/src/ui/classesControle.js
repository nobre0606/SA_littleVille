import { cx } from './cx.js'

/**
 * Classes comuns de controle de formulário (Campo e Select), para os dois ficarem idênticos.
 * Borda ink-3 (3.6:1): o mínimo para o contorno de um controle é 3:1 (WCAG 1.4.11).
 * Fonte 16 px: abaixo disso o Safari do iPhone dá zoom ao focar o campo.
 */
export const classesControle = cx(
  'w-full min-h-11 rounded-md border border-ink-3 bg-surface-card px-3 py-2 font-ui text-16 text-ink-1',
  'placeholder:text-ink-2 hover:border-ink-2 transition-colors duration-(--dur-fast)',
  'aria-invalid:border-danger disabled:bg-surface-sunken disabled:text-ink-2',
)
