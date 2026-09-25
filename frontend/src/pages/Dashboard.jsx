import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowRight, Footprints, Plus, TrendingUp, UserRound } from 'lucide-react'
import { chaves } from '../api/queryClient.js'
import { dashboard } from '../api/recursos.js'
import { useListaAvistamentos } from '../features/avistamentos/consultas.js'
import { PADRAO } from '../features/avistamentos/filtros.js'
import { GraficoPorBairro, GraficoPorDia, GraficoPorPeriodo } from '../features/dashboard/Graficos.jsx'
import { FAIXA_PERIODO, ROTULO_PERIODO, diaCurto } from '../features/dashboard/rotulos.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { Botao } from '../ui/Botao.jsx'
import { ChartCard } from '../ui/ChartCard.jsx'
import { EstadoErro } from '../ui/EstadoErro.jsx'
import { EstadoVazio } from '../ui/EstadoVazio.jsx'
import { PageHeader } from '../ui/PageHeader.jsx'
import { SightingCard } from '../ui/SightingCard.jsx'
import { SkeletonChartCard, SkeletonSightingCard, SkeletonStatCard } from '../ui/Skeleton.jsx'
import { StatCard } from '../ui/StatCard.jsx'

/**
 * RF08 — Dashboard. TODO número desta tela vem pronto de GET /api/dashboard/stats (RN10: o
 * front não calcula estatística — nem soma, nem média, nem porcentagem). A tela só formata e
 * desenha. Depois de criar/editar/excluir um avistamento, o cache do dashboard é invalidado
 * (features/avistamentos/consultas.js) e os números se atualizam sozinhos.
 */
export default function Dashboard() {
  useDocumentTitle('Dashboard')
  const stats = useQuery({
    queryKey: chaves.dashboard,
    queryFn: ({ signal }) => dashboard.estatisticas({ signal }),
    select: (envelope) => envelope.data,
  })
  // Os 5 mais recentes vêm da própria lista paginada do servidor (contrato §5), sem rota nova.
  const recentes = useListaAvistamentos({ ...PADRAO })
  const compacto = useMediaQuery('(max-width: 767px)')

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        descricao="O que está acontecendo na vila, com dados do servidor."
        acoes={
          <Botao icone={Plus} to="/avistamentos/novo">
            Registrar avistamento
          </Botao>
        }
      />
      {stats.isPending ? (
        <Carregando />
      ) : stats.isError ? (
        <EstadoErro erro={stats.error} aoTentarDeNovo={stats.refetch} />
      ) : (
        <Conteudo s={stats.data} recentes={recentes} compacto={compacto} />
      )}
    </>
  )
}

