/** Rotas autenticadas do app e o título (h1) esperado em cada uma. */
export const ROTAS = [
  { caminho: '/dashboard', titulo: 'Dashboard' },
  { caminho: '/avistamentos', titulo: 'Avistamentos' },
  { caminho: '/mapa', titulo: 'Mapa' },
  { caminho: '/equipe', titulo: 'Equipe' },
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
