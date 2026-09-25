import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutationState } from '@tanstack/react-query'
import { FilterX, LoaderCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { corDaArea } from '../../domain/idadeArea.js'
import { CHAVE_CRIAR, useListaAvistamentos } from '../../features/avistamentos/consultas.js'
import {
  AUTORES,
  ORDENACOES,
  PADRAO,
  PERIODOS,
  alternarOrdem,
  lerFiltros,
  ordenacaoDaTabela,
  paraUrl,
  temFiltro,
} from '../../features/avistamentos/filtros.js'
import { nomeDoAvistamento, useExcluirComDesfazer } from '../../features/avistamentos/useExcluirComDesfazer.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useServerNow } from '../../hooks/useServerNow.js'
import { formatarNumero } from '../../lib/format.js'
import { BadgeIdade } from '../../ui/Badge.jsx'
import { Botao } from '../../ui/Botao.jsx'
import { Campo } from '../../ui/Campo.jsx'
import { ConfirmDialog } from '../../ui/ConfirmDialog.jsx'
import { EstadoErro } from '../../ui/EstadoErro.jsx'
import { EstadoVazio } from '../../ui/EstadoVazio.jsx'
import { FilterChips } from '../../ui/FilterChips.jsx'
import { PageHeader } from '../../ui/PageHeader.jsx'
import { Paginacao } from '../../ui/Paginacao.jsx'
import { RelativeTime } from '../../ui/RelativeTime.jsx'
import { Select } from '../../ui/Select.jsx'
import { SightingCard } from '../../ui/SightingCard.jsx'
import { SkeletonSightingCard, SkeletonTabela } from '../../ui/Skeleton.jsx'
import { Tabela } from '../../ui/Tabela.jsx'
import { UserAvatar } from '../../ui/UserAvatar.jsx'
import { cx } from '../../ui/cx.js'

const ESPERA_BUSCA_MS = 300

/**
 * RF07 — lista de avistamentos. Tabela no desktop (≥ 768 px), cartões no mobile. Busca,
 * período, autor, ordenação e paginação moram na URL e são aplicados PELO SERVIDOR.
 */
export default function ListaAvistamentos() {
  useDocumentTitle('Avistamentos')
  const [params, setParams] = useSearchParams()
  const filtros = lerFiltros(params)
  const consulta = useListaAvistamentos(filtros)
  const agora = useServerNow(60_000)
  const { excluir } = useExcluirComDesfazer()
  const [aExcluir, setAExcluir] = useState(null)

  // Criações ainda sem resposta: aparecem no topo como "Enviando…" (otimismo da criação).
  const enviando = useMutationState({ filters: { mutationKey: CHAVE_CRIAR, status: 'pending' }, select: (m) => m.state.variables })

  /** Muda filtros na URL. Qualquer filtro novo volta para a página 1. */
  const mudar = (parcial) => setParams(paraUrl({ ...filtros, page: 1, ...parcial }))

  // Busca com espera de 300 ms: não dispara uma chamada por tecla.
  const [texto, setTexto] = useState(filtros.q)
  useEffect(() => {
    if (texto === filtros.q) return
    const t = setTimeout(() => setParams(paraUrl({ ...filtros, q: texto, page: 1 })), ESPERA_BUSCA_MS)
    return () => clearTimeout(t)
  }, [texto, filtros, setParams])

  const itens = consulta.data?.data ?? []
  const pagina = consulta.data?.page
  const atualizando = consulta.isPlaceholderData && consulta.isFetching

  const confirmarExclusao = () => {
    excluir(aExcluir)
    setAExcluir(null)
  }

  return (
    <>
      <PageHeader
        titulo="Avistamentos"
        descricao="Todos os registros do Pé Grande em Florianópolis."
        acoes={
          <Botao icone={Plus} to="/avistamentos/novo">
            Registrar avistamento
          </Botao>
        }
      />

      <section aria-label="Filtros" className="mb-6 flex flex-col gap-4 rounded-lg bg-surface-card p-4 shadow-1 md:p-6">
        <Campo
          rotulo="Buscar"
          type="search"
          icone={Search}
          placeholder="Bairro, descrição ou autor"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="flex flex-col gap-2">
            <span id="rotulo-periodo" className="text-14 font-semibold text-ink-1">
              Período
            </span>
            <FilterChips rotulo="Período" opcoes={PERIODOS} selecionados={[filtros.periodo]} aoMudar={([periodo]) => mudar({ periodo })} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-14 font-semibold text-ink-1">Autor</span>
            <FilterChips rotulo="Autor" opcoes={AUTORES} selecionados={[filtros.autor]} aoMudar={([autor]) => mudar({ autor })} />
          </div>
          {/* No mobile não há cabeçalho de tabela para clicar: a ordenação é um select. */}
          <Select
            className="w-full md:hidden"
            rotulo="Ordenar por"
            value={filtros.sort}
            onChange={(e) => mudar({ sort: e.target.value })}
            opcoes={ORDENACOES}
          />
        </div>
      </section>

      {pagina && (
        <p className="mb-4 text-14 text-ink-2" aria-live="polite">
          {pagina.total === 1 ? '1 avistamento' : `${formatarNumero(pagina.total)} avistamentos`}
          {temFiltro(filtros) && ' com os filtros escolhidos'}
        </p>
      )}

      <Conteudo
        consulta={consulta}
        itens={itens}
        filtros={filtros}
        enviando={enviando}
        atualizando={atualizando}
        agora={agora}
        aoOrdenar={(campo) => mudar({ sort: alternarOrdem(filtros.sort, campo), page: filtros.page })}
        aoExcluir={setAExcluir}
        aoLimpar={() => {
          setTexto('')
          setParams(paraUrl({ ...PADRAO, sort: filtros.sort }))
        }}
      />

      {pagina && (
        <Paginacao className="mt-6" pagina={pagina.page} totalPaginas={pagina.totalPages} aoMudar={(page) => setParams(paraUrl({ ...filtros, page }))} />
      )}

      <ConfirmDialog
        aberto={aExcluir !== null}
        aoFechar={() => setAExcluir(null)}
        aoConfirmar={confirmarExclusao}
        perigoso
        titulo={aExcluir ? `Excluir o avistamento “${nomeDoAvistamento(aExcluir, agora)}”?` : ''}
        descricao="Ele some da lista, do mapa e do dashboard. Você terá 10 segundos para desfazer."
        rotuloConfirmar="Excluir"
      />
    </>
  )
}

function Conteudo({ consulta, itens, filtros, enviando, atualizando, agora, aoOrdenar, aoExcluir, aoLimpar }) {
  if (consulta.isPending) {
    return (
      <>
        <div className="hidden md:block">
          <SkeletonTabela linhas={6} colunas={5} />
        </div>
        <div className="flex flex-col gap-3 md:hidden">
          <SkeletonSightingCard />
          <SkeletonSightingCard />
          <SkeletonSightingCard />
        </div>
      </>
    )
  }

  if (consulta.isError && !consulta.data) {
    return <EstadoErro erro={consulta.error} aoTentarDeNovo={consulta.refetch} voltarPara="/dashboard" />
  }

  if (itens.length === 0 && enviando.length === 0) {
    return temFiltro(filtros) ? (
      <EstadoVazio
        titulo="Nenhum avistamento encontrado"
        descricao="Nada combina com a busca e os filtros escolhidos. Tente outro termo ou um período maior."
        acao={
          <Botao variante="secundario" icone={FilterX} onClick={aoLimpar}>
            Limpar filtros
          </Botao>
        }
      />
    ) : (
      <EstadoVazio
        titulo="Nenhum avistamento ainda"
        descricao="Viu algo estranho por aí? Registre o primeiro avistamento da vila."
        acao={
          <Botao icone={Plus} to="/avistamentos/novo">
            Registrar o primeiro
          </Botao>
        }
      />
    )
  }

  return (
    <div className={cx('transition-opacity duration-(--dur-base)', atualizando && 'opacity-60')} aria-busy={atualizando || undefined}>
      {enviando.length > 0 && (
        <ul className="mb-3 flex flex-col gap-3" aria-label="Avistamentos sendo enviados">
          {enviando.map((dados, i) => (
            <li key={i} role="status" className="flex items-center gap-3 rounded-lg border border-dashed border-ink-3 bg-surface-card p-4">
              <LoaderCircle size={20} strokeWidth={1.75} aria-hidden="true" className="animate-spin text-primary" />
              <span className="text-16 text-ink-1">
                Enviando avistamento em <strong className="font-bold">{dados.bairro}</strong>…
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="hidden md:block">
        <TabelaAvistamentos itens={itens} filtros={filtros} agora={agora} aoOrdenar={aoOrdenar} aoExcluir={aoExcluir} />
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label="Avistamentos">
        {itens.map((a) => (
          <li key={a.id}>
            <SightingCard avistamento={a} nivelTitulo={2} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function TabelaAvistamentos({ itens, filtros, agora, aoOrdenar, aoExcluir }) {
  const colunas = [
    {
      chave: 'bairro',
      rotulo: 'Bairro',
      ordenavel: true,
      render: (a) => (
        <Link to={`/avistamentos/${a.id}`} className="inline-flex min-h-11 items-center font-bold text-primary hover:underline">
          {a.bairro}
        </Link>
      ),
    },
    {
      chave: 'descricao',
      rotulo: 'Descrição',
      render: (a) =>
        a.descricao ? (
          <span className="line-clamp-2 max-w-sm">{a.descricao}</span>
        ) : (
          <span className="text-ink-2 italic">Sem descrição</span>
        ),
    },
    {
      chave: 'autor',
      rotulo: 'Autor',
      ordenavel: true,
      render: (a) => (
        <span className="flex items-center gap-2">
          <UserAvatar id={a.autor.id} nome={a.autor.nome} tamanho="sm" />
          {a.autor.nome}
        </span>
      ),
    },
    {
      chave: 'vistoEm',
      rotulo: 'Quando',
      ordenavel: true,
      render: (a) => (
        <span className="flex flex-col items-start gap-1">
          <RelativeTime iso={a.vistoEm} className="whitespace-nowrap" />
          <BadgeIdade faixa={corDaArea(a.vistoEm, agora)} />
        </span>
      ),
    },
    {
      chave: 'acoes',
      rotulo: <span className="sr-only">Ações</span>,
      alinhar: 'direita',
      // As ações só aparecem quando o SERVIDOR permite (acoes.podeEditar/podeExcluir).
      render: (a) => {
        const nome = nomeDoAvistamento(a, agora)
        return (
          <span className="flex justify-end gap-1">
            {a.acoes.podeEditar && (
              <Botao variante="fantasma" icone={Pencil} to={`/avistamentos/${a.id}/editar`} aria-label={`Editar “${nome}”`} />
            )}
            {a.acoes.podeExcluir && (
              <Botao variante="perigoDiscreto" icone={Trash2} onClick={() => aoExcluir(a)} aria-label={`Excluir “${nome}”`} />
            )}
          </span>
        )
      },
    },
  ]
  return <Tabela legenda="Avistamentos" colunas={colunas} linhas={itens} ordenacao={ordenacaoDaTabela(filtros.sort)} aoOrdenar={aoOrdenar} />
}
