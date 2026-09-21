/** Dimensiona o canvas em px de dispositivo (DPR limitado a 2) e devolve o contexto 2D. */
export function setupCanvas(canvas, cssW, cssH, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
  canvas.width = Math.max(1, Math.round(cssW * dpr))
  canvas.height = Math.max(1, Math.round(cssH * dpr))
  const ctx = canvas.getContext('2d')
  return { ctx, dpr, w: canvas.width, h: canvas.height }
}

/** Interpola dois arrays RGB(A) e devolve o string `rgba()`. */
export const lerp = (a, b, t) => a + (b - a) * t
