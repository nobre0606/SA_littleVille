import { test as base } from '@playwright/test'

// PNG 1x1 transparente: responde no lugar dos tiles do mapa.
const TILE_VAZIO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

/**
 * `test` com os tiles do mapa servidos localmente: os testes não dependem da internet nem
 * geram tráfego no servidor do OpenStreetMap (a política de uso dele pede isso).
 */
export const test = base.extend({
  page: async ({ page }, usar) => {
    await page.route(/tile\.openstreetmap\.org|basemaps\.cartocdn\.com/, (rota) =>
      rota.fulfill({ status: 200, contentType: 'image/png', body: TILE_VAZIO }),
    )
    await usar(page)
  },
})

/** Rotas autenticadas do app e o título (h1) esperado em cada uma. */
export const ROTAS = [
  { caminho: '/dashboard', titulo: 'Dashboard' },
  { caminho: '/avistamentos', titulo: 'Avistamentos' },
  { caminho: '/mapa', titulo: 'Mapa' },
  // Com equipe, o h1 é o nome dela; o título da aba continua "Equipe".
  { caminho: '/equipe', titulo: 'Equipe', h1: 'Patrulha da Lagoa' },
  { caminho: '/emergencia', titulo: 'Emergência' },
  { caminho: '/perfil', titulo: 'Perfil' },
]

export const TAMANHOS = [
  { nome: '390x844', width: 390, height: 844 },
  { nome: '768x1024', width: 768, height: 1024 },
  { nome: '1366x768', width: 1366, height: 768 },
  { nome: '1920x1080', width: 1920, height: 1080 },
]

/**
 * Acrescenta `mock=logged-in` à URL: o servidor simulado começa DESLOGADO (como um navegador
 * sem cookie), então os testes que não são sobre login entram já com sessão.
 */
export const logado = (caminho) => `${caminho}${caminho.includes('?') ? '&' : '?'}mock=logged-in`

/** Abre uma tela do app JÁ LOGADO e espera ficar pronta (sessão conferida e h1 visível). */
export async function abrir(page, caminho) {
  await page.goto(logado(caminho))
  await page.locator('h1').first().waitFor()
}

/** Login pelo card CONGELADO da intro (o mesmo caminho de uma pessoa de verdade). */
export async function entrarPeloCard(page) {
  await page.getByTestId('intro-skip').click()
  await page.getByLabel('E-mail').fill('usada@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('Abcdefg1')
  await page.getByTestId('login-submit').click()
}
