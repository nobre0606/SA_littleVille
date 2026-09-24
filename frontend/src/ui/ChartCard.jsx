import { useId } from 'react'
import { ChevronDown, Table2 } from 'lucide-react'
import { EstadoVazio } from './EstadoVazio.jsx'
import { Tabela } from './Tabela.jsx'
import { cx } from './cx.js'

/**
 * Moldura de gráfico: título, período, legenda, estado vazio e TABELA EQUIVALENTE recolhível.
 *
 * A tabela é a garantia de acessibilidade do gráfico: tudo o que o desenho mostra também está
 * lá como texto (para leitor de tela, daltonismo, impressão). O gráfico em si fica `aria-hidden`
 * e a figura é descrita pelo título.
 *
 * `series`: [{ rotulo, cor: 'chart-1' }]. A legenda só aparece com 2+ séries — com uma só, o
 * título já diz o que está desenhado (uma caixa com uma cor repetiria o título).
 * `tabela`: { colunas, linhas } no formato do componente Tabela.
 *
 * REGRA para quem coloca um gráfico do Recharts aqui dentro: passe `accessibilityLayer={false}`.
 * O Recharts 3 deixa o gráfico focável por padrão; como ele fica aria-hidden (a tabela é a
 * versão acessível), um foco "invisível" para o leitor de tela é erro de acessibilidade
 * (axe: aria-hidden-focus). Mouse continua com tooltip; teclado e leitor usam a tabela.
 */
export function ChartCard({ titulo, periodo, series = [], vazio = false, textoVazio, tabela, children, className }) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} className={cx('flex min-w-0 flex-col gap-4 rounded-lg bg-surface-card p-6 shadow-1', className)}>
      <header className="flex flex-col gap-1">
        <h2 id={idTitulo} className="font-display text-20 font-semibold text-ink-1">
          {titulo}
        </h2>
        {periodo && <p className="text-14 text-ink-2">{periodo}</p>}
      </header>

      {vazio ? (
        <EstadoVazio compacto nivelTitulo={3} titulo="Sem dados no período" descricao={textoVazio ?? 'Quando houver avistamentos, o gráfico aparece aqui.'} />
      ) : (
        <>
          {series.length > 1 && (
            <ul className="flex flex-wrap gap-4" aria-label="Legenda">
              {series.map((s) => (
                <li key={s.rotulo} className="flex items-center gap-2 text-14 text-ink-2">
                  <span aria-hidden="true" className="size-3 rounded-full" style={{ background: `var(--${s.cor})` }} />
                  {s.rotulo}
                </li>
              ))}
            </ul>
          )}
          <figure aria-labelledby={idTitulo} className="m-0 min-w-0">
            <div aria-hidden="true">{children}</div>
          </figure>
          {tabela && (
            <details className="group rounded-md border border-border">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3 text-14 font-semibold text-primary hover:bg-primary-soft">
                <Table2 size={16} strokeWidth={1.75} aria-hidden="true" />
                Ver dados em tabela
                <ChevronDown
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="ml-auto transition-transform duration-(--dur-base) group-open:rotate-180"
                />
              </summary>
              <div className="p-3">
                <Tabela legenda={titulo} colunas={tabela.colunas} linhas={tabela.linhas} chaveLinha={tabela.chaveLinha} />
              </div>
            </details>
          )}
        </>
      )}
    </section>
  )
}
