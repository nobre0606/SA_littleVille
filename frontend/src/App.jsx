import { lazy, Suspense, useLayoutEffect } from 'react'
import { Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements, useLocation } from 'react-router-dom'
import { AppLayout } from './app/AppLayout.jsx'
import { AppShell } from './app/AppShell.jsx'
import { ErroGlobal } from './app/ErroGlobal.jsx'
import { Providers } from './app/Providers.jsx'
import { RequireSession } from './app/RequireSession.jsx'
import { historicoRotas } from './app/navegacao.js'
import { CarregandoPegadas } from './ui/brand/Pegada.jsx'

/*
 * DIVISÃO POR ROTA (orçamento de bundle — ver scripts/check-bundle.mjs e DECISOES D15):
 * cada tela é um pedaço carregado sob demanda. A cena/intro (GSAP) não entra no app, e as telas
 * do app (Recharts, Leaflet) não entram na intro. A entrada inicial fica só com React, roteador,
 * cache de dados e a moldura — abaixo de 200 kB gzip, e o build falha se passar.
 */
const SceneScreen = lazy(() => import('./pages/SceneScreen.jsx'))
const PermissaoLocalizacao = lazy(() => import('./pages/PermissaoLocalizacao.jsx'))
const Perfil = lazy(() => import('./pages/Perfil.jsx'))
const NaoEncontrado = lazy(() => import('./pages/NaoEncontrado.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Mapa = lazy(() => import('./pages/Mapa.jsx'))
const Equipe = lazy(() => import('./pages/Equipe.jsx'))
const Emergencia = lazy(() => import('./pages/Emergencia.jsx'))
const ListaAvistamentos = lazy(() => import('./pages/avistamentos/Lista.jsx'))
const DetalheAvistamento = lazy(() => import('./pages/avistamentos/Detalhe.jsx'))
const FormularioAvistamento = lazy(() => import('./pages/avistamentos/Formulario.jsx'))
// Só em desenvolvimento: em produção `import.meta.env.DEV` é false e o Vite remove o import.
const UiKit = import.meta.env.DEV ? lazy(() => import('./pages/UiKit.jsx')) : null

/**
 * Guarda a rota anterior para a ponte visual intro → app. Usa useLayoutEffect de propósito: os
 * efeitos de layout rodam na ordem da árvore, e este componente vem ANTES das rotas — então,
 * quando o efeito da PonteIntro (dentro das rotas) roda, a rota anterior já está gravada. Tudo
 * antes da tela ser pintada. Idempotente: rodar duas vezes (StrictMode) não muda o resultado.
 */
function RastreadorDeRota() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    if (historicoRotas.atual === pathname) return
    historicoRotas.anterior = historicoRotas.atual
    historicoRotas.atual = pathname
  }, [pathname])
  return null
}

const carregandoTela = (
  <div className="flex min-h-[50dvh] items-center justify-center">
    <CarregandoPegadas rotulo="Carregando tela…" />
  </div>
)

/** Raiz de todas as rotas: rastreador + Suspense das telas carregadas sob demanda. */
function Raiz() {
  return (
    <>
      <RastreadorDeRota />
      <Suspense fallback={carregandoTela}>
        <Outlet />
      </Suspense>
    </>
  )
}

// A cena carrega sob demanda com um fundo na cor da caverna: a intro nunca "pisca" claro.
const cena = (
  <Suspense fallback={<div className="h-dvh" style={{ background: 'var(--lv-bg)' }} />}>
    <SceneScreen />
  </Suspense>
)

/*
 * Roteador "de dados" (createBrowserRouter) em vez de <BrowserRouter>: é o que habilita o
 * `useBlocker` — o aviso de "alterações não salvas" do formulário de avistamento (Fase 1).
 */
const roteador = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Raiz />} errorElement={<ErroGlobal />}>
      {/* Intro + login/cadastro (congelados). "/login" é o destino do 401 e do "Sair". */}
      <Route path="/" element={cena} />
      <Route path="/login" element={cena} />

      <Route element={<AppLayout />}>
        <Route element={<RequireSession />}>
          <Route path="/permissao-localizacao" element={<PermissaoLocalizacao />} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/avistamentos" element={<ListaAvistamentos />} />
            <Route path="/avistamentos/novo" element={<FormularioAvistamento />} />
            <Route path="/avistamentos/:id" element={<DetalheAvistamento />} />
            <Route path="/avistamentos/:id/editar" element={<FormularioAvistamento />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/emergencia" element={<Emergencia />} />
            <Route path="/perfil" element={<Perfil />} />
            {UiKit && <Route path="/ui-kit" element={<UiKit />} />}
          </Route>
        </Route>
        <Route path="*" element={<NaoEncontrado />} />
      </Route>
    </Route>,
  ),
)

export default function App() {
  return (
    <Providers>
      <RouterProvider router={roteador} />
    </Providers>
  )
}
