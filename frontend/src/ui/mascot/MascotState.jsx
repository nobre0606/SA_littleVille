import { ARTE_MASCOTE, MASCARA } from './mascotArt.js'
import { Pegada } from '../brand/Pegada.jsx'
import { cx } from '../cx.js'

// Classe do fundo por pastel — escritas por extenso para o Tailwind encontrar as classes.
const FUNDO = {
  lavanda: 'bg-pastel-lavanda',
  azul: 'bg-pastel-azul',
  menta: 'bg-pastel-menta',
  rosa: 'bg-pastel-rosa',
  creme: 'bg-pastel-creme',
}

const TAMANHO = { sm: 96, md: 144, lg: 192 }

/**
 * O pé grande branco, mascote do sistema, num círculo pastel. Decorativo (aria-hidden): quem
 * dá o significado é o título ao lado (EstadoVazio, EstadoErro, 404...).
 *
 * variante: vazio | erro | 404 | sucesso | carregando | semGps | semEquipe
 */
export function MascotState({ variante = 'vazio', tamanho = 'md', className }) {
  const arte = ARTE_MASCOTE[variante] ?? ARTE_MASCOTE.vazio
  const lado = TAMANHO[tamanho]
  const transform = `rotate(${arte.rotacao}deg) scale(${arte.escala}) scaleX(${arte.espelhar ? -1 : 1})`

  return (
    <div
      aria-hidden="true"
      className={cx('relative shrink-0 overflow-hidden rounded-full', FUNDO[arte.fundo], className)}
      style={{ width: lado, height: lado }}
    >
      {/* Trilha de pegadas ao fundo, bem clara. */}
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 text-surface-card opacity-60">
        <Pegada tamanho={lado / 9} rotacao={80} />
        <Pegada tamanho={lado / 9} rotacao={100} pe="direito" />
        <Pegada tamanho={lado / 9} rotacao={80} />
      </div>
      {/* O drop-shadow fica no PAI: filtro aplicado no próprio elemento com máscara seria cortado por ela. */}
      <div
        className={cx('absolute inset-0 flex items-end justify-center', arte.animar && 'lv-bob')}
        style={{ filter: 'drop-shadow(0 2px 0 var(--ink-3))' }}
      >
        {MASCARA ? (
          <span
            className="lv-mask text-surface-card"
            style={{
              width: lado * 0.62,
              height: lado * 0.74,
              WebkitMaskImage: `url("${arte.src}")`,
              maskImage: `url("${arte.src}")`,
              transform,
              transformOrigin: 'bottom center',
            }}
          />
        ) : (
          <img src={arte.src} alt="" style={{ width: lado * 0.7, transform }} />
        )}
      </div>
    </div>
  )
}
