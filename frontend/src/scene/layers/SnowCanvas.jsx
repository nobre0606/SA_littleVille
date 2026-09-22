import { useEffect, useRef } from 'react'
import { useEngine } from '../engine/SceneProvider.jsx'
import { createSnowSim } from '../snow/snowSim.js'

const MAX_DPR = 2
const PIXEL_BUDGET = 2.6e6 // px do canvas: acima disso a resolução interna cai (neve é macia)
const MIN_DPR = 0.75

/**
 * Camada 10. Canvas do tamanho do container da cena (não do stage: a neve cai em toda a tela,
 * inclusive no lado escuro onde fica o card). O relógio é o do motor: nenhum rAF próprio.
 * O DPR é limitado a 2 e, em telas grandes, a resolução interna ainda cai para caber no
 * orçamento de pixels, o que reduz o custo de limpar e compor o canvas.
 */
export default function SnowCanvas() {
  const engine = useEngine()
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const host = canvas.parentElement
    const ctx = canvas.getContext('2d')
    const sim = createSnowSim(engine.rand)
    let pxScale = 1

    const resize = () => {
      const cw = host.clientWidth
      const ch = host.clientHeight
      if (!cw || !ch) return
      let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      if (cw * ch * dpr * dpr > PIXEL_BUDGET) dpr = Math.max(MIN_DPR, Math.sqrt(PIXEL_BUDGET / (cw * ch)))
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      pxScale = canvas.width / cw
      sim.resize(canvas.width, canvas.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    const off = engine.add((e) => {
      if (e.stage.w === 0) return
      const { active, storm, prof } = sim.frame(ctx, e, pxScale)
      e.setSnow(prof ? { active, storm, prof } : { active, storm })
    }, 'snow')

    return () => {
      off()
      ro.disconnect()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [engine])

  return <canvas ref={ref} data-layer="snow" aria-hidden="true" className="absolute inset-0 h-full w-full pointer-events-none" />
}
