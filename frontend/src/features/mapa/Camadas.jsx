import { memo, useEffect, useMemo, useRef } from 'react'
import { Circle, Marker, useMap } from 'react-leaflet'
import { AREA, corDaArea } from '../../domain/idadeArea.js'
import { formatarTempoRelativo } from '../../lib/format.js'
import { L } from './leafletCluster.js'
import { iconeEmergencia, iconeGrupo, iconeMembro, ROTULO_EMERGENCIA } from './icones.js'
import { corToken, iconePegada } from './mapaBase.js'

/**
 * Pegadas dos avistamentos, AGRUPADAS (leaflet.markercluster): perto um do outro viram um
 * círculo com o número; aproximando, se separam.
 *
 * ATUALIZAÇÃO INCREMENTAL por id: guardamos cada marcador num Map (id → marcador). Quando os
 * dados mudam, só entram os ids novos, saem os que sumiram e muda o texto dos que mudaram —
 * o resto do mapa não é redesenhado (importante com dezenas de itens e o timer de 60 s).
 *
 * Clique (ou Enter com o marcador focado) abre o detalhe do avistamento. O title do marcador
 * dá o nome acessível ("Avistamento em Joaquina, há 12 min").
 */
export function CamadaAvistamentos({ avistamentos, agora, aoAbrir }) {
  const mapa = useMap()
  const grupo = useMemo(() => L.markerClusterGroup({ iconCreateFunction: iconeGrupo, showCoverageOnHover: false, maxClusterRadius: 44 }), [])
  const marcadores = useRef(new Map())
  const icone = useMemo(() => iconePegada(), [])
  // Guardado numa ref: o marcador é criado uma vez e sempre chama a versão atual da função.
  const abrir = useRef(aoAbrir)
  useEffect(() => {
    abrir.current = aoAbrir
  }, [aoAbrir])

  useEffect(() => {
    mapa.addLayer(grupo)
    return () => mapa.removeLayer(grupo)
  }, [mapa, grupo])

  useEffect(() => {
    const vistos = new Set()
    for (const a of avistamentos) {
      vistos.add(a.id)
      const titulo = `Avistamento em ${a.bairro}, ${formatarTempoRelativo(a.vistoEm, agora)}`
      let m = marcadores.current.get(a.id)
      if (!m) {
        m = L.marker([a.lat, a.lng], { icon: icone, title: titulo, keyboard: true })
        m.on('click keypress', () => abrir.current(a.id))
        grupo.addLayer(m)
        marcadores.current.set(a.id, m)
      } else {
        m.setLatLng([a.lat, a.lng])
        m.getElement()?.setAttribute('title', titulo)
      }
    }
    for (const [id, m] of marcadores.current) {
      if (!vistos.has(id)) {
        grupo.removeLayer(m)
        marcadores.current.delete(id)
      }
    }
  }, [avistamentos, agora, grupo, icone])

  return null
}

/**
 * Área de 1 km de UM avistamento (RF04). `memo`: só redesenha se a faixa de idade ou a posição
 * mudarem — o timer de 60 s re-renderiza a lista, mas cada círculo só muda quando troca de faixa.
 */
const AreaAvistamento = memo(function AreaAvistamento({ lat, lng, estado, token, dashArray }) {
  const cor = corToken(token)
  return (
    <Circle
      center={[lat, lng]}
      radius={AREA.raioM}
      interactive={false}
      pathOptions={{ color: cor, weight: 2, opacity: AREA.opacidadeTraco, fillColor: cor, fillOpacity: AREA.opacidadePreenchimento, dashArray, className: `lv-area-${estado}` }}
    />
  )
})

/** Todas as áreas, reavaliadas com a hora do SERVIDOR (o `agora` vem de useServerNow(60 s)). */
export function CamadaAreas({ avistamentos, agora }) {
  return avistamentos.map((a) => {
    const f = corDaArea(a.vistoEm, agora)
    return <AreaAvistamento key={a.id} lat={a.lat} lng={a.lng} estado={f.estado} token={f.token} dashArray={f.dashArray} />
  })
}

/** RF02 — locais de emergência. Clique (ou Enter no marcador focado) abre o painel com contatos. */
export function CamadaEmergencia({ locais, aoSelecionar }) {
  return locais.map((l) => (
    <MarcadorEmergencia key={l.id} local={l} aoSelecionar={aoSelecionar} />
  ))
}

const MarcadorEmergencia = memo(function MarcadorEmergencia({ local, aoSelecionar }) {
  const icone = useMemo(() => iconeEmergencia(local.tipo), [local.tipo])
  return (
    <Marker
      position={[local.lat, local.lng]}
      icon={icone}
      title={`${ROTULO_EMERGENCIA[local.tipo]}: ${local.nome}`}
      eventHandlers={{ click: () => aoSelecionar(local), keypress: (e) => e.originalEvent.key === 'Enter' && aoSelecionar(local) }}
    />
  )
})

/** Membros da equipe na última posição enviada (pino com iniciais). */
export function CamadaEquipe({ membros, agora, euId }) {
  return membros
    .filter((m) => m.ultimaPosicao && m.userId !== euId)
    .map((m) => (
      <MarcadorMembro key={m.userId} membro={m} titulo={`${m.nome} — posição de ${formatarTempoRelativo(m.ultimaPosicao.em, agora)}`} />
    ))
}

const MarcadorMembro = memo(function MarcadorMembro({ membro, titulo }) {
  const icone = useMemo(() => iconeMembro(membro), [membro])
  return <Marker position={[membro.ultimaPosicao.lat, membro.ultimaPosicao.lng]} icon={icone} title={titulo} keyboard={false} interactive={false} />
})

/** Minha posição: a pegada em outra cor, sem clique. */
export function MinhaPosicao({ posicao }) {
  const icone = useMemo(() => L.divIcon({ className: 'lv-minha-posicao', html: '<span></span>', iconSize: [20, 20] }), [])
  if (!posicao) return null
  return <Marker position={[posicao.lat, posicao.lng]} icon={icone} interactive={false} keyboard={false} />
}
