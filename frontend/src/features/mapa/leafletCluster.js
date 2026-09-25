import L from 'leaflet'
import 'leaflet.markercluster/dist/MarkerCluster.css'

/**
 * O plugin leaflet.markercluster é antigo e procura o Leaflet no `window.L` (variável global).
 * Com módulos (Vite), o Leaflet não vira global sozinho — então publicamos e só DEPOIS
 * carregamos o plugin (import dinâmico, esperado com await). Fica isolado neste arquivo.
 */
window.L = L
await import('leaflet.markercluster')

export { L }
