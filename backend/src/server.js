import { criarApp } from './app.js'
import { lerAmbiente } from './lib/env.js'
import { prisma } from './lib/prisma.js'

/**
 * Ponto de entrada: valida o .env, confere o banco e abre a porta (3333 por padrão).
 * `npm run dev` carrega o .env com o próprio Node (--env-file), sem biblioteca extra.
 */
const env = lerAmbiente()

// Falha logo na subida se o banco não responder, com uma mensagem clara.
await prisma.$queryRaw`SELECT 1`

const app = criarApp({ corsOrigin: env.CORS_ORIGIN, producao: env.producao, jwtSecret: env.JWT_SECRET, limiteLogin: env.limiteLogin })
const servidor = app.listen(env.PORT, () => {
  console.log(`✔ API do Little Ville em http://localhost:${env.PORT}/api (${env.NODE_ENV})`)
})

// Encerramento limpo (Ctrl+C / deploy): termina as requisições em andamento e fecha o banco.
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    servidor.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  })
}
