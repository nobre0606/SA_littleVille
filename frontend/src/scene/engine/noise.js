/** PRNG determinístico (mulberry32). Com `?seed=N` a cena fica reproduzível nos testes. */
export function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Ruído de gradiente 1D (Perlin), saída em ~[-1, 1]. */
export function makeNoise1D(rng) {
  const N = 256
  const grad = new Float32Array(N)
  const perm = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    grad[i] = rng() * 2 - 1
    perm[i] = i
  }
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = perm[i]
    perm[i] = perm[j]
    perm[j] = t
  }
  return (x) => {
    const xi = Math.floor(x)
    const xf = x - xi
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
    const g0 = grad[perm[xi & 255]] * xf
    const g1 = grad[perm[(xi + 1) & 255]] * (xf - 1)
    return (g0 + (g1 - g0) * u) * 2
  }
}
