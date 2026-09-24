import { useLayoutEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { ColdStartScreen } from '../ui/ColdStartScreen.jsx'
import { ROTAS_DA_INTRO, historicoRotas } from './navegacao.js'

/**
 * Raiz de TODAS as telas do app (depois do login, 404, permissão de GPS).
 *
 * 1. Liga o "mundo claro": `data-area="app"` no <html> ativa a paleta do app (tokens.css) e
 *    o fundo `--surface-app`; ao sair (voltar para o login), remove — a intro volta a ser escura.
 * 2. Ajusta a `theme-color` (barra do navegador no celular) para a superfície do app, lendo o
 *    valor do token em vez de repetir a cor aqui.
 * 3. Ponte visual intro → app (abaixo).
 */
export function AppLayout() {
  useLayoutEffect(() => {
    const html = document.documentElement
    html.dataset.area = 'app'
    const meta = document.querySelector('meta[name="theme-color"]')
    const corAnterior = meta?.getAttribute('content')
    meta?.setAttribute('content', getComputedStyle(html).getPropertyValue('--surface-app').trim())
    return () => {
      delete html.dataset.area
      if (corAnterior) meta?.setAttribute('content', corAnterior)
    }
  }, [])

  return (
    <>
      <PonteIntro />
      <ColdStartScreen />
      <Outlet />
    </>
  )
}

/**
 * Ponte entre a intro (escura) e o app (claro): logo depois do login, uma camada com a cor da
 * caverna cobre a tela e clareia até sumir em 320 ms, revelando o `--surface-app`. Sem ela o
 * corte do escuro para o claro é um "flash" que cansa a vista.
 *
 * Só acontece vindo da intro/login (rota anterior gravada pelo RastreadorDeRota, em App.jsx).
 * Animação pela Web Animations API direto no elemento, dentro de um efeito de LAYOUT: roda
 * antes da primeira pintura, então nunca aparece um quadro claro antes da camada escura.
 * Com movimento reduzido, não anima (troca direta).
 */
function PonteIntro() {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const camada = ref.current
    const veioDaIntro = ROTAS_DA_INTRO.includes(historicoRotas.anterior)
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!camada || !veioDaIntro || reduzir) return
    const duracao = parseFloat(getComputedStyle(camada).getPropertyValue('--dur-slow')) || 320
    const animacao = camada.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: duracao,
      easing: getComputedStyle(camada).getPropertyValue('--ease-out').trim() || 'ease-out',
    })
    return () => animacao.cancel()
  }, [])

  // Opacidade 0 em repouso: só fica visível enquanto a animação roda.
  return <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 opacity-0" style={{ background: 'var(--lv-bg)' }} />
}
