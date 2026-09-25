import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

/**
 * Modo mock (VITE_USE_MOCK=true): o <script> do index.html passa a apontar para
 * src/mocks/entry.js, que liga o MSW e depois importa o app. Com o mock desligado, o index.html
 * aponta para src/main.jsx e NENHUM arquivo de src/mocks/ entra no bundle — o app não importa
 * o mock em lugar nenhum (regra do ESLint), então não há caminho até ele.
 */
function entradaDoMock(usarMock) {
  return {
    name: 'little-ville:entrada-do-mock',
    // 'pre': precisa trocar o <script> ANTES do Vite ler o HTML e decidir qual é a entrada.
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => (usarMock ? html.replace('/src/main.jsx', '/src/mocks/entry.js') : html),
    },
  }
}

/**
 * Pré-carrega SÓ as fontes que aparecem acima da dobra: Nunito Sans 400 (texto) e Fredoka 600
 * (títulos). As outras 3 carregam quando forem usadas. Só no build: é quando os arquivos ganham
 * o nome final com hash.
 */
const FONTES_ACIMA_DA_DOBRA = [/nunito-sans-latin-400-normal-[\w-]+\.woff2$/, /fredoka-latin-600-normal-[\w-]+\.woff2$/]

function preloadFontes() {
  return {
    name: 'little-ville:preload-fontes',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const arquivos = Object.keys(ctx.bundle ?? {})
        return FONTES_ACIMA_DA_DOBRA.flatMap((padrao) => arquivos.filter((f) => padrao.test(f))).map((arquivo) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${arquivo}`, crossorigin: '' },
          injectTo: 'head',
        }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Sem a variável definida: mock ligado em desenvolvimento (clonou e rodou, funciona) e
  // DESLIGADO no build de produção (nunca publicar o servidor simulado por esquecimento).
  const usarMock = env.VITE_USE_MOCK !== undefined ? env.VITE_USE_MOCK === 'true' : mode !== 'production'
  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss(), entradaDoMock(usarMock), preloadFontes()],
    // O valor resolvido vale para o app inteiro — inclusive o login congelado (auth/api.js), que
    // também escolhe entre mock e real por esta variável. Assim os dois lados nunca discordam.
    define: { 'import.meta.env.VITE_USE_MOCK': JSON.stringify(String(usarMock)) },
    build: {
      // Top-level await no entry do mock (espera o MSW ligar antes do app).
      target: 'es2022',
      // Mapa de quem importa quem (dist/.vite/manifest.json): o check-bundle usa para medir a
      // entrada inicial e conferir que cada rota só puxa o que precisa.
      manifest: true,
      rolldownOptions: {
        output: {
          // Bibliotecas grandes em arquivos próprios: nenhum pedaço passa de 500 kB e o cache do
          // navegador sobrevive a deploys (mudar uma tela não invalida o React nem o GSAP).
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/ },
              { name: 'gsap', test: /node_modules[\\/](gsap|@gsap)[\\/]/ },
              { name: 'zod', test: /node_modules[\\/]zod[\\/]/ },
              { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/ },
              { name: 'recharts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/ },
              { name: 'leaflet', test: /node_modules[\\/](leaflet|leaflet\.markercluster|react-leaflet|@react-leaflet)[\\/]/ },
            ],
          },
        },
      },
    },
  }
})
