import { expect } from '@playwright/test'
import { abrir, logado, test } from './apoio.js'

/**
 * Fase 1 — CRUD de avistamentos (RF07), pelo caminho real: telas → api/client → mock (MSW).
 * A usuária demo é autora de s_001 (o mais recente) e de outros; os demais são de outras pessoas.
 */

const GPS = { geolocation: { latitude: -27.6012, longitude: -48.4731 }, permissions: ['geolocation'] }

test.describe('com GPS liberado', () => {
  test.use(GPS)

  test('as 4 operações (criar, ver, editar, excluir + desfazer) em menos de 1 minuto', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    const inicio = Date.now()
    await abrir(page, '/avistamentos')

    // CRIAR — local pelo GPS, bairro, descrição; hora automática (só leitura).
    await page.getByRole('link', { name: 'Registrar avistamento' }).click()
    await expect(page.getByLabel('Hora do avistamento')).toHaveAttribute('readonly', '')
    await page.getByRole('button', { name: 'Usar minha localização' }).click()
    await expect(page.getByText(/Local marcado: .* pela sua localização/)).toBeVisible()
    await page.getByLabel('Bairro').selectOption('Lagoa da Conceição')
    await page.getByLabel('Descrição').fill('Pegadas gigantes no teste e2e.')
    await expect(page.getByText(/^30\/500/)).toBeVisible()
    await page.getByRole('button', { name: 'Enviar avistamento' }).click()

    await expect(page).toHaveURL(/\/avistamentos$/)
    await expect(page.getByText('Avistamento em Lagoa da Conceição registrado.')).toBeVisible()
    const linha = page.getByRole('row').filter({ hasText: 'Pegadas gigantes no teste e2e.' })
    await expect(linha).toBeVisible()

    // VER — dados completos, autor, tempo relativo e mini-mapa.
    await linha.getByRole('link', { name: 'Lagoa da Conceição', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Lagoa da Conceição' })).toBeVisible()
    await expect(page.getByText('Pegadas gigantes no teste e2e.')).toBeVisible()
    await expect(page.getByText('Pela localização do aparelho', { exact: false })).toBeVisible()
    await expect(page.getByRole('region', { name: /Mapa do local do avistamento/ })).toBeVisible()

    // EDITAR — mesmo formulário, pré-preenchido.
    await page.getByRole('link', { name: 'Editar' }).click()
    await expect(page.getByLabel('Descrição')).toHaveValue('Pegadas gigantes no teste e2e.')
    await expect(page.getByLabel('Bairro')).toHaveValue('Lagoa da Conceição')
    await page.getByLabel('Descrição').fill('Pegadas gigantes, agora editadas.')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Pegadas gigantes, agora editadas.')).toBeVisible()
    await expect(page.getByText('Alterações salvas.')).toBeVisible()

    // EXCLUIR — confirmação nomeando o item, toast com "Desfazer".
    await page.getByRole('button', { name: 'Excluir' }).click()
    const dialogo = page.getByRole('dialog', { name: /Excluir o avistamento “Lagoa da Conceição, agora mesmo”\?/ })
    await expect(dialogo).toBeVisible()
    await dialogo.getByRole('button', { name: 'Excluir' }).click()
    await expect(page).toHaveURL(/\/avistamentos$/)
    await expect(page.getByText(/Avistamento “Lagoa da Conceição, agora mesmo” excluído/)).toBeVisible()
    await expect(page.getByText('Pegadas gigantes, agora editadas.')).toHaveCount(0)

    await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await expect(page.getByText(/Exclusão desfeita/)).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Pegadas gigantes, agora editadas.' })).toBeVisible()

    expect(Date.now() - inicio).toBeLessThan(60_000)
  })

  test('sem local, o envio é bloqueado com o motivo visível; marcar no mapa libera', async ({ page }) => {
    await abrir(page, '/avistamentos/novo')
    const enviar = page.getByRole('button', { name: 'Enviar avistamento' })
    await expect(enviar).toHaveAttribute('aria-disabled', 'true')
    // aria-disabled (não disabled): o botão continua acionável por quem usa teclado, e acionar
    // leva o foco até a lista do que falta. O Playwright não clica em aria-disabled, então
    // acionamos como no teclado: foco + Enter.
    await enviar.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/avistamentos\/novo/)
    const motivos = page.locator('#motivos-bloqueio')
    await expect(motivos).toBeFocused()
    await expect(motivos).toContainText('Marque o local')
    await expect(motivos).toContainText('Escolha o bairro')

    await page.getByLabel('Bairro').selectOption('Campeche')
    await expect(motivos).not.toContainText('Escolha o bairro')

    // Toque/clique no mapa marca o local.
    await page.getByRole('region', { name: /Mapa para marcar o local/ }).click({ position: { x: 120, y: 120 } })
    await expect(page.getByText(/Local marcado: .* no mapa/)).toBeVisible()
    await expect(motivos).toHaveCount(0)
    await expect(enviar).not.toHaveAttribute('aria-disabled', 'true')
  })
})

