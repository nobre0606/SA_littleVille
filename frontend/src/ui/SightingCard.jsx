import { Link } from 'react-router-dom'
import { Crosshair, MapPin } from 'lucide-react'
import { corDaArea } from '../domain/idadeArea.js'
import { useServerNow } from '../hooks/useServerNow.js'
import { BadgeIdade } from './Badge.jsx'
import { RelativeTime } from './RelativeTime.jsx'
import { UserAvatar } from './UserAvatar.jsx'
import { cx } from './cx.js'

/**
 * Cartão de avistamento (lista no mobile, "mais recentes" do dashboard). O cartão INTEIRO é
 * clicável, mas existe um único link (no título): o `after:` estica a área de clique sobre o
 * cartão sem criar vários links repetidos para o leitor de tela.
 *
 * A faixa do RF04 usa `corDaArea` com a hora do servidor, reavaliada a cada 60 s.
 */
export function SightingCard({ avistamento: a, nivelTitulo = 3, className }) {
  const agora = useServerNow(60_000)
  const faixa = corDaArea(a.vistoEm, agora)
  const Titulo = `h${nivelTitulo}`
  const Origem = a.origemLocal === 'gps' ? Crosshair : MapPin
  return (
    <article
      className={cx(
        'relative flex flex-col gap-3 rounded-lg bg-surface-card p-4 shadow-1 transition-shadow duration-(--dur-fast) hover:shadow-2',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Titulo className="font-display text-20 font-semibold text-ink-1">
          <Link to={`/avistamentos/${a.id}`} className="outline-none after:absolute after:inset-0 after:rounded-lg">
            {a.bairro}
          </Link>
        </Titulo>
        <BadgeIdade faixa={faixa} />
      </div>
      {a.descricao ? (
        <p className="line-clamp-2 text-16 text-ink-1">{a.descricao}</p>
      ) : (
        <p className="text-16 text-ink-2 italic">Sem descrição</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-14 text-ink-2">
        <span className="flex items-center gap-2">
          <UserAvatar id={a.autor.id} nome={a.autor.nome} tamanho="sm" />
          <span className="font-semibold text-ink-1">{a.autor.nome}</span>
        </span>
        <span className="flex items-center gap-1">
          <Origem size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">{a.origemLocal === 'gps' ? 'Local pelo GPS, ' : 'Local marcado no mapa, '}</span>
          <RelativeTime iso={a.vistoEm} />
        </span>
      </div>
    </article>
  )
}
