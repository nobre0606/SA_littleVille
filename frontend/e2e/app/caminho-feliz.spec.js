import { expect, test } from '@playwright/test'
import { ROTAS, abrir, entrarPeloCard, logado } from './apoio.js'

test('login pela intro → permissão de localização → dashboard, com a ponte visual', async ({ page }) => {
  await page.goto('/?seed=7')
  await entrarPeloCard(page)

  await expect(page).toHaveURL(/\/permissao-localizacao$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Compartilhar sua localização?' })).toBeVisible()
  // O mundo claro do app está ligado (tokens do app ativos).
  await expect(page.locator('html')).toHaveAttribute('data-area', 'app')

  await page.getByRole('button', { name: 'Agora não, vou marcar no mapa' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Usuária de Teste').first()).toBeVisible()
  await expect(page).toHaveTitle('Dashboard · Little Ville')
})

test('navegação: todos os itens abrem a tela certa, com rota ativa marcada', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await abrir(page, '/dashboard')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  for (const { caminho, titulo } of ROTAS) {
    await nav.getByRole('link', { name: titulo }).click()
    await expect(page).toHaveURL(new RegExp(`${caminho}$`))
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
    await expect(nav.getByRole('link', { name: titulo })).toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveTitle(`${titulo} · Little Ville`)
  }
})

test('mobile: barra inferior com 5 itens e perfil pelo avatar do topo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await abrir(page, '/dashboard')
  const inferior = page.getByRole('navigation', { name: 'Principal' })
  await expect(inferior.getByRole('link')).toHaveCount(5)
  await page.getByRole('link', { name: /Perfil de/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
  // Nenhuma rolagem lateral.
  const larguraExtra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(larguraExtra).toBeLessThanOrEqual(0)
})

test('sair: confirmação, volta para o login e o app deixa de ser o mundo claro', async ({ page }) => {
  await abrir(page, '/perfil')
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Sair do Little Ville?' })
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Sair' })).toBeFocused()
  await dialogo.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('html')).not.toHaveAttribute('data-area', 'app')
})

test('404 com o mascote e caminho de volta', async ({ page }) => {
  await page.goto(logado('/nao-existe'))
  await expect(page.getByRole('heading', { level: 1, name: 'Pegadas perdidas' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('UI kit: modal fecha com Esc e devolve o foco; toast de desfazer', async ({ page }) => {
  await abrir(page, '/ui-kit')
  const abrirModal = page.getByRole('button', { name: 'Abrir modal' })
  await abrirModal.click()
  await expect(page.getByRole('dialog', { name: 'Título do modal' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(abrirModal).toBeFocused()

  await page.getByRole('button', { name: 'Toast com desfazer' }).click()
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(page.getByText('Exclusão desfeita.')).toBeVisible()
})

test('ConfirmDialog destrutivo começa com o foco em Cancelar', async ({ page }) => {
  await abrir(page, '/ui-kit')
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Excluir o avistamento na Joaquina?' })
  await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused()
})
