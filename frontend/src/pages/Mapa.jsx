import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Flame, Hourglass, List, LocateOff, Map as IconeMapa, Plus, Snowflake } from 'lucide-react'
import { chaves } from '../api/queryClient.js'
import { avistamentos as apiAvistamentos, emergencia, equipes } from '../api/recursos.js'
import { useSessao } from '../app/sessao.js'
import { FAIXAS, corDaArea } from '../domain/idadeArea.js'
import { formatarDistancia, ordenarPorDistanciaEHora } from '../domain/distancia.js'
import { CamadaAreas, CamadaAvistamentos, CamadaEmergencia, CamadaEquipe, MinhaPosicao } from '../features/mapa/Camadas.jsx'
import { MapaBase } from '../features/mapa/MapaBase.jsx'
import { ContatosEmergencia, TipoEmergencia } from '../features/mapa/PainelEmergencia.jsx'
import { useCompartilharPosicao } from '../features/mapa/useCompartilharPosicao.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useServerNow } from '../hooks/useServerNow.js'
import { BadgeIdade } from '../ui/Badge.jsx'
import { Botao } from '../ui/Botao.jsx'
import { EstadoErro } from '../ui/EstadoErro.jsx'
import { EstadoVazio } from '../ui/EstadoVazio.jsx'
import { Modal } from '../ui/Modal.jsx'
import { PageHeader } from '../ui/PageHeader.jsx'
import { RelativeTime } from '../ui/RelativeTime.jsx'
import { SegmentedControl } from '../ui/SegmentedControl.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'

const HORA = 60 * 60 * 1000
const MINUTO = 60 * 1000

/**
 * RF01 (mapa), RF02 (emergência), RF04 (área de 1 km por idade) e RF09 (posição).
 *
 * Mostra os avistamentos das últimas 24 h (contrato §4: `de` = agora − 24 h, até 100 itens),
 * os locais de emergência e a equipe. A idade de cada área é reavaliada a cada 60 s com a hora
 * do SERVIDOR (useServerNow) — sem buscar nada de novo, só redesenhando o que mudou de faixa.
 */
export default function Mapa() {
  useDocumentTitle('Mapa')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const visao = params.get('visao') === 'lista' ? 'lista' : 'mapa'
  const agora = useServerNow(60_000)
  const { posicao, estado } = useCompartilharPosicao()
  const { data: sessao } = useSessao()
  const [localAberto, setLocalAberto] = useState(null)

  // "de" arredondado ao minuto: a chave da consulta só muda uma vez por minuto (não a cada render).
  const de = new Date(Math.floor((agora - 24 * HORA) / MINUTO) * MINUTO).toISOString()
  const filtros = { de, sort: '-vistoEm', page: 1, pageSize: 100 }
  const avist = useQuery({
    queryKey: chaves.listaAvistamentos(filtros),
    queryFn: ({ signal }) => apiAvistamentos.listar(filtros, { signal }),
    select: (e) => e.data,
    placeholderData: (anterior) => anterior,
  })
  const locais = useQuery({
    queryKey: chaves.emergencia,
    queryFn: ({ signal }) => emergencia.locais({ signal }),
    select: (e) => e.data,
    staleTime: 60 * MINUTO, // lista quase fixa
  })
  const minhaEquipe = useQuery({ queryKey: chaves.equipes, queryFn: ({ signal }) => equipes.minhas({ signal }), select: (e) => e.data[0] ?? null })
  const tid = minhaEquipe.data?.id
  const membros = useQuery({
    queryKey: chaves.membros(tid),
    queryFn: ({ signal }) => equipes.membros(tid, { signal }),
    select: (e) => e.data,
    enabled: Boolean(tid),
  })

  const itens = avist.data ?? []

  return (
    <>
      <PageHeader
        titulo="Mapa"
        descricao="Avistamentos das últimas 24 horas, sua equipe e os locais de emergência."
        acoes={
          <>
            <SegmentedControl
              rotulo="Visualização"
              valor={visao}
              aoMudar={(v) => setParams(v === 'lista' ? { visao: 'lista' } : {}, { replace: true })}
              opcoes={[
                { valor: 'mapa', rotulo: 'Mapa', icone: IconeMapa },
                { valor: 'lista', rotulo: 'Lista', icone: List },
              ]}
            />
            <Botao icone={Plus} to="/avistamentos/novo">
              Registrar
            </Botao>
          </>
        }
      />

      {estado === 'negado' || estado === 'indisponivel' ? (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-md bg-surface-raised px-4 py-2 text-14 text-ink-1">
          <LocateOff size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-2" />
          Sua posição não está sendo compartilhada com a equipe (localização desativada). O mapa funciona normalmente.
        </p>
      ) : null}

      {avist.isPending ? (
        <Skeleton className="h-96 w-full rounded-md" />
      ) : avist.isError && !avist.data ? (
        <EstadoErro erro={avist.error} aoTentarDeNovo={avist.refetch} />
      ) : visao === 'mapa' ? (
        <div className="flex flex-col gap-4">
          <MapaBase
            preferCanvas // áreas (círculos) desenhadas em canvas: muito mais leve com dezenas delas
            centro={posicao ? [posicao.lat, posicao.lng] : undefined}
            rotulo="Mapa da vila com áreas de avistamento, equipe e locais de emergência. Use Tab para percorrer os marcadores e Enter para abrir."
            className="h-[60dvh] min-h-80"
          >
            <CamadaAreas avistamentos={itens} agora={agora} />
            <CamadaAvistamentos avistamentos={itens} agora={agora} aoAbrir={(id) => navigate(`/avistamentos/${id}`)} />
            <CamadaEmergencia locais={locais.data ?? []} aoSelecionar={setLocalAberto} />
            <CamadaEquipe membros={membros.data ?? []} agora={agora} euId={sessao.user.id} />
            <MinhaPosicao posicao={posicao} />
          </MapaBase>
          <Legenda />
        </div>
      ) : (
        <ListaPorDistancia itens={itens} posicao={posicao} agora={agora} />
      )}

      <Modal
        variante="sheet"
        aberto={localAberto !== null}
        aoFechar={() => setLocalAberto(null)}
        titulo={localAberto?.nome ?? ''}
      >
        {localAberto && (
          <div className="flex flex-col gap-4">
            <TipoEmergencia tipo={localAberto.tipo} />
            <ContatosEmergencia local={localAberto} />
          </div>
        )}
      </Modal>
    </>
  )
}

