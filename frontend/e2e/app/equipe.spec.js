import { expect } from '@playwright/test'
import { abrir, test } from './apoio.js'

/**
 * Fase 4 — caminho feliz: criar equipe → entrar por código → enviar e receber mensagem.
 * A usuária demo começa na "Patrulha da Lagoa" (uma equipe por vez: precisa sair antes).
 */
test('criar equipe, entrar por código, enviar e receber mensagem em menos de 5 s (RNF02)', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1366, height: 768 })
  await abrir(page, '/equipe')

  const sair = async (nome) => {
    await page.getByRole('button', { name: 'Sair da equipe' }).click()
    await page.getByRole('dialog', { name: `Sair da equipe “${nome}”?` }).getByRole('button', { name: 'Sair da equipe' }).click()
    await expect(page.getByRole('heading', { name: 'Você ainda não tem equipe' })).toBeVisible()
  }

  // 1. Sair da equipe atual (uma por vez) e CRIAR uma nova.
  await sair('Patrulha da Lagoa')
  await page.getByRole('button', { name: 'Criar equipe' }).click()
  await page.getByLabel('Nome da equipe').fill('Patrulha E2E')
  await page.getByRole('dialog').getByRole('button', { name: 'Criar equipe' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Patrulha E2E' })).toBeVisible()
  await expect(page.getByText('Código de convite')).toBeVisible()
  await expect(page.getByText('(você)')).toBeVisible()

  // 2. ENTRAR POR CÓDIGO em outra equipe (digitado em minúsculas e com hífen: é normalizado).
  await sair('Patrulha E2E')
  await page.getByRole('button', { name: 'Entrar com código' }).click()
  await page.getByLabel('Código de convite').fill('n4r-t3x')
  await page.getByRole('dialog').getByRole('button', { name: 'Entrar na equipe' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Vigias do Norte' })).toBeVisible()
  await expect(page.getByText('Diego Martins')).toBeVisible()

  // 3. ENVIAR: aparece na hora (otimista) e fica confirmada.
  const chat = page.getByRole('log', { name: 'Mensagens' })
  await page.getByLabel('Mensagem para a equipe').fill('Olá, Vigias! Mensagem do teste.')
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(chat.getByText('Olá, Vigias! Mensagem do teste.')).toBeVisible()
  await expect(chat.getByText('Enviando…')).toHaveCount(0)

  // 4. RECEBER: outro membro escreve (direto no servidor simulado) e a mensagem chega pelo
  //    polling em menos de 5 s — o RNF02.
  const enviadaEm = Date.now()
  await page.evaluate(() => {
    const { banco } = window.__lvMock
    banco.enviarMensagem('t_norte', { texto: '<b>Recebido!</b> Estou na praia.' }, banco.usuario('u_diego'))
  })
  await expect(chat.getByText('<b>Recebido!</b> Estou na praia.')).toBeVisible({ timeout: 5000 })
  expect(Date.now() - enviadaEm).toBeLessThan(5000)
  // Texto puro: as tags aparecem escritas, nada vira HTML.
  await expect(chat.locator('b')).toHaveCount(0)
})
