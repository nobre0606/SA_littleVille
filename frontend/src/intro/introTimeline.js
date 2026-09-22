import gsap from 'gsap'
import { SNOW_CALM } from '../scene/engine/createEngine.js'
import { runIntroBenchmark } from '../scene/engine/introBenchmark.js'
import { samplePixelsFromElement } from './logoDissolve.js'
import { createStormWatchdog } from './stormWatchdog.js'

/** Duração total ~8s, batendo com o brief (Fase 3, 3.2). */
export const INTRO_DURATION = 8

/**
 * Monta a timeline ÚNICA da intro (uma só `gsap.timeline()`; tudo aqui dentro é filho dela,
 * então `tl.kill()` — chamado pelo cleanup do `useGSAP` no unmount/StrictMode — mata junto
 * qualquer tween interno, sem sobra). Não inicia sozinha: quem chama decide `tl.play()`.
 *
 * `els`: refs do DOM (overlay escuro, névoa, logo, título, sweep de brilho, container da cena
 * para blur/brightness, slot do card). `deps`: engine, dissolve (logoDissolve), canvas da
 * dissolução, e os callbacks `onBenchmark`/`onDone` (para o HUD/telemetria, se quiser ouvir).
 */
export function buildIntroTimeline(els, deps) {
  const { engine, dissolve, dissolveCanvas } = deps
  const wind = { v: 1 }
  // Estado do watchdog (freio de emergência): criado só depois que o benchmark resolve (ele
  // precisa do refreshMs detectado), então precisa de uma guarda contra a intro já ter
  // terminado/sido pulada antes disso (a promise do benchmark é assíncrona).
  const introState = { done: false, watchdog: null }

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'sine.inOut' },
    onStart() {
      engine.setAdaptivePaused(true) // a qualidade adaptativa ignora a intro de propósito
    },
    onComplete() {
      introState.done = true
      introState.watchdog?.dispose()
      engine.setAdaptivePaused(false)
      deps.onDone?.()
    },
  })

  // 0.0–0.6s: tela escura, só vento leve. A tempestade já roda em cheio POR BAIXO do overlay
  // opaco (é assim que o benchmark mede a carga real que vai decidir o teto de partículas).
  // O fogo começa apagado (ignite.fire baixo): "acende" de verdade só em 5.2–7.8s.
  tl.set(els.overlay, { opacity: 1, backgroundColor: '#05080F' })
  tl.set(els.mist, { opacity: 0 })
  tl.set(els.scene, { filter: 'blur(20px) brightness(0.4)' })
  tl.set(els.logo, { opacity: 0, scale: 1.08, filter: 'blur(12px)' })
  tl.set(els.title, { opacity: 0, x: 0 })
  tl.set(els.sweep, { opacity: 0, backgroundPosition: '200% 0' })
  tl.set(engine.ignite, { fire: 0.3 })
  if (els.cardSlot) tl.set(els.cardSlot, { opacity: 0, x: 40 })
  tl.call(() => {
    // Assíncrono, mas cabe dentro dos 0,6s: a duração default é 400ms (ver introBenchmark.js).
    runIntroBenchmark(engine).then((r) => {
      deps.onBenchmark?.(r)
      if (introState.done) return // a intro já terminou/foi pulada antes do benchmark responder
      // Única exceção à regra "a qualidade adaptativa ignora a intro" (ver qualityGovernor.js):
      // monitora a tempestade VISÍVEL e reduz as partículas um nível na hora se necessário.
      introState.watchdog = createStormWatchdog({ engine, refreshMs: r.refreshMs, startTier: r.tier })
    })
  }, null, 0)
  tl.to({}, { duration: 0.6 }) // marca o tempo do trecho escuro (nada visível pra animar aqui)

  // 0.6–2.0s: a nevasca cresce até o máximo (o teto já foi fixado pelo benchmark), com
  // whiteout parcial cobrindo tudo; o vento sobe junto.
  tl.to(
    wind,
    {
      v: 1.6,
      duration: 1.4,
      onUpdate: () => engine.setWindIntensity(wind.v),
    },
    0.6,
  )
  tl.to(els.overlay, { opacity: 0, duration: 1.1 }, 0.6)
  tl.to(els.mist, { opacity: 0.85, duration: 1.4 }, 0.6)

  // 2.0–4.2s: a logo emerge de dentro da tempestade.
  tl.to(els.logo, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 2.2, ease: 'power2.out' }, 2.0)
  tl.fromTo(
    els.sweep,
    { opacity: 0, backgroundPosition: '200% 0' },
    { opacity: 1, backgroundPosition: '-100% 0', duration: 0.9, ease: 'power1.inOut' },
    2.5,
  )
  tl.set(els.sweep, { opacity: 0 }, 3.4)
  tl.to(els.title, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 2.3) // 0.3s depois da logo

  // 4.2–5.2s: a logo se desfaz em partículas levadas pelo vento (fallback: fade + blur).
  tl.call(
    () => {
      const points = samplePixelsFromElement(els.logo) // [] se o elemento estiver "tainted" (ver logoDissolve.js)
      if (points.length > 20 && !engine.reduced) {
        dissolveCanvas.width = window.innerWidth
        dissolveCanvas.height = window.innerHeight
        dissolve.begin(points, { durationS: 1.0, spread: 70 })
        gsap.to(els.logo, { opacity: 0, duration: 0.18 })
      } else {
        // Fallback: a vetorização pode ter saído ruim, ou reduced-motion. Some por fade+blur.
        gsap.to(els.logo, { opacity: 0, filter: 'blur(18px)', duration: 0.9 })
      }
      gsap.to(els.title, { opacity: 0, duration: 0.7 })
    },
    null,
    4.2,
  )

  // 5.0–8.0s: a tempestade suaviza, a névoa sai, a caverna aparece nítida e o fogo acende.
  // Tweens direto em cima de `engine.snow`/`engine.ignite` (não um proxy capturado antes do
  // benchmark decidir o tier): um proxy separado ficaria "preso" no valor de quando foi criado
  // e, no onUpdate, sobrescreveria por cima de qualquer redução que o watchdog tivesse acabado
  // de aplicar. Tweenar o objeto real sempre lê o valor ATUAL no momento em que o tween ativa.
  //
  // O watchdog desliga exatamente aqui: seu trabalho é proteger a tempestade VISÍVEL e
  // sustentada (0.6–5.0s); dali em diante a neve já está de propósito caindo pra calma, e
  // deixá-lo ativo criaria dois donos escrevendo em `engine.snow.intensity` ao mesmo tempo
  // (o tween de suavização E uma eventual redução do watchdog brigando pelo mesmo valor).
  tl.call(() => introState.watchdog?.dispose(), null, 5.0)
  tl.to(engine.snow, { intensity: SNOW_CALM, duration: 3 }, 5.0)
  tl.to(wind, { v: 1, duration: 3 }, 5.0)
  tl.to(els.mist, { opacity: 0, duration: 3 }, 5.0)
  tl.to(els.scene, { filter: 'blur(0px) brightness(1)', duration: 3 }, 5.0)
  tl.to(engine.ignite, { fire: 1, duration: 2.6 }, 5.2)

  // 7.0–8.0s: placeholder do card de autenticação (Fase 4 ainda não existe — ver SceneScreen).
  if (els.cardSlot) tl.to(els.cardSlot, { opacity: 1, x: 0, duration: 1, ease: 'power2.out' }, 7.0)

  return tl
}
