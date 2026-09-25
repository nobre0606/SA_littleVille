import { useEffect, useState } from 'react'
import { localizacao } from '../../api/recursos.js'

const INTERVALO_MS = 30_000

/**
 * RF09 — com a tela do mapa ABERTA, lê a posição do aparelho e envia a cada 30 s
 * (POST /api/me/location), para a equipe ver onde a pessoa está.
 *
 * - Aba oculta: não lê nem envia (economiza bateria e dados); volta ao reaparecer.
 * - Saiu da tela: o efeito é desmontado e o envio PARA — a posição só é compartilhada com o
 *   mapa aberto, como a tela de permissão promete.
 * - GPS negado/indisponível: o mapa funciona normalmente; só avisamos que não está compartilhando.
 * - Falha de rede no envio: ignorada — a próxima tentativa é em 30 s.
 */
export function useCompartilharPosicao() {
  const [posicao, setPosicao] = useState(null)
  // buscando | compartilhando | negado | indisponivel
  const [estado, setEstado] = useState(() => ('geolocation' in navigator ? 'buscando' : 'indisponivel'))

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    let ativo = true
    const ler = () => {
      if (document.visibilityState === 'hidden') return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!ativo) return
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, precisaoM: Math.round(pos.coords.accuracy) }
          setPosicao(p)
          setEstado('compartilhando')
          localizacao.enviar(p).catch(() => {})
        },
        (erro) => ativo && setEstado(erro.code === erro.PERMISSION_DENIED ? 'negado' : 'indisponivel'),
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 20_000 },
      )
    }
    ler()
    const id = setInterval(ler, INTERVALO_MS)
    document.addEventListener('visibilitychange', ler)
    return () => {
      ativo = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', ler)
    }
  }, [])

  return { posicao, estado }
}
