import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cx } from './cx.js'

/**
 * Tabela de dados (desktop — no mobile as telas usam cartões). Só APRESENTA: a ordenação é
 * feita pelo SERVIDOR (`?sort=` no contrato). Clicar num cabeçalho chama `aoOrdenar(campo)` e
 * a tela pede a página de novo; a tabela nunca reordena as linhas sozinha.
 *
 * colunas: [{ chave, rotulo, ordenavel?, alinhar?: 'direita', render?: (linha) => nó }]
 * ordenacao: { campo, direcao: 'asc' | 'desc' }
 */
export function Tabela({ legenda, legendaVisivel = false, colunas, linhas, chaveLinha = (l) => l.id, ordenacao, aoOrdenar }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-surface-card shadow-1">
      <table className="w-full border-collapse text-left text-16">
        <caption className={cx('p-4 text-left font-display text-20 font-semibold', !legendaVisivel && 'sr-only')}>{legenda}</caption>
        <thead className="bg-surface-raised">
          <tr>
            {colunas.map((col) => {
              const ativa = ordenacao?.campo === col.chave
              const ariaSort = ativa ? (ordenacao.direcao === 'asc' ? 'ascending' : 'descending') : undefined
              const IconeOrdem = !ativa ? ArrowUpDown : ordenacao.direcao === 'asc' ? ArrowUp : ArrowDown
              return (
                <th
                  key={col.chave}
                  scope="col"
                  aria-sort={col.ordenavel ? (ariaSort ?? 'none') : undefined}
                  className={cx('border-b border-border px-4 py-2 text-14 font-bold text-ink-2', col.alinhar === 'direita' && 'text-right')}
                >
                  {col.ordenavel && aoOrdenar ? (
                    <button
                      type="button"
                      onClick={() => aoOrdenar(col.chave)}
                      className="-mx-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-2 hover:bg-surface-sunken hover:text-ink-1"
                    >
                      {col.rotulo}
                      <IconeOrdem size={16} strokeWidth={1.75} aria-hidden="true" className={ativa ? 'text-primary' : 'text-ink-3'} />
                    </button>
                  ) : (
                    col.rotulo
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={chaveLinha(linha)} className="border-b border-border last:border-b-0 hover:bg-surface-app">
              {colunas.map((col) => (
                <td key={col.chave} className={cx('px-4 py-3 align-middle text-ink-1', col.alinhar === 'direita' && 'text-right')}>
                  {col.render ? col.render(linha) : linha[col.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
