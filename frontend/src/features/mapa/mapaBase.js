import L from 'leaflet'
import pegadaUrl from '../../ui/brand/pegada.svg'

/**
 * Peças comuns dos mapas (formulário, detalhe e, na Fase 3, o mapa principal).
 */

/** Florianópolis inteira (ilha + continente) cabe neste enquadramento. */
export const CENTRO_FLORIPA = [-27.61, -48.49]
export const ZOOM_CIDADE = 11
export const ZOOM_LOCAL = 15

/**
 * Servidor de tiles (o "fundo" do mapa). Ver DECISOES D16.
 *
 * O brief pedia CARTO Positron, mas desde 2026 o CARTO exige chave de API: sem ela, todo tile
 * vem com a marca "API KEY REQUIRED" (conferido em 25/09/2026). Por isso o servidor é
 * CONFIGURÁVEL por variável de ambiente:
 *  - VITE_MAPA_TILES_URL / VITE_MAPA_TILES_ATRIBUICAO: qualquer servidor compatível (ex.: o
 *    Positron com a chave da sua conta CARTO). Chave de tiles é pública por natureza (vai
 *    em toda requisição do navegador), então não é segredo.
 *  - Sem variável: OpenStreetMap padrão (gratuito, sem chave), com um filtro que o deixa claro
 *    e neutro como o Positron (classe .lv-tiles-neutros em app.css).
 * A atribuição do OpenStreetMap é obrigatória pela licença e aparece no rodapé do mapa.
 */
const env = import.meta.env ?? {}
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export const TILES = {
  url: env.VITE_MAPA_TILES_URL || OSM_URL,
  atribuicao: env.VITE_MAPA_TILES_ATRIBUICAO || OSM_ATRIBUICAO,
  zoomMaximo: 19,
  // O filtro de neutralização só faz sentido no OSM colorido; um Positron já vem neutro.
  neutralizar: !env.VITE_MAPA_TILES_URL,
}

/**
 * Lê a cor de um token do tema (ex.: 'status-fresh') no momento do uso. O Leaflet desenha em
 * SVG/canvas e precisa da cor em si, não de `var(--...)`; ler do CSS evita repetir a cor aqui
 * (a única fonte continua sendo o tokens.css).
 */
export function corToken(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${nome}`).trim()
}

/**
 * Marcador em forma de PEGADA (o pino azul padrão do Leaflet é proibido). É um divIcon: um
 * <span> com a pegada.svg como máscara, pintado pela classe .lv-marcador (app.css).
 */
export function iconePegada() {
  return L.divIcon({
    className: 'lv-marcador',
    // &quot; (e não aspas simples): o Vite embute o SVG como data: URI que JÁ contém aspas
    // simples — com url('...') a máscara quebrava e a pegada virava um retângulo.
    html: `<span style="-webkit-mask-image:url(&quot;${pegadaUrl}&quot;);mask-image:url(&quot;${pegadaUrl}&quot;)"></span>`,
    iconSize: [28, 40],
    iconAnchor: [14, 38],
  })
}