test('teclado: "Marcar o centro do mapa" marca o local sem mouse', async ({ page }) => {
  await abrir(page, '/avistamentos/novo')
  await page.getByRole('button', { name: 'Marcar o centro do mapa' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Local marcado: .* no mapa/)).toBeVisible()
})

test('GPS negado: explica e oferece marcar no mapa; o app não trava', async ({ page, context }) => {
  await context.clearPermissions()
  await abrir(page, '/avistamentos/novo')
  // Nega explicitamente o acesso à localização para esta página.
  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition = (_ok, erro) => erro({ code: 1, PERMISSION_DENIED: 1, message: 'negado' })
  })
  await page.getByRole('button', { name: 'Usar minha localização' }).click()
  await expect(page.getByText('Você não permitiu o acesso à localização. Sem problema: toque no mapa para marcar o local.')).toBeVisible()
  await page.getByRole('button', { name: 'Marcar o centro do mapa' }).click()
  await expect(page.getByText(/Local marcado/)).toBeVisible()
})

test('alterações não salvas: pergunta antes de sair e respeita a escolha', async ({ page }) => {
  await abrir(page, '/avistamentos/s_001/editar')
  await page.getByLabel('Descrição').fill('Mudança que não foi salva')
  await page.getByRole('link', { name: 'Voltar ao avistamento' }).click()

  const dialogo = page.getByRole('dialog', { name: 'Descartar as alterações?' })
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Continuar editando' })).toBeFocused()
  await dialogo.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(page).toHaveURL(/\/editar/)
  await expect(page.getByLabel('Descrição')).toHaveValue('Mudança que não foi salva')

  await page.getByRole('link', { name: 'Voltar ao avistamento' }).click()
  await page.getByRole('dialog', { name: 'Descartar as alterações?' }).getByRole('button', { name: 'Descartar' }).click()
  await expect(page).toHaveURL(/\/avistamentos\/s_001$/)
  await expect(page.getByText('Mudança que não foi salva')).toHaveCount(0)
})

test('permissões: sem ações no item de outra pessoa; editar pela URL mostra "Sem permissão"', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await abrir(page, '/avistamentos')
  const deOutro = page.getByRole('row').filter({ hasNotText: 'Usuária de Teste' }).filter({ has: page.getByRole('link') }).first()
  await expect(deOutro.getByRole('button', { name: /Excluir/ })).toHaveCount(0)
  await expect(deOutro.getByRole('link', { name: /Editar/ })).toHaveCount(0)
  const meu = page.getByRole('row').filter({ hasText: 'Usuária de Teste' }).first()
  await expect(meu.getByRole('link', { name: /Editar/ })).toBeVisible()

  const href = await deOutro.getByRole('link').first().getAttribute('href')
  await page.goto(logado(`${href}/editar`))
  await expect(page.getByRole('heading', { name: 'Sem permissão' })).toBeVisible()
})

test('Admin: exclui o avistamento de outra pessoa, mas não edita', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await abrir(page, '/avistamentos')
  await page.evaluate(() => {
    window.__lvMock.banco.definirPapel('u_teste', 'admin')
    window.dispatchEvent(new Event('lv:dados-externos'))
  })
  const deOutro = page.getByRole('row').filter({ hasNotText: 'Usuária de Teste' }).filter({ has: page.getByRole('link') }).first()
  await expect(deOutro.getByRole('button', { name: /Excluir/ })).toBeVisible()
  await expect(deOutro.getByRole('link', { name: /Editar/ })).toHaveCount(0)
  const bairro = await deOutro.getByRole('link').first().textContent()
  await deOutro.getByRole('button', { name: /Excluir/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByText(new RegExp(`Avistamento “${bairro}, .*” excluído`))).toBeVisible()
})

