import gsap from 'gsap'
import { makeNoise1D, makeRng } from './noise.js'
import { createWindController } from './windController.js'
import { createQualityGovernor } from './qualityGovernor.js'

/** Níveis de qualidade. As camadas leem `engine.quality` a cada frame. */
export const QUALITY = { LOW: 0, MEDIUM: 1, HIGH: 2 }
export const QUALITY_NAMES = ['low', 'medium', 'high']

/** Camadas que o HUD do ?debug=1 pode ligar/desligar (chave = valor de data-layer). */
export const LAYER_DEFS = [
  { key: 'background', label: '1 fundo' },
  { key: 'rays', label: '2 raios de luz' },
  { key: 'portal', label: '3 portal' },
  { key: 'glitter', label: '4 glitter' },
  { key: 'bigfoot', label: '5 pé grande' },
  { key: 'fur', label: '5b filtro do pelo (SVG)', sub: true },
  { key: 'campfire', label: '6 fogueira (canvas)' },
  { key: 'firelight', label: '7 luz do fogo' },
  { key: 'drips', label: '8 gotas' },
  { key: 'fog', label: '9 névoa' },
  { key: 'snow', label: '10 nevasca (canvas)' },
  { key: 'vignette', label: '11 vinheta' },
]

const FPS_WINDOW = 0.5 // s por amostra
const FPS_SAMPLES = 4 // média móvel de ~2 s
const BREATH_DEFAULT = { scaleY: 1.006, cycle: 4 }
export const SNOW_CALM = 0.2 // intensidade do estado calmo (~300 de 1500 partículas)
/** sessionStorage: só um flag "já vi a intro nesta aba", nunca dados sensíveis (regra da Fase 3). */
export const INTRO_SEEN_KEY = 'lv-intro-seen'

/**
 * Parâmetros de URL (todos opcionais):
 *   debug=1                     HUD + marcadores
 *   q=auto|0|1|2                trava a qualidade
 *   seed=N                      cena reproduzível
 *   off=fog,glitter,fur         começa com essas camadas desligadas (chaves de LAYER_DEFS)
 *   breath=1.008,4              scaleY e ciclo (s) da respiração do pé grande
 *   snow=0.2                    intensidade da nevasca, 0..1 (0.2 ≈ 300 partículas, 1 ≈ 1500)
 *   storm=1                     vento ×1.5 (tempestade)
 */
export function readSceneParams(search = window.location.search) {
  const p = new URLSearchParams(search)
  const q = p.get('q')
  const [bs, bc] = (p.get('breath') ?? '').split(',').map(Number)
  return {
    debug: p.get('debug') === '1',
    seed: p.has('seed') ? Number(p.get('seed')) : Math.floor(Math.random() * 2 ** 31),
    forcedQuality: q === null || q === 'auto' ? null : Math.max(0, Math.min(2, Number(q))),
    off: (p.get('off') ?? '').split(',').filter(Boolean),
    snow: p.has('snow') ? Math.max(0, Math.min(1, Number(p.get('snow')) || 0)) : SNOW_CALM,
    storm: p.get('storm') === '1',
    breath: {
      scaleY: Number.isFinite(bs) && bs >= 1 && bs <= 1.05 ? bs : BREATH_DEFAULT.scaleY,
      cycle: Number.isFinite(bc) && bc >= 1 && bc <= 12 ? bc : BREATH_DEFAULT.cycle,
    },
  }
}

/**
 * Motor da cena. UM ÚNICO loop: um listener no `gsap.ticker` (que usa um rAF só).
 * Cada frame: atualiza o vento, o fogo e o monitor de FPS; depois chama os assinantes
 * (camadas de canvas/DOM) em ordem. Ninguém mais pede requestAnimationFrame.
 *
 * `createEngine` não tem efeitos colaterais; `start`/`stop` são idempotentes, então o
 * StrictMode (montar → desmontar → montar) nunca duplica o loop.
 */
