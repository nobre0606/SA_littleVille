import { useEffect, useMemo, useState } from 'react'
import { Marker, useMapEvents } from 'react-leaflet'
import { Crosshair } from 'lucide-react'
import { Botao } from '../../ui/Botao.jsx'
import { MapaBase } from './MapaBase.jsx'
import { ZOOM_LOCAL, iconePegada } from './mapaBase.js'

/** Toque/clique no mapa marca o local ("manual"). */
function CliqueNoMapa({ aoMarcar }) {
  useMapEvents({
    click: (e) => aoMarcar({ lat: e.latlng.lat, lng: e.latlng.lng, origem: 'manual', precisaoM: null }),
  })
  return null
}

/**
 * Seletor de local do avistamento (RN01).
 *
 * Três jeitos de marcar, para ninguém ficar sem opção:
 *  - tocar/clicar no mapa;
 *  - "Usar minha localização" (GPS — botão fica no formulário);
 *  - "Marcar o centro do mapa": para quem usa TECLADO. O mapa é focável e as setas o movem
 *    (padrão do Leaflet); a mira fica no centro e o botão marca aquele ponto. Sem isto, marcar
 *    local exigiria mouse ou toque.
 *
 * Quando o local muda (ex.: veio do GPS), o mapa voa até ele.
 */
export function MapaSeletor({ local, aoMarcar, className }) {
  const [mapa, setMapa] = useState(null)
  const icone = useMemo(() => iconePegada(), [])

  useEffect(() => {
    if (mapa && local) mapa.flyTo([local.lat, local.lng], Math.max(mapa.getZoom(), ZOOM_LOCAL), { duration: 0.3 })
  }, [mapa, local])

  const marcarCentro = () => {
    const c = mapa.getCenter()
    aoMarcar({ lat: c.lat, lng: c.lng, origem: 'manual', precisaoM: null })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <MapaBase
          rotulo="Mapa para marcar o local do avistamento. Toque no ponto, ou mova com as setas e use o botão Marcar o centro do mapa."
          className={className}
          ref={setMapa}
        >
          <CliqueNoMapa aoMarcar={aoMarcar} />
          {local && <Marker position={[local.lat, local.lng]} icon={icone} interactive={false} keyboard={false} />}
        </MapaBase>
        {/* Mira do centro (decorativa): mostra qual ponto o botão abaixo vai marcar. */}
        <Crosshair
          size={24}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-[500] -translate-x-1/2 -translate-y-1/2 text-ink-1"
        />
      </div>
      <Botao variante="fantasma" icone={Crosshair} onClick={marcarCentro} disabled={!mapa} className="self-start">
        Marcar o centro do mapa
      </Botao>
    </div>
  )
}
