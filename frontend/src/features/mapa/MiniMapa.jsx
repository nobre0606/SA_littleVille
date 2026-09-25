import { useMemo } from 'react'
import { Circle, Marker } from 'react-leaflet'
import { AREA, corDaArea } from '../../domain/idadeArea.js'
import { useServerNow } from '../../hooks/useServerNow.js'
import { MapaBase } from './MapaBase.jsx'
import { ZOOM_LOCAL, corToken, iconePegada } from './mapaBase.js'

/**
 * Mini-mapa do detalhe: a pegada no local e a área de 1 km do RF04, com cor E estilo de traço
 * conforme a idade (sólido → tracejado → pontilhado), reavaliados a cada 60 s com a hora do
 * servidor. O selo ao lado do mapa repete a faixa em texto — nunca só a cor.
 */
export function MiniMapa({ avistamento: a, className }) {
  const agora = useServerNow(60_000)
  const faixa = corDaArea(a.vistoEm, agora)
  const icone = useMemo(() => iconePegada(), [])
  const cor = corToken(faixa.token)

  return (
    <MapaBase
      centro={[a.lat, a.lng]}
      zoom={ZOOM_LOCAL - 1}
      scrollWheelZoom={false}
      rotulo={`Mapa do local do avistamento em ${a.bairro}, com a área de 1 km (${faixa.rotulo}).`}
      className={className}
    >
      <Circle
        center={[a.lat, a.lng]}
        radius={AREA.raioM}
        interactive={false}
        pathOptions={{
          color: cor,
          weight: 2,
          opacity: AREA.opacidadeTraco,
          fillColor: cor,
          fillOpacity: AREA.opacidadePreenchimento,
          dashArray: faixa.dashArray,
        }}
      />
      <Marker position={[a.lat, a.lng]} icon={icone} interactive={false} keyboard={false} />
    </MapaBase>
  )
}
