import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { CONTRACT_VERSION } from 'shared/constantes'
import { rotaNaoEncontrada, tratarErros } from './middleware/erros.js'

/**
 * Monta o app Express SEM abrir porta (quem abre é o server.js). Separado assim para os
 * testes (supertest) usarem o app direto, sem servidor de verdade.
 *
 * Recebe a configuração por parâmetro (em vez de ler process.env aqui): o app não depende
 * do .env para existir, e os testes passam valores próprios.
 */
export function criarApp({ corsOrigin, producao = false }) {
  const app = express()

  // Atrás de proxy (Vercel/Render) o IP real vem no X-Forwarded-For: necessário para o rate
  // limit contar por pessoa, e não "todo mundo é o proxy".
  if (producao) app.set('trust proxy', 1)
  app.disable('x-powered-by') // não anunciar "Express" para quem procura alvo

  // Cabeçalhos de segurança (HSTS, nosniff, frame-ancestors...). É uma API JSON: sem HTML.
  app.use(helmet())

  // CORS só para a origem do front, COM credenciais (o cookie de sessão precisa ir junto).
  app.use(cors({ origin: corsOrigin, credentials: true }))

  // Limite de 16 kB no corpo (contrato: 413 acima disso) — impede enviar corpos gigantes.
  app.use(express.json({ limit: '16kb' }))
  app.use(cookieParser())

  // Versão do contrato em toda resposta (o front avisa se a MAJOR não bater).
  app.use((_req, res, next) => {
    res.set('X-Contract-Version', CONTRACT_VERSION)
    next()
  })

  // As rotas do contrato entram aqui na Fase B1 (src/routes/).

  app.use('/api', rotaNaoEncontrada)
  app.use(rotaNaoEncontrada)
  app.use(tratarErros({ producao }))
  return app
}
