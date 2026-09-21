import { useEffect, useRef } from 'react'
import { IMAGE } from '../sceneMap.js'
import { useEngine } from '../engine/SceneProvider.jsx'

/**
 * Camada 1. Se `backgroundVideo` existir (MP4/WebM em loop, muted, playsInline), ela
 * substitui a imagem. O vídeo pausa com a aba oculta.
 */
export default function Background({ backgroundVideo }) {
  const engine = useEngine()
  const videoRef = useRef(null)
  const imgRef = useRef(null)

  // Avisa o motor quando a mídia carregou: os 2 s de tolerância da qualidade contam daqui.
  useEffect(() => {
    const el = videoRef.current ?? imgRef.current
    if (!el) return
    const ready = () => engine.markLoaded()
    if (el.complete || el.readyState >= 2) {
      ready()
      return
    }
    const evt = el.tagName === 'VIDEO' ? 'loadeddata' : 'load'
    el.addEventListener(evt, ready, { once: true })
    return () => el.removeEventListener(evt, ready)
  }, [engine, backgroundVideo])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const sync = () => (document.hidden ? v.pause() : v.play().catch(() => {}))
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [backgroundVideo])

  if (backgroundVideo) {
    return (
      <video
        ref={videoRef}
        className="lv-bg"
        data-layer="background"
        src={backgroundVideo}
        poster={IMAGE.src}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
    )
  }
  return (
    <img
      ref={imgRef}
      className="lv-bg"
      data-layer="background"
      src={IMAGE.src}
      alt=""
      width={IMAGE.w}
      height={IMAGE.h}
      decoding="async"
      fetchPriority="high"
      draggable={false}
    />
  )
}
