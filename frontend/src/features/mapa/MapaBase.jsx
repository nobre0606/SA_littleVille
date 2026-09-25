import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import { cx } from '../../ui/cx.js'
import { CENTRO_FLORIPA, TILES, ZOOM_CIDADE } from './mapaBase.js'

/** Prefixo da atribuição só com o link do Leaflet (o padrão traz uma bandeira em SVG solto). */
function PrefixoAtribuicao() {
  const mapa = useMap()
  useEffect(() => {
    mapa.attributionControl?.setPrefix('<a href="https://leafletjs.com">Leaflet</a>')
  }, [mapa])
  return null
}

/**
 * Mapa com os tiles CARTO Positron, controles de zoom em português e a atribuição exigida.
 * `rotulo` dá nome ao mapa para leitor de tela (a região do mapa é focável pelo teclado e as
 * setas movem o mapa — padrão do Leaflet).
 */
export function MapaBase({ centro = CENTRO_FLORIPA, zoom = ZOOM_CIDADE, rotulo, className, children, ...props }) {
  return (
    <div
      role="region"
      aria-label={rotulo}
      className={cx('relative isolate overflow-hidden rounded-md border border-border', TILES.neutralizar && 'lv-tiles-neutros', className)}
    >
      <MapContainer
        center={centro}
        zoom={zoom}
        zoomControl={false}
        attributionControl
        className="h-full w-full"
        {...props}
      >
        <TileLayer url={TILES.url} attribution={TILES.atribuicao} maxZoom={TILES.zoomMaximo} />
        <ZoomControl position="topright" zoomInTitle="Aproximar" zoomOutTitle="Afastar" />
        <PrefixoAtribuicao />
        {children}
      </MapContainer>
    </div>
  )
}
