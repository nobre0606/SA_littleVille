import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './app/AppLayout.jsx'
import { AppShell } from './app/AppShell.jsx'
import { Providers } from './app/Providers.jsx'
import { RequireSession } from './app/RequireSession.jsx'
import { historicoRotas } from './app/navegacao.js'
import { EmConstrucao } from './pages/EmConstrucao.jsx'
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

// A cena carrega sob demanda com um fundo na cor da caverna: a intro nunca "pisca" claro.
const cena = (
  <Suspense fallback={<div className="h-dvh" style={{ background: 'var(--lv-bg)' }} />}>
    <SceneScreen />
  </Suspense>
)

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <RastreadorDeRota />
        <Suspense fallback={carregandoTela}>
          <Routes>
            {/* Intro + login/cadastro (congelados). "/login" é o destino do 401 e do "Sair". */}
            <Route path="/" element={cena} />
            <Route path="/login" element={cena} />

            <Route element={<AppLayout />}>
              <Route element={<RequireSession />}>
                <Route path="/permissao-localizacao" element={<PermissaoLocalizacao />} />
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<EmConstrucao titulo="Dashboard" descricao="Métricas e gráficos dos avistamentos." fase="Fase 2" />} />
                  <Route path="/avistamentos/*" element={<EmConstrucao titulo="Avistamentos" descricao="Registre, consulte e gerencie avistamentos." fase="Fase 1" />} />
                  <Route path="/mapa" element={<EmConstrucao titulo="Mapa" descricao="Áreas de avistamento, equipe e locais de emergência." fase="Fase 3" />} />
                  <Route path="/equipe" element={<EmConstrucao titulo="Equipe" descricao="Sua equipe e o chat." fase="Fase 4" />} />
                  <Route path="/emergencia" element={<EmConstrucao titulo="Emergência" descricao="Hospitais, polícia, bombeiros e abrigos." fase="Fase 3" />} />
                  <Route path="/perfil" element={<Perfil />} />
                  {UiKit && <Route path="/ui-kit" element={<UiKit />} />}
                </Route>
              </Route>
              <Route path="*" element={<NaoEncontrado />} />
            </Route>
          </Routes>
        </Suspense>
      </Providers>
    </BrowserRouter>
  )
}
