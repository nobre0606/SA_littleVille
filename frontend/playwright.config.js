import { defineConfig, devices } from '@playwright/test'

/**
 * Testes e2e do app (e2e/app/). Sobe o Vite em modo mock numa porta própria e roda no
 * Chromium. Os scripts antigos de e2e/*.mjs (verificação da cena) continuam separados.
 */
const PORTA = 5210

export default defineConfig({
  testDir: './e2e/app',
  outputDir: './test-results',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    env: { VITE_USE_MOCK: 'true' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
