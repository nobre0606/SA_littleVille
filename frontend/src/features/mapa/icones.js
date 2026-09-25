import hospital from 'lucide-static/icons/hospital.svg'
import shield from 'lucide-static/icons/shield.svg'
import flame from 'lucide-static/icons/flame.svg'
import siren from 'lucide-static/icons/siren.svg'
import tent from 'lucide-static/icons/tent.svg'
import { L } from './leafletCluster.js'
import { iniciais, pastelDoId } from '../../lib/avatar.js'

/**
 * Ícones dos marcadores (divIcon = HTML, nunca o pino azul padrão do Leaflet).
 *
 * Os ícones de emergência são os MESMOS do lucide (pacote lucide-static, em arquivo .svg),
 * usados como máscara: a forma vem do arquivo e a cor do token, como a pegada.
 * &quot; no url(): o Vite pode embutir o SVG como data: URI com aspas simples dentro.
 */
const mascara = (url) => `-webkit-mask-image:url(&quot;${url}&quot;);mask-image:url(&quot;${url}&quot;)`

export const ICONE_EMERGENCIA = { hospital, policia: shield, bombeiros: flame, defesa_civil: siren, abrigo: tent }

export const ROTULO_EMERGENCIA = {
  hospital: 'Hospital',
  policia: 'Polícia',
  bombeiros: 'Bombeiros',
  defesa_civil: 'Defesa Civil',
  abrigo: 'Abrigo',
}

export function iconeEmergencia(tipo) {
  return L.divIcon({
    className: 'lv-pino-emergencia',
    html: `<span style="${mascara(ICONE_EMERGENCIA[tipo])}"></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

/** Pino com as iniciais do membro da equipe, no pastel estável do id (igual ao avatar). */
export function iconeMembro(membro) {
  return L.divIcon({
    className: `lv-pino-membro lv-pastel-${pastelDoId(membro.userId)}`,
    // Iniciais vêm de nome de usuário: escapamos para nunca virar HTML (letras e espaço já bastam).
    html: `<span>${iniciais(membro.nome).replace(/[^\p{L}\p{N}]/gu, '')}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

/** Ícone de grupo (cluster): a pegada com o número de avistamentos agrupados. */
export function iconeGrupo(grupo) {
  const n = grupo.getChildCount()
  return L.divIcon({
    className: 'lv-grupo-avistamentos',
    html: `<span>${n}</span>`,
    iconSize: [40, 40],
  })
}
