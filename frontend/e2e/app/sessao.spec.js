import { expect, test } from '@playwright/test'
import { abrir, entrarPeloCard } from './apoio.js'

/**
 * Rotas protegidas e sessão. O servidor simulado começa DESLOGADO (sem `?mock=logged-in`),
 * como um navegador sem cookie.
 */

test('rota protegida sem sessão → login com rota de retorno; depois do login, volta para ela', async ({ page }) => {
  await page.goto('/avistamentos')
  // Sem "expirou": a pessoa nunca tinha entrado.
  await expect(page).toHaveURL(/\/login\?voltar=%2Favistamentos$/)
  await expect(page.locator('html')).not.toHaveAttribute('data-area', 'app')

  await entrarPeloCard(page)
  await expect(page).toHaveURL(/\/permissao-localizacao$/)
  await expect(page.getByText('Depois disso, você volta para onde estava.')).toBeVisible()
  await page.getByRole('button', { name: 'Agora não, vou marcar no mapa' }).click()
  await expect(page).toHaveURL(/\/avistamentos$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Avistamentos' })).toBeVisible()
})

test('sem rota de retorno, o login leva ao dashboard', async ({ page }) => {
  await page.goto('/?seed=7')
  await entrarPeloCard(page)
  await expect(page.getByText('Depois disso, você volta para onde estava.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Agora não, vou marcar no mapa' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('sessão expira em silêncio durante a atualização em segundo plano → login com retorno', async ({ page }) => {
  // Relógio controlado: dá para "passar" 6 minutos sem esperar de verdade.
  await page.clock.install()
  await abrir(page, '/perfil')

  // A sessão cai NO SERVIDOR, sem o app ser avisado (como um cookie que vence).
  await page.evaluate(() => window.__lvMock.cenarios.alterar({ sessao: 'encerrada' }))
  await page.waitForTimeout(300)
  await expect(page).toHaveURL(/\/perfil/) // nada acontece até a próxima chamada

  // O tempo passa (dados ficam "velhos") e a pessoa volta à aba: o TanStack Query revalida em
  // segundo plano — a próxima chamada recebe 401 e o client leva ao login.
  await page.clock.fastForward('06:00')
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))

  await expect(page).toHaveURL(/\/login\?expirou=1&voltar=%2Fperfil%3Fmock%3Dlogged-in/, { timeout: 10_000 })

  // Entra de novo e volta exatamente para onde estava.
  await entrarPeloCard(page)
  await page.getByRole('button', { name: 'Agora não, vou marcar no mapa' }).click()
  await expect(page).toHaveURL(/\/perfil\?mock=logged-in/)
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
})

test('abrir /permissao-localizacao direto (sem passar pelo login) não loga', async ({ page }) => {
  await page.goto('/permissao-localizacao')
  await expect(page).toHaveURL(/\/login/)
})