function Conteudo({ s, recentes, compacto }) {
  const vazio = s.total === 0
  const periodo30 = s.seriePorDia.length ? `Últimos 30 dias · ${diaCurto(s.seriePorDia[0].data)} a ${diaCurto(s.seriePorDia.at(-1).data)}` : ''

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------- indicadores */}
      <section aria-label="Indicadores" className="lv-grid">
        <StatCard className="col-span-2 lg:col-span-3" rotulo="Total de avistamentos" valor={s.total} icone={Footprints} />
        <StatCard
          className="col-span-2 lg:col-span-3"
          rotulo="Últimos 7 dias"
          valor={s.ultimos7Dias.total}
          icone={TrendingUp}
          pastel="azul"
          // Mais avistamentos não é "bom" nem "ruim": cor neutra (info), com seta e sinal.
          variacao={{ pct: s.ultimos7Dias.variacaoPct, sentido: 'neutro', comparacao: 'vs. 7 dias anteriores' }}
        />
        <StatCard className="col-span-2 lg:col-span-3" rotulo="Ativos agora" valor={s.ativosAgora} icone={Activity} pastel="rosa" detalhe="Áreas com menos de 2 h" />
        <StatCard
          className="col-span-2 lg:col-span-3"
          rotulo="Minha contribuição"
          valor={s.minhaContribuicao.total}
          icone={UserRound}
          pastel="menta"
          detalhe={`${s.minhaContribuicao.percentual}% de todos os registros`}
        />
      </section>

      {vazio ? (
        <EstadoVazio
          titulo="Ainda não há avistamentos"
          descricao="Os gráficos aparecem assim que o primeiro avistamento for registrado."
          acao={
            <Botao icone={Plus} to="/avistamentos/novo">
              Registrar o primeiro
            </Botao>
          }
        />
      ) : (
        <div className="lv-grid">
          <ChartCard
            className="col-span-4 lg:col-span-8"
            titulo="Avistamentos por dia"
            periodo={periodo30}
            tabela={{
              colunas: [
                { chave: 'data', rotulo: 'Dia', render: (l) => diaCurto(l.data) },
                { chave: 'total', rotulo: 'Avistamentos', alinhar: 'direita' },
              ],
              linhas: s.seriePorDia,
              chaveLinha: (l) => l.data,
            }}
          >
            <GraficoPorDia serie={s.seriePorDia} />
          </ChartCard>

          <ChartCard
            className="col-span-4 lg:col-span-4"
            titulo="Por período do dia"
            periodo="Todos os registros · horário de Florianópolis"
            tabela={{
              colunas: [
                { chave: 'periodo', rotulo: 'Período', render: (l) => `${ROTULO_PERIODO[l.periodo]} (${FAIXA_PERIODO[l.periodo]})` },
                { chave: 'total', rotulo: 'Avistamentos', alinhar: 'direita' },
              ],
              linhas: s.porPeriodo,
              chaveLinha: (l) => l.periodo,
            }}
          >
            <GraficoPorPeriodo porPeriodo={s.porPeriodo} />
          </ChartCard>

          <ChartCard
            className="col-span-4 lg:col-span-6"
            titulo="Por bairro"
            periodo="Todos os registros · os 8 bairros com mais avistamentos"
            tabela={{
              colunas: [
                { chave: 'bairro', rotulo: 'Bairro' },
                { chave: 'total', rotulo: 'Avistamentos', alinhar: 'direita' },
              ],
              linhas: s.porBairro,
              chaveLinha: (l) => l.bairro,
            }}
          >
            <GraficoPorBairro porBairro={s.porBairro} compacto={compacto} />
          </ChartCard>

          <Recentes consulta={recentes} />
        </div>
      )}
    </div>
  )
}

function Recentes({ consulta }) {
  const itens = consulta.data?.data.slice(0, 5) ?? []
  return (
    <section aria-labelledby="titulo-recentes" className="col-span-4 flex flex-col gap-4 rounded-lg bg-surface-card p-6 shadow-1 lg:col-span-6">
      <header className="flex items-center justify-between gap-3">
        <h2 id="titulo-recentes" className="font-display text-20 font-semibold text-ink-1">
          Mais recentes
        </h2>
        <Botao variante="fantasma" to="/avistamentos" icone={ArrowRight}>
          Ver todos
        </Botao>
      </header>
      {consulta.isPending ? (
        <div className="flex flex-col gap-3">
          <SkeletonSightingCard />
          <SkeletonSightingCard />
        </div>
      ) : consulta.isError ? (
        <EstadoErro erro={consulta.error} aoTentarDeNovo={consulta.refetch} />
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((a) => (
            <li key={a.id}>
              <SightingCard avistamento={a} nivelTitulo={3} className="shadow-none ring-1 ring-border" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Skeletons no formato do dashboard: 4 indicadores e os gráficos. */
function Carregando() {
  return (
    <div className="flex flex-col gap-6">
      <div className="lv-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="col-span-2 lg:col-span-3">
            <SkeletonStatCard />
          </div>
        ))}
      </div>
      <div className="lv-grid">
        <div className="col-span-4 lg:col-span-8">
          <SkeletonChartCard />
        </div>
        <div className="col-span-4 lg:col-span-4">
          <SkeletonChartCard />
        </div>
      </div>
    </div>
  )
}
