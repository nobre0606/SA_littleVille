import { useEffect, useRef } from 'react'
import { computeUiRegionPx } from '../scene/stageMath.js'
import { UI_REGION } from '../scene/sceneMap.js'
import AuthCard from '../auth/AuthCard.jsx'

/**
 * Slot do card de autenticação: a posição horizontal vem de `computeUiRegionPx` (mesma
 * geometria de `cover` do resto da cena — troca de arte é só trocar `UI_REGION` em
 * sceneMap.js). Em retrato, o CSS assume (metade inferior, largura cheia — ver intro.css) e
 * o JS não escreve left/width.
 *
 * Reaproveita o loop único do motor (`engine.add`), sem ResizeObserver nem rAF próprio; só
 * escreve no DOM quando a geometria realmente muda (comparação barata antes do write).
 */
export default function AuthCardSlot({ engine, slotRef }) {
  const wrapRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    let lastKey = ''
    const mq = window.matchMedia('(orientation: portrait)')

    // getBoundingClientRect() força layout síncrono — por isso só é chamado quando a
    // geometria realmente mudou (mesma guarda de `key`), não em todo frame.
    const updateCardRect = () => {
      const card = wrap.querySelector('.lv-card')
      const r = card?.getBoundingClientRect()
      if (r) engine.cardRect = { left: r.left, top: r.top, width: r.width, height: r.height }
    }

    const off = engine.add(() => {
      if (mq.matches) {
        if (lastKey !== 'portrait') {
          wrap.style.left = ''
          wrap.style.width = ''
          lastKey = 'portrait'
          updateCardRect()
        }
        return
      }
      const vw = window.innerWidth
      const key = `${engine.stage.x}|${engine.stage.w}|${vw}`
      if (key === lastKey) return
      lastKey = key
      const { left, width } = computeUiRegionPx(engine.stage, vw, UI_REGION)
      wrap.style.left = `${left}px`
      wrap.style.width = `${width}px`
      updateCardRect()
    }, 'authCardSlot')

    return off
  }, [engine])

  return (
    <div
      ref={(el) => {
        wrapRef.current = el
        if (slotRef) slotRef.current = el
      }}
      className="lv-card-slot"
      data-testid="auth-card-slot"
    >
      <AuthCard />
    </div>
  )
}
