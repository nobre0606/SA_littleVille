import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Footprints, List, Map, Plus, Search, Trash2, TrendingUp, User } from 'lucide-react'
import { relogioServidor } from '../api/serverClock.js'
import { FAIXAS } from '../domain/idadeArea.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { Badge, BadgeIdade } from '../ui/Badge.jsx'
import { Botao } from '../ui/Botao.jsx'
import { CarregandoPegadas, PegadaDivisor } from '../ui/brand/Pegada.jsx'
import { Campo } from '../ui/Campo.jsx'
import { ChartCard } from '../ui/ChartCard.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { EstadoErro } from '../ui/EstadoErro.jsx'
import { EstadoVazio } from '../ui/EstadoVazio.jsx'
import { FilterChips } from '../ui/FilterChips.jsx'
import { MascotState } from '../ui/mascot/MascotState.jsx'
import { Modal } from '../ui/Modal.jsx'
import { PageHeader } from '../ui/PageHeader.jsx'
import { Paginacao } from '../ui/Paginacao.jsx'
import { RelativeTime } from '../ui/RelativeTime.jsx'
import { SegmentedControl } from '../ui/SegmentedControl.jsx'
import { Select } from '../ui/Select.jsx'
import { SightingCard } from '../ui/SightingCard.jsx'
import { SkeletonChartCard, SkeletonSightingCard, SkeletonStatCard, SkeletonTabela } from '../ui/Skeleton.jsx'
import { StatCard } from '../ui/StatCard.jsx'
import { Tabela } from '../ui/Tabela.jsx'
import { TeamCodeBox } from '../ui/TeamCodeBox.jsx'
import { useToast } from '../ui/Toast.jsx'
import { UserAvatar } from '../ui/UserAvatar.jsx'

/**
 * Vitrine do sistema visual (só em desenvolvimento — a rota nem existe no build de produção).
 * Os dados aqui são EXEMPLOS FIXOS para desenhar os componentes, não estatísticas.
 */

const MIN = 60_000
const haMin = (m) => new Date(relogioServidor.agora() - m * MIN).toISOString()
const exemplo = (id, bairro, min, descricao, autor = { id: 'u_bruno', nome: 'Bruno Lima' }) => ({
  id,
  bairro,
  descricao,
  autor,
  vistoEm: haMin(min),
  origemLocal: 'gps',
})

const PERIODOS = [
  { periodo: 'Madrugada', total: 3 },
  { periodo: 'Manhã', total: 8 },
  { periodo: 'Tarde', total: 12 },
  { periodo: 'Noite', total: 9 },
]

function Secao({ titulo, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-border pb-2 font-display text-24 font-semibold text-ink-1">{titulo}</h2>
      {children}
    </section>
  )
}

/** Tooltip do Recharts com os tokens (a padrão do Recharts é proibida). Texto em cor de texto. */
function DicaGrafico({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-sm bg-surface-card px-3 py-2 text-14 shadow-2">
      <p className="font-semibold text-ink-1">{label}</p>
      <p className="text-ink-2">{payload[0].value} avistamentos</p>
    </div>
  )
}

