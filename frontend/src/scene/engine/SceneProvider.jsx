import { createContext, useContext, useEffect, useState } from 'react'
import { createEngine, readSceneParams } from './createEngine.js'

const EngineContext = createContext(null)

export function SceneProvider({ children }) {
  // Criação pura (sem efeitos): o inicializador pode rodar duas vezes no StrictMode.
  const [engine] = useState(() => createEngine(readSceneParams()))

  useEffect(() => {
    engine.start()
    if (engine.debug) window.__scene = engine
    return () => {
      engine.stop()
      if (window.__scene === engine) delete window.__scene
    }
  }, [engine])

  return <EngineContext value={engine}>{children}</EngineContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEngine() {
  const engine = useContext(EngineContext)
  if (!engine) throw new Error('useEngine fora de <SceneProvider>')
  return engine
}
