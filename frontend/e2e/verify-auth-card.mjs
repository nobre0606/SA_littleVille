// Verificação da Fase 4 (card de autenticação). Uso: node e2e/verify-auth-card.mjs [baseUrl]
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, renameSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'http://localhost:5199'
const OUT = fileURLToPath(new URL('./out/', import.meta.url))
mkdirSync(OUT, { recursive: true })

async function freshPage(browser, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${BASE}/?seed=7`)
  await page.getByTestId('intro-skip').click()
  await page.waitForTimeout(400)
  return { ctx, page, errors }
}

const browser = await chromium.launch()

// 1. capturas nos 4 tamanhos pedidos --------------------------------------------------------
console.log('## capturas')
for (const [label, viewport] of [
  ['390x844', { width: 390, height: 844 }],
  ['768x1024', { width: 768, height: 1024 }],
  ['1366x768', { width: 1366, height: 768 }],
  ['1920x1080', { width: 1920, height: 1080 }],
]) {
  const { ctx, page, errors } = await freshPage(browser, viewport, viewport.width <= 768 ? { deviceScaleFactor: 2 } : {})
  await page.screenshot({ path: `${OUT}auth-${label}-login.png` })
  await page.getByRole('tab', { name: 'Criar conta' }).click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}auth-${label}-register.png` })
  console.log(`${label}: erros=${errors.length ? errors.join('|') : 'nenhum'}`)
  await ctx.close()
}

// 2. fluxo completo só por teclado (cadastro, etapa 1 -> etapa 2 -> volta) ------------------
console.log('\n## navegação só por teclado')
{
  const { ctx, page } = await freshPage(browser, { width: 1366, height: 768 })
  // Tab até achar a aba "Criar conta" e ativar com Enter/Espaço
  await page.getByRole('tab', { name: 'Entrar' }).focus()
  await page.keyboard.press('ArrowRight') // padrão ARIA de tabs: setas trocam a aba focada
  const focusedAfterArrow = await page.evaluate(() => document.activeElement?.textContent)
  // Nem toda implementação de tabs usa seta; clicamos por acessibilidade via Enter se preciso
  if (!focusedAfterArrow?.includes('Criar conta')) {
    await page.getByRole('tab', { name: 'Criar conta' }).focus()
  }
  await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
  const onRegister = await page.getByTestId('register-step1').isVisible()
  console.log(`aba "Criar conta" ativada por teclado: ${onRegister}`)

  // Preenche a etapa 1 só com Tab + digitação
  await page.locator('#reg-nome').focus()
  await page.keyboard.type('Ana Maria Teste')
  await page.keyboard.press('Tab')
  await page.keyboard.type('ana.teste@example.com')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Abcdefg1')
  await page.keyboard.press('Tab') // botão mostrar/ocultar senha
  await page.keyboard.press('Tab')
  await page.keyboard.type('11144477735') // CPF válido, digitado sem máscara
  await page.keyboard.press('Tab')
  await page.keyboard.type('11912345678')
  await page.keyboard.press('Tab') // chega no botão "Continuar"
  const onContinueBtn = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
  console.log(`foco chegou no botão "Continuar" só via Tab: ${onContinueBtn === 'register-next'}`)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  const onStep2 = await page.getByTestId('register-step2').isVisible()
  console.log(`avançou pra etapa 2 (Enter no botão): ${onStep2}`)

  // Volta pra etapa 1 só de teclado (botão "Voltar")
  await page.locator('#reg-cep').focus()
  await page.keyboard.type('01001000')
  await page.keyboard.press('Tab') // aciona a busca do CEP (blur) e vai pro número
  await page.waitForTimeout(900) // dá tempo do ViaCEP (rede real) responder
  await page.getByTestId('register-back').focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
  const backToStep1 = await page.getByTestId('register-step1').isVisible()
  console.log(`voltou pra etapa 1 só de teclado: ${backToStep1}`)
  await ctx.close()
}

