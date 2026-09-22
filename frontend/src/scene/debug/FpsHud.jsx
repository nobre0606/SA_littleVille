import { useEffect, useRef, useState } from 'react'
import { LAYER_DEFS, QUALITY_NAMES } from '../engine/createEngine.js'
import { useEngine } from '../engine/SceneProvider.jsx'
import { runIntroBenchmark, STORM_TIERS } from '../engine/introBenchmark.js'
import { SNOW_CALM } from '../engine/createEngine.js'

const MODES = [
  ['auto', 'auto'],
  [2, 'alta'],
  [1, 'média'],
  [0, 'baixa'],
]

/** Mesmo valor usado no A/B do lineCap: sustenta storm=1.00 de forma confiável (ao contrário
 * do checkbox "tempestade ×1.5", que com o vento variando pode ficar longe de 1.00). */
const SUSTAINED_STORM_WIND = 4

/**
 * HUD de diagnóstico (?debug=1). O texto e os ms por camada são atualizados direto no DOM
 * pelo mesmo ticker do motor (sem re-render do React). Controles:
 *  - qualidade: auto / alta / média / baixa (trava o nível);
 *  - camadas 1–9 e 11 (+ 5b, o filtro SVG do pelo): liga/desliga isolando o custo;
 *  - respiração do pé grande: slider de scaleY (1.000–1.020) e do ciclo (3–6 s).
 *
 * "ms" por camada = tempo de JS do assinante (média móvel), medido com performance.now().
 * Não inclui raster/composição na GPU, nem os tweens do GSAP (raios, portal, gotas): para
 * esses, use a variação de FPS ao desligar a camada. No Safari o performance.now() tem
 * resolução de 1 ms, então o número é uma média estatística, não uma leitura exata.
 */
