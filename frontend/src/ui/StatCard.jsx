import { useEffect, useRef, useState } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import { formatarNumero } from '../lib/format.js'
import { cx } from './cx.js'

// Ícone sobre pastel: a cor semântica do mesmo tom (≥ 3:1 para gráfico — ver tokens.css).
const PASTEL = {
  lavanda: { fundo: 'bg-pastel-lavanda', icone: 'text-primary' },
  azul: { fundo: 'bg-pastel-azul', icone: 'text-info' },
  menta: { fundo: 'bg-pastel-menta', icone: 'text-success' },
  rosa: { fundo: 'bg-pastel-rosa', icone: 'text-danger' },
  creme: { fundo: 'bg-pastel-creme', icone: 'text-icone-warning' },
}

const DURACAO_MS = 300

/**
 * Contagem de 0 até `alvo` em 300 ms (ease-out). É só apresentação: o número em si já vem
 * pronto do servidor. Com movimento reduzido, mostra o valor final direto.
 */
function useContagem(alvo, reduzir) {
  const [valor, setValor] = useState(0)
  const anterior = useRef(0)
  useEffect(() => {
    if (reduzir) {
      anterior.current = alvo
      return
    }
    const de = anterior.current
    const inicio = performance.now()
    let quadro
    const passo = (t) => {
      const p = Math.min(1, (t - inicio) / DURACAO_MS)
      const suavizado = 1 - (1 - p) ** 3
      setValor(Math.round(de + (alvo - de) * suavizado))
      if (p < 1) quadro = requestAnimationFrame(passo)
      else anterior.current = alvo
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, reduzir])
  // Movimento reduzido: o valor final direto, sem passar por estado intermediário.
  return reduzir ? alvo : valor
}

/**
 * Variação vinda do servidor (ex.: `ultimos7Dias.variacaoPct`). `sentido` diz se subir é bom:
 *  'subir-bom' → alta verde · 'descer-bom' → baixa verde · 'neutro' → sempre azul (info).
 * Seta + sinal + texto: a direção nunca depende só da cor. Warning não é usado aqui porque
 * não passa AA como texto pequeno.
 */
function Variacao({ pct, sentido = 'neutro', comparacao }) {
  if (pct === null || pct === undefined) {
    return <p className="text-14 text-ink-2">Sem base de comparação</p>
  }
  const Icone = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus
  let cor = 'text-info-text'
  if (sentido !== 'neutro' && pct !== 0) {
    const bom = sentido === 'subir-bom' ? pct > 0 : pct < 0
    cor = bom ? 'text-success-text' : 'text-danger-text'
  }
  const sinal = pct > 0 ? '+' : ''
  return (
    <p className="flex items-center gap-1 text-14 text-ink-2">
      <span className={cx('inline-flex items-center gap-1 font-bold', cor)}>
        <Icone size={16} strokeWidth={1.75} aria-hidden="true" />
        {sinal}
        {formatarNumero(pct)}%
      </span>
      {comparacao}
    </p>
  )
}

/**
 * Indicador do dashboard: ícone em círculo pastel, rótulo, número grande em Fredoka e, se
 * houver, a variação. O leitor de tela ouve o valor final (o número animado é aria-hidden).
 */
export function StatCard({ rotulo, valor, sufixo, icone: Icone, pastel = 'lavanda', variacao, detalhe, className }) {
  const reduzir = useReducedMotion()
  const exibido = useContagem(valor, reduzir)
  const p = PASTEL[pastel]
  return (
    <article className={cx('flex flex-col gap-3 rounded-lg bg-surface-card p-6 shadow-1', className)}>
      <div className="flex items-center gap-3">
        <span className={cx('inline-flex size-11 shrink-0 items-center justify-center rounded-full', p.fundo)}>
          <Icone size={24} strokeWidth={1.75} aria-hidden="true" className={p.icone} />
        </span>
        <h3 className="text-16 font-semibold text-ink-2">{rotulo}</h3>
      </div>
      <p className="font-display text-40 font-semibold text-ink-1">
        <span aria-hidden="true">{formatarNumero(exibido)}</span>
        <span className="sr-only">{formatarNumero(valor)}</span>
        {sufixo && <span className="ml-1 text-20 text-ink-2">{sufixo}</span>}
      </p>
      {variacao && <Variacao {...variacao} />}
      {detalhe && <p className="text-14 text-ink-2">{detalhe}</p>}
    </article>
  )
}