// 3. cenários do mock ------------------------------------------------------------------------
console.log('\n## cenários do mock')
{
  // sucesso no login (usuária semeada)
  const { ctx, page } = await freshPage(browser, { width: 1366, height: 768 })
  await page.locator('#login-email').fill('usada@example.com')
  await page.locator('#login-senha').fill('Abcdefg1')
  const clickPromise = page.getByTestId('login-submit').click()
  await page.waitForTimeout(100)
  const loadingText = await page.getByTestId('login-submit').textContent()
  console.log(`login: texto do botão durante o envio = "${loadingText.trim()}"`)
  await clickPromise
  await page.waitForURL('**/permissao-localizacao', { timeout: 3000 }).catch(() => {})
  console.log(`login sucesso: navegou pra /permissao-localizacao = ${page.url().includes('permissao-localizacao')}`)
  await ctx.close()
}
{
  // login inválido
  const { ctx, page } = await freshPage(browser, { width: 1366, height: 768 })
  await page.locator('#login-email').fill('naoexiste@example.com')
  await page.locator('#login-senha').fill('SenhaErrada1')
  await page.getByTestId('login-submit').click()
  await page.waitForSelector('[data-testid="login-error"]', { timeout: 3000 })
  const msg = await page.getByTestId('login-error').textContent()
  console.log(`login inválido: mensagem = "${msg}" (genérica, sem revelar se o e-mail existe)`)
  await ctx.close()
}
{
  // cadastro com e-mail/CPF já usados (usuária semeada)
  const { ctx, page } = await freshPage(browser, { width: 1366, height: 768 })
  await page.getByRole('tab', { name: 'Criar conta' }).click()
  await page.locator('#reg-nome').fill('Outra Pessoa')
  await page.locator('#reg-email').fill('usada@example.com')
  await page.locator('#reg-senha').fill('Abcdefg1')
  await page.locator('#reg-cpf').fill('11144477735')
  await page.locator('#reg-telefone').fill('11912345678')
  await page.getByTestId('register-next').click()
  await page.waitForTimeout(200)
  await page.locator('#reg-cep').fill('01001000')
  await page.locator('#reg-numero').fill('10')
  await page.waitForTimeout(900)
  await page.locator('#reg-rua').fill('Rua Teste')
  await page.locator('#reg-bairro').fill('Bairro Teste')
  await page.locator('#reg-lgpd').check()
  await page.getByTestId('register-submit').click()
  await page.waitForTimeout(1400)
  const emailErr = await page.locator('#reg-email-error').textContent().catch(() => null)
  const cpfErr = await page.locator('#reg-cpf-error').textContent().catch(() => null)
  const backOnStep1 = await page.getByTestId('register-step1').isVisible()
  console.log(`cadastro duplicado: email="${emailErr}" cpf="${cpfErr}" voltou pra etapa 1=${backOnStep1}`)
  await ctx.close()
}
{
  // cadastro com sucesso (dados novos)
  const { ctx, page } = await freshPage(browser, { width: 1366, height: 768 })
  await page.getByRole('tab', { name: 'Criar conta' }).click()
  await page.locator('#reg-nome').fill('Pessoa Nova')
  await page.locator('#reg-email').fill(`nova${Date.now()}@example.com`)
  await page.locator('#reg-senha').fill('Abcdefg1')
  await page.locator('#reg-cpf').fill('52998224725')
  await page.locator('#reg-telefone').fill('11987654321')
  await page.getByTestId('register-next').click()
  await page.waitForTimeout(200)
  await page.locator('#reg-cep').fill('01001000')
  await page.locator('#reg-numero').fill('99')
  await page.waitForTimeout(900)
  await page.locator('#reg-rua').fill('Rua Nova')
  await page.locator('#reg-bairro').fill('Bairro Novo')
  await page.locator('#reg-lgpd').check()
  await page.getByTestId('register-submit').click()
  await page.waitForURL('**/permissao-localizacao', { timeout: 3000 }).catch(() => {})
  console.log(`cadastro sucesso: navegou pra /permissao-localizacao = ${page.url().includes('permissao-localizacao')}`)
  await ctx.close()
}

// 4. vídeo curto do cadastro em 2 etapas ------------------------------------------------------
console.log('\n## vídeo do cadastro (2 etapas)')
{
  const dir = join(OUT, 'video-register-tmp')
  mkdirSync(dir, { recursive: true })
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir, size: { width: 1366, height: 768 } } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/?seed=7`)
  await page.getByTestId('intro-skip').click()
  await page.waitForTimeout(500)
  await page.getByRole('tab', { name: 'Criar conta' }).click()
  await page.waitForTimeout(400)
  await page.locator('#reg-nome').click()
  await page.keyboard.type('Ana Maria Teste', { delay: 40 })
  await page.locator('#reg-email').click()
  await page.keyboard.type('ana.video@example.com', { delay: 40 })
  await page.locator('#reg-senha').click()
  await page.keyboard.type('Abcdefg1', { delay: 40 })
  await page.locator('#reg-cpf').click()
  await page.keyboard.type('11144477735', { delay: 40 })
  await page.locator('#reg-telefone').click()
  await page.keyboard.type('11912345678', { delay: 40 })
  await page.waitForTimeout(300)
  await page.getByTestId('register-next').click()
  await page.waitForTimeout(500)
  await page.locator('#reg-cep').click()
  await page.keyboard.type('01001000', { delay: 40 })
  await page.locator('#reg-numero').click() // dispara o blur do CEP -> ViaCEP
  await page.waitForTimeout(1000)
  await page.keyboard.type('123', { delay: 40 })
  await page.locator('#reg-lgpd').check()
  await page.waitForTimeout(300)
  await page.getByTestId('register-submit').click()
  await page.waitForTimeout(1500)
  await ctx.close()
  const raw = readdirSync(dir).find((f) => f.endsWith('.webm'))
  const rawPath = join(dir, raw)
  const final = join(OUT, 'cadastro-2-etapas.webm')
  const home = process.env.LOCALAPPDATA + '\\ms-playwright'
  const ff = readdirSync(home).find((d) => d.startsWith('ffmpeg-'))
  try {
    execFileSync(join(home, ff, 'ffmpeg-win64.exe'), ['-y', '-i', rawPath, '-c:v', 'libvpx', '-b:v', '6M', '-crf', '8', '-an', final], { stdio: 'ignore' })
    console.log('vídeo:', final)
  } catch {
    renameSync(rawPath, final)
    console.log('vídeo (bruto):', final)
  }
}

await browser.close()