export default function FpsHud() {
  const engine = useEngine()
  const textRef = useRef(null)
  const msRefs = useRef({})
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState(engine.qualityMode === 'auto' ? 'auto' : engine.quality)
  const [off, setOff] = useState(() => new Set(LAYER_DEFS.filter((d) => engine.isOff(d.key)).map((d) => d.key)))
  const [breath, setBreath] = useState({ ...engine.breath })
  const [snow, setSnowUi] = useState(engine.snow.intensity)
  const [stormWind, setStormWind] = useState(engine.wind.intensity > 1)
  const [bench, setBench] = useState(null) // resultado do benchmark da intro (Fase 3, ainda não ligado)

  useEffect(() => {
    const el = textRef.current
    let acc = 1
    return engine.add((e) => {
      acc += e.dt
      if (acc < 0.25) return
      acc = 0
      const q = QUALITY_NAMES[e.quality]
      const g = e.adapt
      el.textContent =
        `FPS ${e.fps.avg.toFixed(0)} (min ${e.fps.min.toFixed(0)})  ${e.fps.ms.toFixed(1)} ms  js ${e.jsMs.toFixed(2)} ms\n` +
        `Q ${q} ${e.qualityMode === 'auto' ? '[auto]' : '[manual]'}  loops ${e.subscriberCount()}\n` +
        (e.qualityMode === 'auto'
          ? `adapt ${g.paused ? 'PAUSADA' : `↓${g.lowFor.toFixed(1)}/3s ↑${g.highFor.toFixed(1)}/10s`}\n`
          : '') +
        `stage ${e.stage.w.toFixed(0)}x${e.stage.h.toFixed(0)}  dpr ${Math.min(window.devicePixelRatio || 1, 2)}\n` +
        `vento ${e.wind.strength.toFixed(2)}  chama ${e.fire.flicker.toFixed(2)}${e.reduced ? '  reduced-motion' : ''}
` +
        `neve ${e.snow.active}/1500  traço ${e.snow.storm.toFixed(2)}`
      for (const { key } of LAYER_DEFS) {
        const span = msRefs.current[key]
        if (!span) continue
        const v = e.layerMs[key]
        span.textContent = e.isOff(key) ? 'off' : v === undefined ? '' : v.toFixed(2)
      }
    }, 'hud')
  }, [engine])

  const setQuality = (m) => {
    engine.setQualityMode(m)
    setMode(m)
  }
  const toggleLayer = (key, on) => {
    engine.setLayer(key, on)
    setOff((prev) => {
      const next = new Set(prev)
      if (on) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const changeSnow = (v) => {
    engine.setSnow({ intensity: v })
    setSnowUi(v)
  }
  const changeStorm = (on) => {
    engine.setWindIntensity(on ? 1.5 : 1)
    setStormWind(on)
  }
  const runBenchmark = async () => {
    setBench('medindo…')
    const r = await runIntroBenchmark(engine)
    setBench(
      `${r.tier} — ${r.hz.toFixed(0)}Hz detectado, ${(r.dropRatio * 100).toFixed(1)}% de frames perdidos ` +
        `(${r.dropped}/${r.frames}) → ${STORM_TIERS[r.tier].cap} flocos`,
    )
    setSnowUi(engine.snow.intensity)
    setStormWind(engine.wind.intensity > 1)
  }
  const presetCalmo = () => {
    engine.setSnow({ intensity: SNOW_CALM })
    engine.setWindIntensity(1)
    setSnowUi(SNOW_CALM)
    setStormWind(false)
  }
  const presetTempestade = () => {
    engine.setSnow({ intensity: 1 })
    engine.setWindIntensity(SUSTAINED_STORM_WIND)
    setSnowUi(1)
    setStormWind(true)
  }
  const changeBreath = (patch) => {
    engine.setBreath(patch)
    setBreath({ ...engine.breath })
  }

  return (
    <div className="lv-hud" data-testid="hud">
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <pre ref={textRef} style={{ flex: 1 }}>
          FPS …
        </pre>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Recolher/expandir controles">
          {open ? '▾' : '▸'}
        </button>
      </div>

      {open && (
        <>
          <div className="row" role="group" aria-label="Qualidade">
            {MODES.map(([m, label]) => (
              <button key={label} type="button" aria-pressed={mode === m} onClick={() => setQuality(m)}>
                {label}
              </button>
            ))}
          </div>

          <h4>Camadas (ms = JS por frame)</h4>
          {LAYER_DEFS.map(({ key, label, sub }) => (
            <label key={key} className={`layer${sub ? ' sub' : ''}`}>
              <input type="checkbox" checked={!off.has(key)} onChange={(ev) => toggleLayer(key, ev.target.checked)} />
              <span>{label}</span>
              <span className="ms" ref={(el) => (msRefs.current[key] = el)} />
            </label>
          ))}

          <h4>Benchmark da intro</h4>
          <button type="button" onClick={runBenchmark} style={{ width: '100%' }}>
            rodar benchmark (0,4 s)
          </button>
          {bench && (
            <pre data-testid="bench-result" style={{ marginTop: 4, opacity: 0.85 }}>
              {bench}
            </pre>
          )}

          <h4>Nevasca</h4>
          <div className="row">
            <button type="button" onClick={presetCalmo}>
              Calmo
            </button>
            <button type="button" onClick={presetTempestade}>
              Tempestade (sustentada)
            </button>
          </div>
          <label style={{ display: 'block' }}>
            intensidade {snow.toFixed(2)} (~{Math.round(snow * 1500)} flocos)
            <input type="range" min="0" max="1" step="0.01" value={snow} onChange={(ev) => changeSnow(Number(ev.target.value))} />
          </label>
          <label className="layer">
            <input type="checkbox" checked={stormWind} onChange={(ev) => changeStorm(ev.target.checked)} />
            <span>tempestade (vento ×1.5)</span>
          </label>

          <h4>Intro</h4>
          <button type="button" onClick={() => engine.replayIntro()} style={{ width: '100%' }}>
            Repetir intro
          </button>

          <h4>Respiração do pé grande</h4>
          <label style={{ display: 'block' }}>
            scaleY {breath.scaleY.toFixed(3)}
            <input
              type="range"
              min="1"
              max="1.02"
              step="0.001"
              value={breath.scaleY}
              onChange={(ev) => changeBreath({ scaleY: Number(ev.target.value) })}
            />
          </label>
          <label style={{ display: 'block' }}>
            ciclo {breath.cycle.toFixed(1)} s
            <input
              type="range"
              min="3"
              max="6"
              step="0.1"
              value={breath.cycle}
              onChange={(ev) => changeBreath({ cycle: Number(ev.target.value) })}
            />
          </label>
          <pre style={{ marginTop: 4, opacity: 0.8 }}>{`?breath=${breath.scaleY.toFixed(3)},${breath.cycle.toFixed(1)}`}</pre>
        </>
      )}
    </div>
  )
}
