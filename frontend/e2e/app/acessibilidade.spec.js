import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'
import { ROTAS, TAMANHOS, abrir, test } from './apoio.js'

/**
 * axe-core em TODAS as rotas do app, no mobile e no desktop: zero violação WCAG 2.1 A/AA
 * (contraste, rótulos, nomes acessíveis, estrutura). Também confere área de toque ≥ 44 px.
 */

const TODAS = [
  ...ROTAS.map((r) => r.caminho),
  '/avistamentos/novo',
  '/avistamentos/s_001',
  '/avistamentos/s_001/editar',
  '/permissao-localizacao',
  '/rota-inexistente',
  '/ui-kit',
]

for (const tamanho of [TAMANHOS[0], TAMANHOS[2]]) {
  for (const caminho of TODAS) {
    test(`axe ${tamanho.nome} ${caminho}`, async ({ page }) => {
      await page.setViewportSize(tamanho)
      await abrir(page, caminho)
      // Espera a animação de entrada terminar (opacidade parcial distorce o cálculo de contraste).
      await page.waitForTimeout(450)
      const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const resumo = resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
      expect(resumo, resumo.join('\n')).toEqual([])
    })
  }
}

test('área de toque: todo botão e link interativo tem pelo menos 44x44 px (mobile)', async ({ page }) => {
  await page.setViewportSize(TAMANHOS[0])
  for (const caminho of ['/dashboard', '/perfil', '/avistamentos', '/avistamentos/novo', '/avistamentos/s_001', '/ui-kit']) {
    await abrir(page, caminho)
    await page.waitForTimeout(450) // fim da animação de entrada
    const pequenos = await page.evaluate(() =>
      [...document.querySelectorAll('main button, main a[href], nav a[href], header a[href], header button')]
        .filter((el) => el.offsetParent !== null && !el.closest('.sr-only'))
        // Exceção do próprio WCAG: link DENTRO de uma frase (a atribuição obrigatória do mapa,
        // '© OpenStreetMap') não precisa da área mínima — é texto corrido, não um botão.
        .filter((el) => !el.closest('.leaflet-control-attribution'))
        // "Link esticado" (cartão inteiro clicável via ::after): o alvo real é o cartão.
        .map((el) => ({ el, r: (el.className.includes('after:inset-0') ? el.closest('article') ?? el : el).getBoundingClientRect() }))
        // Tolerância de meio pixel: arredondamento de subpixel do navegador (43,99… vira 44 na tela).
        .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
        .map(({ el, r }) => `${el.textContent.trim() || el.getAttribute('aria-label')} (${Math.round(r.width)}x${Math.round(r.height)})`),
    )
    expect(pequenos, `${caminho}: ${pequenos.join(', ')}`).toEqual([])
  }
})