export function createEngine({
  seed = 1,
  forcedQuality = null,
  debug = false,
  off: initialOff = [],
  breath: initialBreath = BREATH_DEFAULT,
  snow: initialSnow = SNOW_CALM,
  storm = false,
} = {}) {
  const rand = makeRng(seed)
  const wind = createWindController(rand)
  if (storm) wind.intensity = 1.5
  const flickerNoise = [makeNoise1D(rand), makeNoise1D(rand), makeNoise1D(rand)]
  const subs = new Set() // { fn, name }
  const off = new Set(initialOff)
  const breathListeners = new Set()
  const introListeners = new Set()
  const governor = createQualityGovernor({ level: forcedQuality ?? QUALITY.HIGH })

  // monitor de FPS
  let winFrames = 0
  let winTime = 0
  let ms = 16.7
  const samples = []
  let running = false
  let mq = null
  let loadedAt = null // engine.time em que a imagem terminou de carregar

  const engine = {
    seed,
    debug,
    rand,
    time: 0,
    dt: 1 / 60,
    wind,
    /** Chama: flicker orgânico (3 oitavas incomensuráveis) e inclinação pelo vento. */
    fire: { flicker: 1, lean: 0 },
    /** Estado de "acender" da cena (a Fase 3 anima estes valores de 0 a 1). */
    ignite: { fire: 1 },
    /**
     * Nevasca. `intensity` 0..1 comanda a quantidade (1500 × intensity × fator de qualidade).
     * `active` (partículas visíveis) e `storm` (0 = flocos redondos, 1 = traços) são escritos pela camada.
     * A intro (Fase 3) anima `intensity` (0 → 1 → SNOW_CALM) e `wind.intensity`.
     */
    snow: { intensity: initialSnow, active: 0, storm: 0 },
    /** Respiração do pé grande (scaleY do pico, ciclo completo em s). Calibrável no HUD. */
    breath: { ...initialBreath },
    // Lido já na criação (síncrono), não só em start(): start() roda num useEffect, ou seja,
    // DEPOIS da primeira renderização de quem consome `engine.reduced` (ex.: IntroOverlay
    // decide playCinematic/playSimpleFade já na primeira renderização). Se ficasse `false`
    // até start() rodar, prefers-reduced-motion seria ignorado na decisão inicial da intro.
    reduced: typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
    quality: forcedQuality ?? QUALITY.HIGH,
    qualityMode: forcedQuality === null ? 'auto' : 'manual',
    /** Geometria atual do stage em px (escrita pelo SceneStage). */
    stage: { w: 0, h: 0, scale: 1, x: 0, y: 0 },
    fps: { avg: 60, min: 60, ms: 16.7 },
    /** Diagnóstico (só com debug): custo de JS por camada e do tick inteiro, em ms (média móvel). */
    layerMs: {},
    jsMs: 0,
    adapt: governor,
    subscriberCount: () => subs.size,

    setStage(w, h, scale, x = 0, y = 0) {
      engine.stage.w = w
      engine.stage.h = h
      engine.stage.scale = scale
      engine.stage.x = x
      engine.stage.y = y
    },

    setSnow(patch) {
      Object.assign(engine.snow, patch)
    },
    setWindIntensity(v) {
      wind.intensity = v
    },

    /**
     * Registra uma função chamada uma vez por frame. `name` liga o assinante ao toggle e à
     * medição por camada. Retorna o cancelamento.
     */
    add(fn, name = 'misc') {
      const entry = { fn, name }
      subs.add(entry)
      return () => subs.delete(entry)
    },

    /** Marca que a imagem de fundo carregou: os 2 s de tolerância da qualidade contam daqui. */
    markLoaded() {
      if (loadedAt === null) loadedAt = engine.time
    },

    /** A intro (Fase 3) chama isto com true no início e false no fim: a qualidade não adapta. */
    setAdaptivePaused(paused) {
      governor.setPaused(paused)
      samples.length = 0
    },

    /** mode: 'auto' | 0 | 1 | 2 */
    setQualityMode(mode) {
      samples.length = 0
      governor.reset()
      if (mode === 'auto') {
        engine.qualityMode = 'auto'
        governor.level = engine.quality
      } else {
        engine.qualityMode = 'manual'
        engine.quality = mode
        governor.level = mode
      }
    },

    isOff: (key) => off.has(key),
    /** Liga/desliga uma camada. O DOM some por CSS (`data-off` na raiz); o assinante deixa de rodar. */
    setLayer(key, on) {
      if (on) off.delete(key)
      else off.add(key)
      applyOff()
    },

    setBreath(patch) {
      Object.assign(engine.breath, patch)
      for (const fn of breathListeners) fn(engine.breath)
    },
    onBreath(fn) {
      breathListeners.add(fn)
      return () => breathListeners.delete(fn)
    },

    /**
     * Botão "Repetir intro" do HUD (?debug=1): limpa o flag de sessão e avisa quem estiver
     * escutando (IntroOverlay) para remontar e tocar a timeline de novo, sem recarregar a
     * página. Não existe fora do debug — em produção a intro só roda mesmo na primeira visita.
     */
    replayIntro() {
      try {
        sessionStorage.removeItem(INTRO_SEEN_KEY)
      } catch {
        /* sessionStorage indisponível (modo privado etc.): a intro simplesmente não persiste */
      }
      for (const fn of introListeners) fn()
    },
    onIntroReplay(fn) {
      introListeners.add(fn)
      return () => introListeners.delete(fn)
    },
  }

  function applyOff() {
    document.documentElement.dataset.off = [...off].join(' ')
  }

  function monitor(dt) {
    winFrames++
    winTime += dt
    ms += (dt * 1000 - ms) * 0.1
    engine.fps.ms = ms
    if (winTime < FPS_WINDOW) return
    const winDt = winTime
    samples.push(winFrames / winTime)
    if (samples.length > FPS_SAMPLES) samples.shift()
    winFrames = 0
    winTime = 0
    let sum = 0
    let min = Infinity
    for (const s of samples) {
      sum += s
      if (s < min) min = s
    }
    engine.fps.avg = sum / samples.length
    engine.fps.min = min
    if (engine.qualityMode !== 'auto') return

    // Regra em qualityGovernor.js: ignora 2 s pós-carga e a intro; rebaixa < 50 fps por 3 s;
    // sobe após 10 s > 58 fps (no máximo 1x/min).
    const delta = governor.feed({
      sinceLoad: loadedAt === null ? -Infinity : engine.time - loadedAt,
      dt: winDt,
      avg: samples.length === FPS_SAMPLES ? engine.fps.avg : null,
    })
    if (delta !== 0) {
      engine.quality = governor.level
      samples.length = 0 // reavalia só com amostras do novo nível
    }
  }

  function tick(_time, deltaMs) {
    const dt = Math.min(deltaMs, 50) / 1000
    if (dt <= 0) return
    const t0 = debug ? performance.now() : 0
    engine.dt = dt
    engine.time += dt

    wind.update(dt)

    // Flicker: soma de três frequências não múltiplas -> nunca periódico.
    const t = engine.time
    const f = engine.reduced
      ? 0
      : 0.5 * flickerNoise[0](t * 2.3) + 0.3 * flickerNoise[1](t * 5.9 + 10) + 0.2 * flickerNoise[2](t * 11.3 + 20)
    engine.fire.flicker = Math.max(0.5, Math.min(1.3, 0.9 + 0.55 * f + wind.gust * 0.12))
    engine.fire.lean = wind.x * 0.6

    monitor(dt)

    if (debug) {
      const lm = engine.layerMs
      for (const s of subs) {
        if (off.has(s.name)) continue
        const a = performance.now()
        s.fn(engine)
        const d = performance.now() - a
        lm[s.name] = (lm[s.name] ?? d) + (d - (lm[s.name] ?? d)) * 0.05
      }
      engine.jsMs += (performance.now() - t0 - engine.jsMs) * 0.05
    } else {
      for (const s of subs) if (!off.has(s.name)) s.fn(engine)
    }
  }

  function onVisibility() {
    if (document.hidden) {
      gsap.ticker.sleep() // para o rAF: nada anima com a aba oculta
    } else {
      gsap.ticker.wake()
      winFrames = 0
      winTime = 0
      samples.length = 0
      governor.reset()
    }
  }

  function onMotionPref(e) {
    engine.reduced = e.matches
  }

  engine.start = () => {
    if (running) return
    running = true
    mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    engine.reduced = mq.matches
    mq.addEventListener('change', onMotionPref)
    document.addEventListener('visibilitychange', onVisibility)
    applyOff()
    if (debug) document.documentElement.dataset.debug = '1'
    gsap.ticker.add(tick)
    if (document.hidden) gsap.ticker.sleep()
  }

  engine.stop = () => {
    if (!running) return
    running = false
    gsap.ticker.remove(tick)
    document.removeEventListener('visibilitychange', onVisibility)
    mq?.removeEventListener('change', onMotionPref)
    mq = null
    delete document.documentElement.dataset.off
    delete document.documentElement.dataset.debug
  }

  return engine
}
