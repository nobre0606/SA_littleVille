import { Router } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { criarAuth, respostaDeErroAuth, tratarErrosAuth } from '../controllers/auth.js'
import { avistamentos } from '../controllers/avistamentos.js'
import { estatisticas } from '../controllers/dashboard.js'
import { equipes } from '../controllers/equipes.js'
import { atualizarPosicao, locaisEmergencia } from '../controllers/diversos.js'
import { exigirSessao } from '../lib/sessao.js'

/**
 * Todas as rotas do contrato (docs/API-CONTRACT.md §10), montadas em /api.
 * 🔒 = exige sessão (middleware exigirSessao). Erros viram o formato do contrato no
 * tratador de erros do app.js. No Express 5, erro lançado em função async já cai lá sozinho.
 */
export function criarRotas({ jwtSecret, producao, limiteLogin }) {
  const api = Router()
  const auth = criarAuth({ jwtSecret, producao })
  const sessao = exigirSessao({ jwtSecret })

  /**
   * Rate limit do login (DECISOES D22): no máximo N tentativas ERRADAS por janela, contadas por
   * IP + e-mail — tentar muitas senhas numa conta trava; outra pessoa no mesmo Wi-Fi (mesmo IP)
   * com outro e-mail não é afetada. Login certo não conta (skipSuccessfulRequests).
   */
  const limitadorLogin = rateLimit({
    windowMs: limiteLogin.janelaMs,
    limit: limiteLogin.maximo,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email ?? '').trim().toLowerCase()}`,
    handler: (_req, res) => respostaDeErroAuth(res, 'RATE_LIMITED', 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'),
  })

  // ---------------------------------------------------------------- auth (compatibilidade)
  const rotasAuth = Router()
  rotasAuth.post('/register', auth.cadastrar)
  rotasAuth.post('/login', limitadorLogin, auth.entrar)
  rotasAuth.post('/logout', auth.sair)
  rotasAuth.get('/me', sessao, auth.eu)
  // Só /login e /register levam os campos de compatibilidade (DECISOES D23); /me e /logout
  // usam o formato puro do contrato (o tratador geral do app).
  rotasAuth.use(['/login', '/register'], tratarErrosAuth({ producao }))
  api.use('/auth', rotasAuth)

  // ------------------------------------------------------------------- avistamentos 🔒
  api.get('/sightings', sessao, avistamentos.listar)
  api.post('/sightings', sessao, avistamentos.criar)
  api.get('/sightings/:id', sessao, avistamentos.obter)
  api.put('/sightings/:id', sessao, avistamentos.atualizar)
  api.delete('/sightings/:id', sessao, avistamentos.excluir)
  api.post('/sightings/:id/restore', sessao, avistamentos.restaurar)

  // -------------------------------------------------------------------- dashboard 🔒
  api.get('/dashboard/stats', sessao, estatisticas)

  // ----------------------------------------------------------------- equipes e chat 🔒
  api.get('/teams', sessao, equipes.minhas)
  api.post('/teams', sessao, equipes.criar)
  api.post('/teams/join', sessao, equipes.entrar) // antes de /teams/:id/... (rota fixa primeiro)
  api.post('/teams/:id/leave', sessao, equipes.sair)
  api.get('/teams/:id/members', sessao, equipes.membros)
  api.get('/teams/:id/messages', sessao, equipes.mensagens)
  api.post('/teams/:id/messages', sessao, equipes.enviarMensagem)

  // ---------------------------------------------------------- emergência e posição 🔒
  api.get('/emergency-places', sessao, locaisEmergencia)
  api.post('/me/location', sessao, atualizarPosicao)

  return api
}