test('ação otimista revertida: se o servidor falha, o item volta e o erro é avisado', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await abrir(page, '/avistamentos')
  const linha = page.getByRole('row').filter({ hasText: 'Usuária de Teste' }).first()
  // Identifica a linha pelo link (id único) — descrições podem se repetir nos dados simulados.
  const href = await linha.getByRole('link').first().getAttribute('href')
  const mesmaLinha = () => page.getByRole('row').filter({ has: page.locator(`a[href="${href}"]`) })
  await page.evaluate(() => window.__lvMock.cenarios.alterar({ erro: 'INTERNAL_ERROR', latencia: 'lenta' }))

  await linha.getByRole('button', { name: /Excluir/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()
  // Some NA HORA (otimista), antes da resposta do servidor...
  await expect(mesmaLinha()).toHaveCount(0)
  // ...e volta quando o servidor recusa.
  await expect(page.getByText(/Não foi possível excluir/)).toBeVisible({ timeout: 10_000 })
  await expect(mesmaLinha()).toBeVisible()
})

test('filtros na URL: busca, período, autor, ordenação e paginação', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await abrir(page, '/avistamentos')
  await expect(page.getByText('32 avistamentos')).toBeVisible()

  // A lista antiga continua na tela (esmaecida) até a nova chegar: por isso o expect.poll
  // espera o conteúdo das linhas ficar certo, em vez de conferir no instante do clique.
  const colunas = (n) => page.locator(`tbody tr td:nth-child(${n})`).allTextContents()

  await page.getByLabel('Buscar').fill('conceicao')
  await expect(page).toHaveURL(/q=conceicao/)
  await expect(page.getByText(/avistamentos? com os filtros escolhidos/)).toBeVisible()
  await expect.poll(async () => (await colunas(1)).every((b) => b === 'Lagoa da Conceição')).toBe(true)
  await page.getByLabel('Buscar').fill('')
  await expect(page.getByText('32 avistamentos', { exact: true })).toBeVisible()

  await page.getByRole('group', { name: 'Autor' }).getByRole('button', { name: 'Meus' }).click()
  await expect(page).toHaveURL(/autor=me/)
  await expect.poll(async () => (await colunas(3)).every((a) => a.includes('Usuária de Teste'))).toBe(true)
  await page.getByRole('group', { name: 'Autor' }).getByRole('button', { name: 'Todos' }).click()

  await page.getByRole('group', { name: 'Período' }).getByRole('button', { name: 'Hoje' }).click()
  await expect(page).toHaveURL(/periodo=hoje/)
  await page.getByRole('group', { name: 'Período' }).getByRole('button', { name: 'Tudo' }).click()

  await page.getByRole('button', { name: /^Bairro/ }).click()
  await expect(page).toHaveURL(/sort=bairro/)
  await expect
    .poll(async () => {
      const bairros = await colunas(1)
      return bairros.join('|') === [...bairros].sort((a, b) => a.localeCompare(b, 'pt-BR')).join('|')
    })
    .toBe(true)

  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
})

test('filtro sem resultado: estado vazio com "Limpar filtros"', async ({ page }) => {
  await abrir(page, '/avistamentos?q=nada-vai-achar-isto')
  await expect(page.getByRole('heading', { name: 'Nenhum avistamento encontrado' })).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page.getByText('32 avistamentos')).toBeVisible()
})

test('lista vazia de verdade: estado vazio convida a registrar o primeiro', async ({ page }) => {
  await abrir(page, '/avistamentos')
  await page.evaluate(() => {
    window.__lvMock.cenarios.alterar({ vazio: true })
    window.dispatchEvent(new Event('lv:dados-externos'))
  })
  await expect(page.getByRole('heading', { name: 'Nenhum avistamento ainda' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Registrar o primeiro' })).toBeVisible()
})

test('mobile: cartões no lugar da tabela, ordenação por select, sem rolagem lateral', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await abrir(page, '/avistamentos')
  await expect(page.getByRole('table')).toBeHidden()
  await expect(page.getByRole('list', { name: 'Avistamentos' }).getByRole('article')).toHaveCount(10)
  await page.getByLabel('Ordenar por').selectOption('bairro')
  await expect(page).toHaveURL(/sort=bairro/)
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(extra).toBeLessThanOrEqual(0)
})

test('avistamento inexistente ou excluído: "Não encontrado" com volta', async ({ page }) => {
  await abrir(page, '/avistamentos/s_900')
  await expect(page.getByRole('heading', { name: 'Não encontrado' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar' }).last()).toHaveAttribute('href', '/avistamentos')
})