export default function UiKit() {
  useDocumentTitle('UI kit')
  const { toast } = useToast()
  const [modal, setModal] = useState(null)
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(3)
  const [chips, setChips] = useState(['7d'])
  const [visao, setVisao] = useState('mapa')
  const [ordem, setOrdem] = useState({ campo: 'vistoEm', direcao: 'desc' })

  return (
    <div className="flex flex-col gap-12">
      <PageHeader titulo="UI kit" descricao="Todos os componentes e estados do Little Ville. Visível só em desenvolvimento." />

      <Secao titulo="Botões">
        <div className="flex flex-wrap gap-3">
          <Botao icone={Plus}>Primário</Botao>
          <Botao variante="secundario">Secundário</Botao>
          <Botao variante="fantasma">Fantasma</Botao>
          <Botao variante="perigo" icone={Trash2}>
            Perigo
          </Botao>
          <Botao carregando rotuloCarregando="Salvando…">
            Salvar
          </Botao>
          <Botao disabled>Desabilitado</Botao>
          <Botao variante="secundario" icone={Search} aria-label="Buscar" />
        </div>
      </Secao>

      <Secao titulo="Campos">
        <div className="grid gap-6 md:grid-cols-2">
          <Campo rotulo="Buscar" icone={Search} placeholder="Bairro, descrição ou autor" />
          <Campo rotulo="Nome da equipe" obrigatorio erro="O nome da equipe precisa de pelo menos 3 caracteres" defaultValue="Ab" />
          <Select
            rotulo="Bairro"
            obrigatorio
            vazio="Escolha o bairro"
            opcoes={['Campeche', 'Joaquina', 'Lagoa da Conceição'].map((b) => ({ valor: b, rotulo: b }))}
            dica="Lista fixa de bairros de Florianópolis."
          />
          <Campo
            rotulo="Descrição"
            multilinha
            maxLength={500}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            dica="Opcional."
          />
        </div>
      </Secao>

      <Secao titulo="Selos">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutro</Badge>
          <Badge tom="primario" icone={User}>
            Admin
          </Badge>
          <Badge tom="sucesso">Sucesso</Badge>
          <Badge tom="aviso">Aviso</Badge>
          <Badge tom="perigo">Perigo</Badge>
          <Badge tom="info">Info</Badge>
        </div>
        <p className="text-14 text-ink-2">RF04 — cor + ícone + rótulo, nunca só cor:</p>
        <div className="flex flex-wrap gap-2">
          <BadgeIdade faixa={FAIXAS.fresh} />
          <BadgeIdade faixa={FAIXAS.warm} />
          <BadgeIdade faixa={FAIXAS.cold} />
        </div>
      </Secao>

      <Secao titulo="Indicadores (StatCard)">
        <div className="lv-grid">
          <StatCard
            className="col-span-4 lg:col-span-4"
            rotulo="Total de avistamentos"
            valor={1284}
            icone={Footprints}
            variacao={{ pct: 12, sentido: 'neutro', comparacao: 'vs. 7 dias anteriores' }}
          />
          <StatCard
            className="col-span-4 lg:col-span-4"
            rotulo="Ativos agora"
            valor={3}
            icone={Activity}
            pastel="rosa"
            detalhe="Áreas com menos de 2 h"
          />
          <StatCard
            className="col-span-4 lg:col-span-4"
            rotulo="Últimos 7 dias"
            valor={9}
            icone={TrendingUp}
            pastel="menta"
            variacao={{ pct: null }}
          />
        </div>
      </Secao>

      <Secao titulo="Gráficos (ChartCard)">
        <div className="lv-grid">
          <ChartCard
            className="col-span-4 lg:col-span-7"
            titulo="Avistamentos por período do dia"
            periodo="Últimos 30 dias · horário de Florianópolis"
            tabela={{
              colunas: [
                { chave: 'periodo', rotulo: 'Período' },
                { chave: 'total', rotulo: 'Avistamentos', alinhar: 'direita' },
              ],
              linhas: PERIODOS,
              chaveLinha: (l) => l.periodo,
            }}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart accessibilityLayer={false} data={PERIODOS} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="periodo" tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} tick={{ fill: 'var(--ink-2)', fontSize: 14 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-2)', fontSize: 14 }} />
                <Tooltip content={<DicaGrafico />} cursor={{ fill: 'var(--surface-raised)' }} />
                <Bar dataKey="total" fill="var(--chart-1)" maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard className="col-span-4 lg:col-span-5" titulo="Avistamentos por bairro" periodo="Últimos 30 dias" vazio />
        </div>
      </Secao>

      <Secao titulo="Filtros e alternância">
        <FilterChips
          rotulo="Período"
          opcoes={[
            { valor: 'hoje', rotulo: 'Hoje' },
            { valor: '7d', rotulo: '7 dias' },
            { valor: '30d', rotulo: '30 dias' },
            { valor: 'tudo', rotulo: 'Tudo' },
          ]}
          selecionados={chips}
          aoMudar={setChips}
        />
        <SegmentedControl
          rotulo="Visualização"
          valor={visao}
          aoMudar={setVisao}
          opcoes={[
            { valor: 'mapa', rotulo: 'Mapa', icone: Map },
            { valor: 'lista', rotulo: 'Lista', icone: List },
          ]}
        />
      </Secao>

      <Secao titulo="Tabela e paginação">
        <Tabela
          legenda="Avistamentos"
          legendaVisivel
          ordenacao={ordem}
          aoOrdenar={(campo) => setOrdem((o) => ({ campo, direcao: o.campo === campo && o.direcao === 'desc' ? 'asc' : 'desc' }))}
          colunas={[
            { chave: 'bairro', rotulo: 'Bairro', ordenavel: true },
            { chave: 'autor', rotulo: 'Autor', ordenavel: true, render: (l) => l.autor.nome },
            { chave: 'vistoEm', rotulo: 'Quando', ordenavel: true, render: (l) => <RelativeTime iso={l.vistoEm} /> },
          ]}
          linhas={[
            exemplo('a', 'Joaquina', 12, ''),
            exemplo('b', 'Campeche', 90, '', { id: 'u_carla', nome: 'Carla Menezes' }),
            exemplo('c', 'Lagoa da Conceição', 600, ''),
          ]}
        />
        <Paginacao pagina={pagina} totalPaginas={12} aoMudar={setPagina} />
      </Secao>

      <Secao titulo="Cartões, avatares e código de equipe">
        <div className="lv-grid">
          <SightingCard className="col-span-4" avistamento={exemplo('s1', 'Joaquina', 12, 'Pegadas enormes na areia, indo em direção às dunas.')} />
          <SightingCard className="col-span-4" avistamento={exemplo('s2', 'Campeche', 80, 'Uivo longo vindo da mata.', { id: 'u_carla', nome: 'Carla Menezes' })} />
          <SightingCard className="col-span-4" avistamento={exemplo('s3', 'Rio Vermelho', 2000, '')} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {['Ana Souza', 'Bruno Lima', 'Carla Menezes', 'Diego Martins', 'Elisa Farias'].map((n, i) => (
            <UserAvatar key={n} id={`u_${i}`} nome={n} decorativo={false} tamanho={['sm', 'md', 'lg'][i % 3]} />
          ))}
        </div>
        <div className="max-w-md">
          <TeamCodeBox codigo="K7M2QA" />
        </div>
      </Secao>

      <Secao titulo="Sobreposições">
        <div className="flex flex-wrap gap-3">
          <Botao variante="secundario" onClick={() => setModal('modal')}>
            Abrir modal
          </Botao>
          <Botao variante="secundario" onClick={() => setModal('sheet')}>
            Abrir sheet (mobile)
          </Botao>
          <Botao variante="perigo" onClick={() => setModal('confirmar')}>
            Confirmar exclusão
          </Botao>
          <Botao variante="secundario" onClick={() => toast({ mensagem: 'Avistamento registrado.' })}>
            Toast de sucesso
          </Botao>
          <Botao
            variante="secundario"
            onClick={() => toast({ mensagem: 'Avistamento excluído.', acao: { rotulo: 'Desfazer', aoClicar: () => toast({ tom: 'info', mensagem: 'Exclusão desfeita.' }) } })}
          >
            Toast com desfazer
          </Botao>
          <Botao variante="secundario" onClick={() => toast({ tom: 'erro', mensagem: 'Não foi possível salvar. Tente de novo.' })}>
            Toast de erro
          </Botao>
        </div>
        <Modal aberto={modal === 'modal'} aoFechar={() => setModal(null)} titulo="Título do modal" descricao="Uma linha explicando o que acontece aqui.">
          <p className="text-16 text-ink-1">Conteúdo do modal. Esc, clique fora ou o X fecham.</p>
        </Modal>
        <Modal
          variante="sheet"
          aberto={modal === 'sheet'}
          aoFechar={() => setModal(null)}
          titulo="Folha inferior"
          descricao="No celular sobe da base; no desktop é um modal."
          rodape={<Botao onClick={() => setModal(null)}>Entendi</Botao>}
        />
        <ConfirmDialog
          aberto={modal === 'confirmar'}
          aoFechar={() => setModal(null)}
          aoConfirmar={() => setModal(null)}
          perigoso
          titulo="Excluir o avistamento na Joaquina?"
          descricao="Você terá 10 segundos para desfazer."
          rotuloConfirmar="Excluir"
        />
      </Secao>

      <Secao titulo="Carregando (skeletons no formato do conteúdo)">
        <CarregandoPegadas />
        <div className="lv-grid">
          <div className="col-span-4">
            <SkeletonStatCard />
          </div>
          <div className="col-span-4">
            <SkeletonSightingCard />
          </div>
          <div className="col-span-4">
            <SkeletonChartCard altura={120} />
          </div>
        </div>
        <SkeletonTabela linhas={3} />
      </Secao>

      <PegadaDivisor />

      <Secao titulo="Mascote">
        <div className="flex flex-wrap gap-6">
          {['vazio', 'erro', '404', 'sucesso', 'carregando', 'semGps', 'semEquipe'].map((v) => (
            <figure key={v} className="m-0 flex flex-col items-center gap-2">
              <MascotState variante={v} tamanho="sm" />
              <figcaption className="text-14 text-ink-2">{v}</figcaption>
            </figure>
          ))}
        </div>
      </Secao>

      <Secao titulo="Estados vazio e erro">
        <EstadoVazio
          variante="semEquipe"
          titulo="Você ainda não tem equipe"
          descricao="Crie uma equipe ou entre com o código de convite de alguém."
          acao={<Botao icone={Plus}>Criar equipe</Botao>}
        />
        <div className="lv-grid">
          <EstadoErro className="col-span-4" erro={{ code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor. Verifique sua internet.' }} aoTentarDeNovo={() => {}} />
          <EstadoErro className="col-span-4" erro={{ code: 'FORBIDDEN', message: 'Só quem registrou pode editar este avistamento.' }} />
          <EstadoErro className="col-span-4" erro={{ code: 'NOT_FOUND' }} />
        </div>
      </Secao>
    </div>
  )
}
