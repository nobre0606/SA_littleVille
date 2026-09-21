import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useEngine } from './engine/SceneProvider.jsx'
import { computeCover } from './stageMath.js'

const StageContext = createContext({ w: 0, h: 0, scale: 1 })

// eslint-disable-next-line react-refresh/only-export-components
export const useStage = () => useContext(StageContext)

/**
 * Container com a proporção 1672:941 que cobre a viewport (cover em JS, recalculado no
 * resize). Todos os overlays são filhos e se posicionam em % da imagem. `--s` expõe a
 * escala (px por px-da-imagem) para tamanhos absolutos coerentes (gotas, brasas...).
 */
export default function SceneStage({ children }) {
  const engine = useEngine()
  const hostRef = useRef(null)
  const [geom, setGeom] = useState({ w: 0, h: 0, x: 0, y: 0, scale: 1 })

  useEffect(() => {
    const host = hostRef.current
    const update = () => {
      const g = computeCover(host.clientWidth, host.clientHeight)
      engine.setStage(g.w, g.h, g.scale, g.x, g.y)
      setGeom(g)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(host)
    return () => ro.disconnect()
  }, [engine])

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      {geom.w > 0 && (
        <StageContext value={geom}>
          <div
            className="lv-stage"
            data-testid="scene-stage"
            style={{
              width: geom.w,
              height: geom.h,
              transform: `translate3d(${geom.x}px, ${geom.y}px, 0)`,
              '--s': geom.scale,
            }}
          >
            {children}
          </div>
        </StageContext>
      )}
    </div>
  )
}
