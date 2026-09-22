import { useEffect, useRef, useState, useMemo } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { INTRO_SEEN_KEY, SNOW_CALM } from '../scene/engine/createEngine.js'
import { buildIntroTimeline } from './introTimeline.js'
import { createLogoDissolve } from './logoDissolve.js'

gsap.registerPlugin(useGSAP)

function readSeen() {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return false // sessionStorage indisponível (modo privado etc.): trata como "nunca viu"
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    /* sem persistência: a intro toca de novo na próxima carga, o que é aceitável */
  }
}

/**
 * Intro cinematográfica (Fase 3). Decide o próprio caminho ao montar:
 *  - `engine.reduced` (prefers-reduced-motion): sem intro, fade simples de 0,4s;
 *  - primeira visita da sessão (ou `forceReplay`, do botão "Repetir intro" do HUD): timeline
 *    completa (~8s), com o benchmark decidindo o teto de partículas da tempestade;
 *  - já viu nesta sessão e não é replay: aparece pronta, sem nenhuma animação.
 * `forceReplay` ignora o sessionStorage mas continua respeitando reduced-motion (não é um
 * jeito de burlar a preferência do sistema, só de rever a intro sem apagar o flag manualmente).
 */
export default function IntroOverlay({ engine, sceneRef, cardSlotRef, forceReplay = false, onDone }) {
  const [seenAtMount] = useState(readSeen)
  const [visible, setVisible] = useState(true)
  const scope = useRef(null)
  const overlayRef = useRef(null)
  const mistRef = useRef(null)
  const logoRef = useRef(null)
  const titleRef = useRef(null)
  const sweepRef = useRef(null)
  const dissolveCanvasRef = useRef(null)
  const skipFnRef = useRef(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps -- estável por design: um pool por montagem
  const dissolve = useMemo(() => createLogoDissolve(engine.rand), [])

  const playCinematic = !engine.reduced && (forceReplay || !seenAtMount)
  const playSimpleFade = engine.reduced && (forceReplay || !seenAtMount)

  // Canvas da dissolução: assinante próprio do loop único (engine.add), sem rAF novo. Só
  // desenha enquanto `dissolve.active`; o resto do tempo é um clearRect ocioso.
  useEffect(() => {
    const canvas = dissolveCanvasRef.current
    // O <canvas> só existe no JSX quando playCinematic é true (ver render abaixo). Nas
    // demais visitas da sessão a intro nem monta essa parte da árvore — sem esta guarda,
    // `canvas.getContext` quebraria em cima de `null` e derrubava o componente inteiro
    // (sem error boundary, isso já chegou a travar a página inteira num reload).
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const off = engine.add((e) => {
      if (dissolve.active) dissolve.frame(ctx, e)
    }, 'introDissolve')
    return () => {
      off()
      window.removeEventListener('resize', resize)
      dissolve.clear(ctx)
    }
  }, [engine, dissolve])

  useGSAP(
    (_ctx, contextSafe) => {
      if (!visible) return

      if (playSimpleFade) {
        // reduced-motion: nada de câmera/zoom/blur — só a cortina escura sobe em 0,4s. A cena
        // por baixo já nasce no estado final (CSS de repouso), sem passar por nenhum estado
        // intermediário animado.
        gsap.set(overlayRef.current, { opacity: 1 })
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.4,
          onComplete: contextSafe(() => {
            markSeen()
            setVisible(false)
            onDone?.()
          }),
        })
        return
      }

      if (!playCinematic) {
        // Já viu nesta sessão: aparece pronta, sem nenhum quadro de transição.
        setVisible(false)
        onDone?.()
        return
      }

      const tl = buildIntroTimeline(
        {
          overlay: overlayRef.current,
          mist: mistRef.current,
          logo: logoRef.current,
          title: titleRef.current,
          sweep: sweepRef.current,
          scene: sceneRef?.current,
          cardSlot: cardSlotRef?.current,
        },
        {
          engine,
          dissolve,
          dissolveCanvas: dissolveCanvasRef.current,
          onDone: contextSafe(() => {
            markSeen()
            setVisible(false)
            onDone?.()
          }),
        },
      )
      tl.play()

      skipFnRef.current = contextSafe(() => {
        if (tl.progress() >= 1) return // já terminou (ou já foi pulada) — nada a fazer
        tl.progress(1) // aplica o estado final de todos os tweens de uma vez
        tl.kill()
        // progress(1) já deixou snow/wind/ignite nos valores finais da timeline, mas garante
        // explicitamente (por exemplo, se o skip chegar durante o trecho 0-0.6s, antes de a
        // timeline ter criado os tweens que fariam isso).
        engine.setAdaptivePaused(false)
        engine.setSnow({ intensity: SNOW_CALM })
        engine.setWindIntensity(1)
        engine.ignite.fire = 1
        dissolve.clear(dissolveCanvasRef.current?.getContext('2d'))
        markSeen()
        setVisible(false)
        onDone?.()
      })
    },
    { scope, dependencies: [engine, playCinematic, playSimpleFade, visible] },
  )

  useEffect(() => {
    if (!playCinematic) return
    const onKey = (e) => {
      if (e.key === 'Escape') skipFnRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playCinematic])

  if (!visible) return null

  // Clique em qualquer lugar da intro também pula (brief: botão + Esc + clique). O botão
  // "Pular" visível é filho desta div, então clicar nele também aciona isto por bubbling —
  // inofensivo, porque skipFn() já ignora chamadas repetidas (`tl.progress() >= 1`).
  return (
    <div
      ref={scope}
      className="lv-intro"
      data-testid="intro-overlay"
      onClick={playCinematic ? () => skipFnRef.current() : undefined}
    >
      <div ref={overlayRef} className="lv-intro-dark" />
      {playCinematic && (
        <>
          <div ref={mistRef} className="lv-intro-mist" aria-hidden="true" />
          <div className="lv-intro-center">
            <div className="lv-intro-logo-wrap">
              <img ref={logoRef} className="lv-intro-logo" src="/assets/generated/logo.svg" alt="Little Ville" />
              <div ref={sweepRef} className="lv-intro-sweep" aria-hidden="true" />
            </div>
            <div ref={titleRef} className="lv-intro-title">
              LITTLE VILLE
            </div>
          </div>
          <canvas ref={dissolveCanvasRef} className="lv-intro-dissolve" aria-hidden="true" />
          <button
            type="button"
            className="lv-intro-skip"
            data-testid="intro-skip"
            onClick={() => skipFnRef.current()}
            aria-label="Pular a introdução"
          >
            Pular ⏭
          </button>
        </>
      )}
    </div>
  )
}
