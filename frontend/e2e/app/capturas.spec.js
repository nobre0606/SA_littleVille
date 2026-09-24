import { test } from '@playwright/test'
import { TAMANHOS, abrir } from './apoio.js'

/**
 * Capturas de tela dos 4 tamanhos exigidos (390x844, 768x1024, 1366x768, 1920x1080) em
 * e2e/out/fase-0.5/ (fora do git). Página inteira, para revisar o layout de ponta a ponta.
 */
const TELAS = ['/dashboard', '/perfil', '/permissao-localizacao', '/rota-inexistente', '/ui-kit']

for (const tamanho of TAMANHOS) {
  test(`capturas ${tamanho.nome}`, async ({ page }) => {
    await page.setViewportSize(tamanho)
    for (const caminho of TELAS) {
      await abrir(page, caminho)
      await page.waitForTimeout(450)
      const nome = caminho.replace(/\//g, '') || 'raiz'
      await page.screenshot({ path: `e2e/out/fase-0.5/${tamanho.nome}-${nome}.png`, fullPage: true })
    }
  })
}
