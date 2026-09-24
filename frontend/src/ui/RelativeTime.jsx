import { useServerNow } from '../hooks/useServerNow.js'
import { formatarDataHoraCompleta, formatarTempoRelativo } from '../lib/format.js'

/**
 * "há 40 min", calculado com a hora do SERVIDOR e atualizado a cada 60 s. O <time dateTime>
 * guarda a data exata (máquina/leitor de tela) e o title mostra a data completa no hover.
 */
export function RelativeTime({ iso, className }) {
  const agora = useServerNow(60_000)
  return (
    <time dateTime={iso} title={formatarDataHoraCompleta(iso)} className={className}>
      {formatarTempoRelativo(iso, agora)}
    </time>
  )
}
