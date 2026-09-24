import { expect, test } from '@playwright/test'
import { abrir, logado } from './apoio.js'

/**
 * Estados de borda (definição de pronto, item 7), acionados pelo painel de debug do mock
 * (?debug=1) e pelos parâmetros de primeira chamada (?frio=1, ?desvio=).
 */

async function painel(page) {
  await page.getByRole('button', { name: 'Debug' }).click()
  return page.getByRole('complementary', { name: 'Painel de debug do mock' })
}

test('carregando: servidor frio mostra "Acordando o servidor..." e depois o app', async ({ page }) => {
  await page.goto(logado('/dashboard?frio=1'))
  // A tela aparece 3 s depois da PRIMEIRA requisição — e, com vários testes em paralelo, o
  // servidor de desenvolvimento pode levar alguns segundos só para entregar os módulos. Os
  // prazos contam a partir do goto, por isso folgados.
  await expect(page.getByRole('heading', { name: 'Acordando o servidor...' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'Acordando o servidor...' })).toHaveCount(0)
})

test('erro: 500 forçado vira estado de erro com "Tentar de novo", que recupera', async ({ page }) => {
  await abrir(page, '/perfil?debug=1')
  const p = await painel(page)
  await p.getByLabel('Erro forçado').selectOption('INTERNAL_ERROR')
  await expect(page.getByRole('heading', { name: 'Algo deu errado' })).toBeVisible({ timeout: 10_000 })
  await p.getByLabel('Erro forçado').selectOption('')
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible({ timeout: 10_000 })
})

test('sem permissão: 403 forçado mostra "Sem permissão" com caminho de volta', async ({ page }) => {
  await abrir(page, '/perfil?debug=1')
  const p = await painel(page)
  await p.getByLabel('Erro forçado').selectOption('FORBIDDEN')
  await expect(page.getByRole('heading', { name: 'Sem permissão' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('link', { name: 'Voltar' })).toBeVisible()
})

test('offline: aviso aparece sem travar a tela e some quando a rede volta', async ({ page, context }) => {
  await abrir(page, '/dashboard')
  await context.setOffline(true)
  await expect(page.getByText('Você está offline.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText('Você está offline.')).toHaveCount(0)
})

test('sessão expirada durante o uso: próxima chamada leva ao login', async ({ page }) => {
  await abrir(page, '/perfil?debug=1')
  const p = await painel(page)
  await p.getByRole('button', { name: 'Expirar sessão' }).click()
  await expect(page).toHaveURL(/\/login\?expirou=1&voltar=%2Fperfil/, { timeout: 10_000 })
})

test('relógio desajustado: aviso discreto, dispensável, e o app segue funcionando', async ({ page }) => {
  await abrir(page, '/dashboard?desvio=120')
  const aviso = page.getByText('O relógio do seu dispositivo está desajustado.')
  await expect(aviso).toBeVisible()
  await page.getByRole('button', { name: 'Dispensar aviso do relógio' }).click()
  await expect(aviso).toHaveCount(0)
})

test('sem desvio relevante, nenhum aviso de relógio', async ({ page }) => {
  await abrir(page, '/dashboard')
  await page.waitForTimeout(500)
  await expect(page.getByText('O relógio do seu dispositivo está desajustado.')).toHaveCount(0)
})
