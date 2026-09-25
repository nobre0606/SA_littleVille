import { TAMANHOS, abrir, test } from './apoio.js'

/**
 * Capturas de tela dos 4 tamanhos exigidos (390x844, 768x1024, 1366x768, 1920x1080) em
 * e2e/out/fase-1/ (fora do git). Página inteira, para revisar o layout de ponta a ponta.
 */
const TELAS = [
  '/avistamentos',
  '/avistamentos/novo',
  '/avistamentos/s_001',
  '/avistamentos/s_001/editar',
  '/dashboard',
  '/perfil',
  '/permissao-localizacao',
  '/rota-inexistente',
  '/ui-kit',
]

for (const tamanho of TAMANHOS) {
  test(`capturas ${tamanho.nome}`, async ({ page }) => {
    test.setTimeout(120_000) // 9 telas de página inteira
    await page.setViewportSize(tamanho)
    for (const caminho of TELAS) {
      await abrir(page, caminho)
      await page.waitForTimeout(450)
      const nome = caminho.slice(1).replace(/\//g, '-') || 'raiz'
      await page.screenshot({ path: `e2e/out/fase-1/${tamanho.nome}-${nome}.png`, fullPage: true })
    }
  })
}
