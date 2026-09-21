import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { IMAGE, SCENE } from '../sceneMap.js'
import { useEngine } from '../engine/SceneProvider.jsx'
import { useStage } from '../SceneStage.jsx'
import { QUALITY } from '../engine/createEngine.js'

gsap.registerPlugin(useGSAP)

const R = SCENE.bigfoot.region
const rw = R.x1 - R.x0
const rh = R.y1 - R.y0
// Origem da respiração: a base do corpo (fim do bbox), em % da região.
const ORIGIN_Y = ((SCENE.bigfoot.bbox.y1 - R.y0) / rh) * 100
// Posição da fogueira relativa à região, para a luz quente.
const FIRE_X = ((SCENE.fire.base.x - R.x0) / rw) * 100
const FIRE_Y = ((SCENE.fire.base.y - R.y0) / rh) * 100

const FUR_MAX_SCALE = 2 // px de deslocamento (limite do brief)
const FUR_INTERVAL = 1 / 24 // s: o filtro SVG é reavaliado a ~24 Hz

/**
 * Camada 5. Sem recortar a imagem: uma CÓPIA da região, com máscara suave, sobre o original.
 *  - respiração: scaleY 1 → 1.006 (padrão), origem na base, ciclo de 4 s (calibrável);
 *  - pelo: feTurbulence + feDisplacementMap (scale ≤ 2) só na cópia, guiado pelo vento;
 *    desligado automaticamente quando o FPS adaptativo baixa de nível (Safari/iOS);
 *  - luz quente da fogueira (soft-light) sincronizada com o flicker da chama.
 */
export default function Bigfoot() {
  const engine = useEngine()
  const stage = useStage()
  const scope = useRef(null)
  const copyRef = useRef(null)
  const warmRef = useRef(null)
  const turbRef = useRef(null)
  const dispRef = useRef(null)

  // Respiração calibrável (HUD/URL): scaleY do pico e ciclo completo vêm de engine.breath.
  // Ao mexer nos sliders a tween é recriada dentro do contexto (contextSafe), então o cleanup
  // continua mandando em tudo.
  useGSAP(
    (_ctx, contextSafe) => {
      if (engine.reduced) return
      let tw = null
      const build = () => {
        tw?.kill()
        gsap.set('.lv-bigfoot', { scaleY: 1 })
        tw = gsap.fromTo(
          '.lv-bigfoot',
          { scaleY: 1 },
          {
            scaleY: engine.breath.scaleY,
            duration: engine.breath.cycle / 2, // ida + volta (yoyo) = ciclo completo
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            transformOrigin: `50% ${ORIGIN_Y}%`,
          },
        )
      }
      build()
      return engine.onBreath(contextSafe(build)) // o retorno é o cleanup do useGSAP
    },
    { scope, dependencies: [engine] },
  )

  useEffect(() => {
    const copy = copyRef.current
    const warm = warmRef.current
    const turb = turbRef.current
    const disp = dispRef.current
    let furOn = null
    let acc = 0

    const off = engine.add((e) => {
      const flick = e.fire.flicker
      warm.style.opacity = Math.min(1, flick * 0.7 * e.ignite.fire).toFixed(3)

      const wantFur = e.quality >= QUALITY.HIGH && !e.reduced && !e.isOff('fur')
      if (wantFur !== furOn) {
        furOn = wantFur
        copy.style.filter = wantFur ? 'url(#lv-fur)' : 'none'
        if (!wantFur) disp.setAttribute('scale', '0')
      }
      if (!wantFur) return
      acc += e.dt
      if (acc < FUR_INTERVAL) return
      acc = 0
      const s = Math.min(FUR_MAX_SCALE, 0.4 + e.wind.strength * 1.8)
      disp.setAttribute('scale', s.toFixed(2))
      const bx = 0.02 + 0.004 * Math.sin(e.time * 0.8)
      const by = 0.03 + 0.006 * Math.sin(e.time * 1.3 + 1)
      turb.setAttribute('baseFrequency', `${bx.toFixed(4)} ${by.toFixed(4)}`)
    }, 'bigfoot')
    return () => {
      off()
      copy.style.filter = 'none'
    }
  }, [engine])

  // A cópia usa a MESMA imagem no MESMO tamanho do stage, deslocada por px inteiros: cada pixel
  // coincide com o original (verificado por diff em e2e/diagnose.mjs), sem reamostragem própria.
  const left = Math.round((R.x0 / 100) * stage.w)
  const top = Math.round((R.y0 / 100) * stage.h)
  const width = Math.round((R.x1 / 100) * stage.w) - left
  const height = Math.round((R.y1 / 100) * stage.h) - top

  return (
    <div ref={scope} className="lv-layer" data-layer="bigfoot">
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id="lv-fur" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        className="lv-bigfoot"
        style={{ left, top, width, height, transformOrigin: `50% ${ORIGIN_Y}%` }}
      >
        <div
          ref={copyRef}
          className="lv-bigfoot-copy"
          style={{
            backgroundImage: `url(${IMAGE.src})`,
            backgroundSize: `${stage.w}px ${stage.h}px`,
            backgroundPosition: `${-left}px ${-top}px`,
          }}
        />
        <div
          ref={warmRef}
          className="lv-bigfoot-warm"
          style={{
            background: `radial-gradient(ellipse 85% 75% at ${FIRE_X}% ${FIRE_Y}%, rgba(255,150,60,0.9), rgba(255,120,40,0) 72%)`,
          }}
        />
      </div>
    </div>
  )
}
