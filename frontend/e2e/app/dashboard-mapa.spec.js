import { expect } from '@playwright/test'
import { abrir, test } from './apoio.js'

/** Fases 2 e 3 — caminho feliz de cada tela (DoD reduzida: sem e2e de estados de erro). */

test('dashboard: 4 indicadores do servidor, 3 gráficos com tabela e os 5 mais recentes', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await abrir(page, '/dashboard')
  const indicadores = page.getByRole('region', { name: 'Indicadores' })
  for (const rotulo of ['Total de avistamentos', 'Últimos 7 dias', 'Ativos agora', 'Minha contribuição']) {
    await expect(indicadores.getByRole('heading', { name: rotulo })).toBeVisible()
  }
  // Semente do mock: 32 avistamentos, 5 com menos de 2 h (os números vêm do servidor).
  await expect(indicadores.getByText('32', { exact: true }).first()).toBeVisible()

  for (const titulo of ['Avistamentos por dia', 'Por período do dia', 'Por bairro']) {
    await expect(page.getByRole('heading', { level: 2, name: titulo })).toBeVisible()
  }
  // Tabela equivalente (acessibilidade do gráfico) abre e mostra os 4 períodos.
  const periodo = page.getByRole('region', { name: 'Por período do dia' })
  await periodo.getByText('Ver dados em tabela').click()
  await expect(periodo.getByRole('row')).toHaveCount(5) // cabeçalho + 4 períodos

  const recentes = page.getByRole('region', { name: 'Mais recentes' })
  await expect(recentes.getByRole('article')).toHaveCount(5)
  await recentes.getByRole('link', { name: 'Ver todos' }).click()
  await expect(page).toHaveURL(/\/avistamentos$/)
})

test('dashboard reage ao CRUD: registrar um avistamento sobe o total', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: -27.6, longitude: -48.47 })
  await abrir(page, '/avistamentos/novo')
  await page.getByRole('button', { name: 'Usar minha localização' }).click()
  await page.getByLabel('Bairro').selectOption('Campeche')
  await page.getByRole('button', { name: 'Enviar avistamento' }).click()
  await expect(page.getByText('Avistamento em Campeche registrado.')).toBeVisible()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Dashboard' }).first().click()
  await expect(page.getByRole('region', { name: 'Indicadores' }).getByText('33', { exact: true }).first()).toBeVisible()
})

test('mapa: pegadas, áreas, emergência com painel e botão de ligar; lista por distância', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: -27.6012, longitude: -48.4731 })
  await page.setViewportSize({ width: 1366, height: 768 })
  await abrir(page, '/mapa')

  const mapa = page.getByRole('region', { name: /Mapa da vila/ })
  await expect(mapa.locator('.leaflet-marker-icon').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Área de 1 km de cada avistamento' })).toBeVisible()

  // RF02: marcador de emergência (focável, com nome) abre o painel com tel:.
  await mapa.locator('.lv-pino-emergencia[title^="Hospital"]').first().click()
  const painel = page.getByRole('dialog')
  await expect(painel.getByRole('link', { name: /Ligar para SAMU/ })).toHaveAttribute('href', 'tel:192')
  await page.keyboard.press('Escape')

  // Visão em lista: mesmos avistamentos, do mais perto ao mais longe, com links.
  await page.getByRole('radio', { name: 'Lista' }).click()
  await expect(page).toHaveURL(/visao=lista/)
  await expect(page.getByText('Do mais perto para o mais longe de você.')).toBeVisible()
  const itens = page.getByRole('region', { name: 'Avistamentos das últimas 24 horas' }).getByRole('link')
  await expect(itens.first()).toBeVisible()
  await expect(itens.first()).toContainText(/\d+(,\d)? (m|km)/)
})

test('emergência: locais agrupados por tipo, cada um com botão de ligar', async ({ page }) => {
  await abrir(page, '/emergencia')
  for (const tipo of ['Hospital', 'Bombeiros', 'Polícia', 'Defesa Civil', 'Abrigo']) {
    await expect(page.getByRole('heading', { level: 2, name: tipo })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: 'Emergência imediata: Bombeiros 193' })).toHaveAttribute('href', 'tel:193')
  await expect(page.getByRole('link', { name: /^Ligar para/ })).toHaveCount(10)
})
