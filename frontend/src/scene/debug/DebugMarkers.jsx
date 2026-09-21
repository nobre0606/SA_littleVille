import { SCENE } from '../sceneMap.js'

const CYAN = '#7FE3FF'
const FIRE = '#FF9A3C'
const GREEN = '#7CFFB2'
const PINK = '#FF7CE0'

const Pt = ({ p, label, color = CYAN }) => (
  <div className="lv-dbg-pt" style={{ left: `${p.x}%`, top: `${p.y}%`, color }}>
    <span>{label ?? `${p.x},${p.y}`}</span>
  </div>
)

const Box = ({ b, label, color, style }) => (
  <div
    className="lv-dbg-box"
    style={{ left: `${b.x0}%`, top: `${b.y0}%`, width: `${b.x1 - b.x0}%`, height: `${b.y1 - b.y0}%`, color, ...style }}
  >
    <span>{label}</span>
  </div>
)

/** ?debug=1: marcadores em % da imagem para calibrar o mapa da cena. */
export default function DebugMarkers() {
  const { fire, bigfoot, ceilingLight, portal, stalactiteTips, formArea, focus } = SCENE
  const d = fire.lightRadius.r * 2
  return (
    <div className="lv-layer" data-layer="debug" style={{ zIndex: 40 }} aria-hidden="true">
      <Pt p={fire.base} label={`fogueira base ${fire.base.x},${fire.base.y}`} color={FIRE} />
      <Pt p={{ x: fire.base.x, y: fire.tipY.y }} label={`topo chama y${fire.tipY.y}`} color={FIRE} />
      <div
        className="lv-dbg-box"
        style={{
          left: `${fire.base.x}%`,
          top: `${fire.base.y - 2}%`,
          width: `${d}%`,
          aspectRatio: '1',
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          color: FIRE,
        }}
      />
      <Box b={bigfoot.bbox} label="pé grande bbox" color={CYAN} />
      <Box b={bigfoot.region} label="região das cópias" color={PINK} />
      <Pt p={bigfoot.head} label="cabeça" />
      <Pt p={ceilingLight} label="teto (luz)" />
      <Pt p={portal} label="portal" />
      {stalactiteTips.map((p, i) => (
        <Pt key={i} p={p} label={`t${i}`} color="#EAF6FF" />
      ))}
      <Box b={focus} label="foco (nunca cortar)" color={GREEN} />
      <Box b={{ x0: formArea.xMin, y0: 0, x1: 100, y1: 100 }} label={`form x>${formArea.xMin}%`} color={PINK} />
    </div>
  )
}
