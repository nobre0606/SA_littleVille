/**
 * Distância em metros entre dois pontos (fórmula de haversine: considera a curvatura da Terra;
 * erro desprezível nas distâncias de uma cidade).
 *
 * Usada só para ORDENAR a visão em lista do mapa "por distância" (RF01). Não é estatística nem
 * filtro: a lista é exatamente a que o servidor mandou; só a ordem muda, porque só o aparelho
 * sabe onde a pessoa está agora.
 */
const RAIO_TERRA_M = 6_371_000
const rad = (graus) => (graus * Math.PI) / 180

export function distanciaM(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * RAIO_TERRA_M * Math.asin(Math.sqrt(h))
}

/** "350 m" · "1,2 km" · "18 km". */
export function formatarDistancia(m) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  if (m < 10_000) return `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
  return `${Math.round(m / 1000)} km`
}

/**
 * Ordena por distância e, empatando (ou sem posição), pelo mais recente. Devolve uma CÓPIA com
 * a distância anotada — nunca altera a lista recebida.
 */
export function ordenarPorDistanciaEHora(avistamentos, posicao) {
  return avistamentos
    .map((a) => ({ ...a, distanciaM: posicao ? distanciaM(posicao, a) : null }))
    .sort((x, y) => {
      if (x.distanciaM !== null && y.distanciaM !== null && x.distanciaM !== y.distanciaM) return x.distanciaM - y.distanciaM
      return x.vistoEm < y.vistoEm ? 1 : x.vistoEm > y.vistoEm ? -1 : 0
    })
}