/**
 * Legenda do RF04: cada faixa tem ícone, rótulo E estilo de traço (sólido, tracejado,
 * pontilhado) — quem não distingue as cores identifica pela linha.
 */
const ICONE_FAIXA = { fresh: Flame, warm: Hourglass, cold: Snowflake }
const TRACO_CSS = { solido: 'border-solid', tracejado: 'border-dashed', pontilhado: 'border-dotted' }
const COR_FAIXA = { fresh: 'border-status-fresh', warm: 'border-status-warm', cold: 'border-status-cold' }

function Legenda() {
  return (
    <section aria-labelledby="titulo-legenda" className="rounded-lg bg-surface-card p-4 shadow-1">
      <h2 id="titulo-legenda" className="mb-3 text-14 font-bold text-ink-1">
        Área de 1 km de cada avistamento
      </h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {Object.values(FAIXAS).map((f) => {
          const Icone = ICONE_FAIXA[f.estado]
          return (
            <li key={f.estado} className="flex items-center gap-2 text-14 text-ink-1">
              <span aria-hidden="true" className={`inline-block w-8 border-t-4 ${TRACO_CSS[f.traco]} ${COR_FAIXA[f.estado]}`} />
              <Icone size={16} strokeWidth={1.75} aria-hidden="true" className={`text-${f.token}`} />
              <span>
                <strong className="font-bold">{f.rotulo}</strong> ({f.estado === 'fresh' ? 'menos de 1 h' : f.estado === 'warm' ? 'de 1 a 2 h' : 'mais de 2 h'}, traço {f.traco})
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * Visão em LISTA dos mesmos avistamentos do mapa, por distância (se a posição é conhecida) e
 * hora. É o caminho acessível do mapa: uma lista de links comum, navegável por Tab.
 */
function ListaPorDistancia({ itens, posicao, agora }) {
  if (itens.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum avistamento nas últimas 24 horas"
        descricao="A vila está calma. Viu algo? Registre para a equipe saber."
        acao={
          <Botao icone={Plus} to="/avistamentos/novo">
            Registrar avistamento
          </Botao>
        }
      />
    )
  }
  const ordenados = ordenarPorDistanciaEHora(itens, posicao)
  return (
    <section aria-label="Avistamentos das últimas 24 horas">
      <p className="mb-3 text-14 text-ink-2">{posicao ? 'Do mais perto para o mais longe de você.' : 'Do mais recente para o mais antigo (sua posição não está disponível).'}</p>
      <ol className="flex flex-col gap-2">
        {ordenados.map((a) => (
          <li key={a.id}>
            <Link
              to={`/avistamentos/${a.id}`}
              className="flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-md bg-surface-card p-4 shadow-1 hover:shadow-2"
            >
              <span className="flex flex-col">
                <span className="font-display text-20 font-semibold text-ink-1">{a.bairro}</span>
                <span className="text-14 text-ink-2">
                  <RelativeTime iso={a.vistoEm} /> · {a.autor.nome}
                </span>
              </span>
              <span className="flex items-center gap-3">
                {a.distanciaM !== null && <span className="text-16 font-bold text-ink-1">{formatarDistancia(a.distanciaM)}</span>}
                <BadgeIdade faixa={corDaArea(a.vistoEm, agora)} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
