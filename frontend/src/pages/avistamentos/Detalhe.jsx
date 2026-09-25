import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Crosshair, MapPin, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { corDaArea } from '../../domain/idadeArea.js'
import { useAvistamento } from '../../features/avistamentos/consultas.js'
import { formatarCoordenada } from '../../features/avistamentos/formulario.js'
import { nomeDoAvistamento, useExcluirComDesfazer } from '../../features/avistamentos/useExcluirComDesfazer.js'
import { MiniMapa } from '../../features/mapa/MiniMapa.jsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useServerNow } from '../../hooks/useServerNow.js'
import { formatarDataHoraCompleta } from '../../lib/format.js'
import { BadgeIdade } from '../../ui/Badge.jsx'
import { Botao } from '../../ui/Botao.jsx'
import { ConfirmDialog } from '../../ui/ConfirmDialog.jsx'
import { EstadoErro } from '../../ui/EstadoErro.jsx'
import { PageHeader } from '../../ui/PageHeader.jsx'
import { RelativeTime } from '../../ui/RelativeTime.jsx'
import { Skeleton } from '../../ui/Skeleton.jsx'
import { UserAvatar } from '../../ui/UserAvatar.jsx'

const VOLTAR = { para: '/avistamentos', rotulo: 'Avistamentos' }

/** RF07 — detalhe: dados completos, mini-mapa com a área de 1 km, autor e tempo relativo. */
export default function DetalheAvistamento() {
  const { id } = useParams()
  const consulta = useAvistamento(id)
  useDocumentTitle(consulta.data ? `Avistamento em ${consulta.data.bairro}` : 'Avistamento')

  if (consulta.isPending) return <DetalheCarregando />
  if (consulta.isError) {
    return (
      <>
        <PageHeader titulo="Avistamento" voltar={VOLTAR} />
        <EstadoErro erro={consulta.error} aoTentarDeNovo={consulta.refetch} voltarPara="/avistamentos" />
      </>
    )
  }
  return <Detalhe avistamento={consulta.data} />
}

function Detalhe({ avistamento: a }) {
  const navigate = useNavigate()
  const agora = useServerNow(60_000)
  const { excluir } = useExcluirComDesfazer()
  const [confirmando, setConfirmando] = useState(false)
  const nome = nomeDoAvistamento(a, agora)
  const editado = a.updatedAt !== a.createdAt
  const Origem = a.origemLocal === 'gps' ? Crosshair : MapPin

  return (
    <>
      <PageHeader
        voltar={VOLTAR}
        titulo={a.bairro}
        descricao={
          <>
            Visto <RelativeTime iso={a.vistoEm} /> por {a.autor.nome}
          </>
        }
        acoes={
          <>
            {/* Botões só quando o SERVIDOR permite (acoes) — o 403 do servidor é a garantia real. */}
            {a.acoes.podeEditar && (
              <Botao variante="secundario" icone={Pencil} to={`/avistamentos/${a.id}/editar`}>
                Editar
              </Botao>
            )}
            {a.acoes.podeExcluir && (
              <Botao variante="perigo" icone={Trash2} onClick={() => setConfirmando(true)}>
                Excluir
              </Botao>
            )}
          </>
        }
      />

      <div className="lv-grid">
        <section aria-label="Dados do avistamento" className="col-span-4 flex flex-col gap-6 rounded-lg bg-surface-card p-6 shadow-1 lg:col-span-5">
          <div className="flex flex-col gap-3">
            <BadgeIdade faixa={corDaArea(a.vistoEm, agora)} className="self-start" />
            {a.descricao ? (
              <p className="text-16 whitespace-pre-line text-ink-1">{a.descricao}</p>
            ) : (
              <p className="text-16 text-ink-2 italic">Sem descrição.</p>
            )}
          </div>

          <dl className="flex flex-col gap-4">
            <Item rotulo="Visto em">
              <time dateTime={a.vistoEm}>{formatarDataHoraCompleta(a.vistoEm)}</time>
              <span className="text-ink-2">
                {' '}
                (<RelativeTime iso={a.vistoEm} />)
              </span>
            </Item>
            <Item rotulo="Registrado por">
              <span className="flex items-center gap-2">
                <UserAvatar id={a.autor.id} nome={a.autor.nome} tamanho="sm" />
                {a.autor.nome}
              </span>
            </Item>
            <Item rotulo="Local">
              <span className="flex items-start gap-2">
                <Origem size={16} strokeWidth={1.75} aria-hidden="true" className="mt-1 shrink-0 text-ink-2" />
                <span>
                  {a.bairro} · {formatarCoordenada(a.lat)}, {formatarCoordenada(a.lng)}
                  <br />
                  <span className="text-14 text-ink-2">
                    {a.origemLocal === 'gps'
                      ? `Pela localização do aparelho${a.precisaoM ? ` (precisão de ±${a.precisaoM} m)` : ''}`
                      : 'Marcado no mapa'}
                  </span>
                </span>
              </span>
            </Item>
            {editado && (
              <Item rotulo="Última edição">
                <RelativeTime iso={a.updatedAt} />
              </Item>
            )}
          </dl>

          {a.acoes.podeExcluir && !a.acoes.podeEditar && (
            <p className="flex items-start gap-2 rounded-md bg-primary-soft p-3 text-14 text-ink-1">
              <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-primary" />
              Como Admin, você pode excluir este avistamento (moderação). Editar é só de quem registrou.
            </p>
          )}
        </section>

        <MiniMapa avistamento={a} className="col-span-4 h-72 lg:col-span-7 lg:h-auto lg:min-h-96" />
      </div>

      <ConfirmDialog
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        aoConfirmar={() => {
          setConfirmando(false)
          // Sai da tela JÁ: a exclusão é otimista (o item some do cache na hora).
          excluir(a, { aoIniciar: () => navigate('/avistamentos', { replace: true }) })
        }}
        perigoso
        titulo={`Excluir o avistamento “${nome}”?`}
        descricao="Ele some da lista, do mapa e do dashboard. Você terá 10 segundos para desfazer."
        rotuloConfirmar="Excluir"
      />
    </>
  )
}

function Item({ rotulo, children }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-14 font-semibold text-ink-2">{rotulo}</dt>
      <dd className="m-0 text-16 text-ink-1">{children}</dd>
    </div>
  )
}

/** Skeleton no formato do detalhe: cabeçalho, cartão de dados e mapa. */
function DetalheCarregando() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Carregando avistamento…</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-64" />
      <div className="lv-grid">
        <div className="col-span-4 flex flex-col gap-4 rounded-lg bg-surface-card p-6 shadow-1 lg:col-span-5">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-12 w-3/5" />
        </div>
        <Skeleton className="col-span-4 h-72 rounded-md lg:col-span-7 lg:h-96" />
      </div>
    </div>
  )
}
