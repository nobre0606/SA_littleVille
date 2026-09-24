import {
  CircleUserRound,
  Footprints,
  LayoutDashboard,
  Map,
  Siren,
  Users,
} from 'lucide-react'

/**
 * Itens da navegação principal (barra lateral no desktop, barra inferior no mobile).
 * `noInferior: false` tira o item da barra inferior: 6 itens não cabem legíveis em 390 px
 * (~65 px cada, e "Avistamentos" precisa de ~76 px). O Perfil fica no avatar do topo no mobile.
 */
export const ITENS_NAV = [
  { para: '/dashboard', rotulo: 'Dashboard', icone: LayoutDashboard },
  { para: '/avistamentos', rotulo: 'Avistamentos', icone: Footprints },
  { para: '/mapa', rotulo: 'Mapa', icone: Map },
  { para: '/equipe', rotulo: 'Equipe', icone: Users },
  { para: '/emergencia', rotulo: 'Emergência', icone: Siren },
  { para: '/perfil', rotulo: 'Perfil', icone: CircleUserRound, noInferior: false },
]

/**
 * Rota anterior, gravada pelo RastreadorDeRota em App.jsx. Serve para a ponte visual saber que
 * a pessoa acabou de sair da intro/login (o React Router não guarda a rota anterior).
 */
export const historicoRotas = { anterior: null, atual: null }

export const ROTAS_DA_INTRO = ['/', '/login']
