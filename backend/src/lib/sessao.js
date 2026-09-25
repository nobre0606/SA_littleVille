import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'
import { ErroApi } from './resposta.js'

/**
 * Sessão (contrato §1.2): um JWT dentro de um cookie httpOnly.
 *
 * - httpOnly: o JavaScript do navegador NÃO consegue ler o cookie → um XSS não rouba a sessão.
 * - SameSite=Lax: o navegador não manda o cookie em requisições de outros sites (proteção
 *   contra CSRF), mas manda nas do próprio app.
 * - Secure só em produção: em http://localhost (desenvolvimento) um cookie Secure não gravaria.
 * - O token NUNCA vai no corpo da resposta: o front nem sabe que ele existe.
 * - Validade de 1 hora (DECISOES D22): sessão curta limita o estrago de um cookie vazado.
 */
export const NOME_COOKIE = 'lv_session'
export const DURACAO_MS = 60 * 60 * 1000

export function abrirSessao(res, usuario, { jwtSecret, producao }) {
  const token = jwt.sign({ sub: usuario.id }, jwtSecret, { expiresIn: Math.floor(DURACAO_MS / 1000) })
  res.cookie(NOME_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: producao, path: '/', maxAge: DURACAO_MS })
  return new Date(Date.now() + DURACAO_MS)
}

export function encerrarSessao(res, { producao }) {
  res.clearCookie(NOME_COOKIE, { httpOnly: true, sameSite: 'lax', secure: producao, path: '/' })
}

/** Campos do usuário que a API pode devolver — CPF, telefone, endereço e hash ficam de fora (LGPD). */
export const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  createdAt: true,
  membroDe: { select: { teamId: true } },
}

/**
 * Middleware das rotas 🔒: confere o cookie e carrega o usuário DO BANCO a cada requisição
 * (não confia em nada do token além do id: se o papel mudar ou a conta sumir, vale na hora).
 * Sem cookie, cookie inválido ou vencido → 401 UNAUTHENTICATED.
 */
export function exigirSessao({ jwtSecret }) {
  return async (req, _res, next) => {
    const token = req.cookies?.[NOME_COOKIE]
    let id
    try {
      id = jwt.verify(token, jwtSecret).sub
    } catch {
      throw new ErroApi('UNAUTHENTICATED', 'Sua sessão expirou. Entre novamente.')
    }
    const usuario = await prisma.user.findUnique({ where: { id }, select: CAMPOS_PUBLICOS })
    if (!usuario) throw new ErroApi('UNAUTHENTICATED', 'Sua sessão expirou. Entre novamente.')
    req.usuario = usuario
    req.expiraEm = new Date(jwt.decode(token).exp * 1000)
    next()
  }
}
