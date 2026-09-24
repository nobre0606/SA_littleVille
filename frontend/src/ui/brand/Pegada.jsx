import pegadaUrl from './pegada.svg'
import { cx } from '../cx.js'

// Aspas no url(): o Vite embute SVGs pequenos como data: URI com espaços e aspas, que quebram
// um url() sem aspas (a máscara falhava e a pegada virava um quadrado).
const mascara = (url) => ({ WebkitMaskImage: `url("${url}")`, maskImage: `url("${url}")` })

/**
 * A pegada do mascote — elemento gráfico recorrente (divisor, fundo de vazio, carregando,
 * marcador do mapa). É o arquivo pegada.svg usado como MÁSCARA: a forma vem do arquivo, a cor
 * vem do `className` (ex.: text-primary). Sempre decorativa: aria-hidden.
 *
 * `pe`: 'esquerdo' | 'direito' (espelha) · `rotacao` em graus.
 */
export function Pegada({ tamanho = 16, pe = 'esquerdo', rotacao = 0, className, style }) {
  return (
    <span
      aria-hidden="true"
      className={cx('lv-mask shrink-0', className)}
      style={{
        ...mascara(pegadaUrl),
        width: tamanho * (2 / 3),
        height: tamanho,
        transform: `rotate(${rotacao}deg) scaleX(${pe === 'direito' ? -1 : 1})`,
        ...style,
      }}
    />
  )
}

/** Divisor horizontal: uma trilha de pegadas alternando pé esquerdo/direito. */
export function PegadaDivisor({ quantidade = 7, className }) {
  return (
    <div role="separator" className={cx('flex items-center justify-center gap-3 py-4 text-border-strong', className)}>
      {Array.from({ length: quantidade }, (_, i) => (
        <Pegada
          key={i}
          tamanho={14}
          pe={i % 2 ? 'direito' : 'esquerdo'}
          rotacao={90}
          style={{ marginTop: i % 2 ? 8 : -8 }}
        />
      ))}
    </div>
  )
}

/**
 * Indicador de carregamento: três pegadas acendendo em sequência. O texto fica para leitor de
 * tela (role=status); com movimento reduzido, as pegadas ficam paradas.
 */
export function CarregandoPegadas({ rotulo = 'Carregando…', className }) {
  return (
    <div role="status" className={cx('inline-flex items-end gap-2 text-primary', className)}>
      {[0, 1, 2].map((i) => (
        <Pegada key={i} tamanho={18} pe={i % 2 ? 'direito' : 'esquerdo'} className="lv-step" style={{ '--i': i, marginBottom: i % 2 ? 0 : 6 }} />
      ))}
      <span className="sr-only">{rotulo}</span>
    </div>
  )
}

/**
 * Silhueta de montanha herdada da intro (o mesmo logo que se dissolve na abertura), como
 * ornamento do cabeçalho: lavanda, baixa opacidade, decorativa.
 */
export function Montanha({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cx('lv-mask pointer-events-none text-pastel-lavanda', className)}
      style={mascara('/assets/generated/logo.svg')}
    />
  )
}
