/**
 * Monta o pacote de deploy da Vercel (.vercel/output) depois do `vite build`.
 * Rodado pelo `npm run build:vercel` (o buildCommand do vercel.json). Ver vercel-config.mjs.
 *
 * Variáveis (definidas no painel da Vercel):
 *   VITE_USE_MOCK  "true" = demonstração com servidor simulado no navegador (sem back-end)
 *   API_URL        base da API real, ex.: https://minha-api.onrender.com/api (só sem mock)
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { conferirVariaveis, gerarConfig } from './vercel-config.mjs'

const usarMock = process.env.VITE_USE_MOCK === 'true'
const apiUrl = process.env.API_URL

const problema = conferirVariaveis({ usarMock, apiUrl })
if (problema) {
  console.error(`✖ ${problema}`)
  process.exit(1)
}

const SAIDA = '.vercel/output'
rmSync(SAIDA, { recursive: true, force: true })
mkdirSync(`${SAIDA}/static`, { recursive: true })
cpSync('dist', `${SAIDA}/static`, { recursive: true })
writeFileSync(`${SAIDA}/config.json`, `${JSON.stringify(gerarConfig({ apiUrl: usarMock ? '' : apiUrl }), null, 2)}\n`)

console.log(`✔ Deploy montado em ${SAIDA} — ${usarMock ? 'MODO DEMONSTRAÇÃO (mock)' : `API real em ${apiUrl}`}`)
