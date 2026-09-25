import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Além das regras de qualidade, este arquivo GARANTE POR FERRAMENTA as fronteiras de
 * arquitetura do projeto (docs/DECISOES.md) — quebrar uma delas reprova o `npm run lint`:
 *
 *  1. Nada fora de src/mocks/ importa de src/mocks/ (o servidor simulado nunca vaza para o app).
 *  2. `fetch` só existe em src/api/client.js (o único ponto de rede do app).
 *  3. `dangerouslySetInnerHTML` é proibido em todo lugar (texto de usuário é sempre texto).
 */
export default defineConfig([
  globalIgnores(['dist', 'dist-mock', '.vercel', 'test-results', 'playwright-report', 'public/mockServiceWorker.js', 'e2e/out']),
  {
    // .mjs: só os scripts novos (os de fases anteriores — diagnóstico da cena — ficam como estão).
    files: ['**/*.{js,jsx}', 'scripts/extract-mascot.mjs', 'scripts/check-design.mjs', 'scripts/brand-assets.mjs', 'scripts/vercel-config.mjs', 'scripts/vercel-build.mjs'],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // `_nome` marca de propósito uma variável descartada (ex.: tirar um campo com destructuring).
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Proibido: texto vindo de usuário é sempre renderizado como texto (RNF04).',
        },
      ],
    },
  },
  // Fronteira 1: o app não conhece o mock.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/mocks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/mocks', '**/mocks/**'],
              message: 'src/mocks/ simula o servidor e só existe em modo mock: o app fala apenas com src/api/.',
            },
          ],
        },
      ],
    },
  },
  // Fronteira 2: rede só pelo client. Exceções: o próprio client, o mock (é o "servidor") e o
  // login/cadastro congelados (src/auth/realApi.js, anterior a esta regra e que não pode mudar).
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/api/client.js', 'src/mocks/**', 'src/auth/**', 'src/**/*.test.js'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use as funções de src/api/recursos.js (fetch só em src/api/client.js).' },
      ],
    },
  },
  // Scripts, testes e config rodam em Node.
  {
    files: ['scripts/**', 'e2e/**', '**/*.test.js', 'vite.config.js', 'playwright.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])
