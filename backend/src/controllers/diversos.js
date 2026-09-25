import { locationUpdateSchema } from 'shared/schemas'
import { prisma } from '../lib/prisma.js'
import { ok } from '../lib/resposta.js'
import { localPublico } from '../lib/formatos.js'
import { validar } from '../lib/validar.js'

/** GET /api/emergency-places (contrato §8): lista pequena e fixa, sem paginação. */
export async function locaisEmergencia(_req, res) {
  const locais = await prisma.emergencyPlace.findMany({ orderBy: [{ tipo: 'asc' }, { nome: 'asc' }] })
  return ok(res, locais.map(localPublico))
}

/**
 * POST /api/me/location (contrato §9): grava a última posição. A hora é a do SERVIDOR (o
 * cliente não manda) e só a própria pessoa atualiza a própria posição (id vem da sessão).
 */
export async function atualizarPosicao(req, res) {
  const { lat, lng, precisaoM } = validar(locationUpdateSchema, req.body)
  await prisma.user.update({
    where: { id: req.usuario.id },
    data: { posicaoLat: lat, posicaoLng: lng, posicaoPrecisaoM: precisaoM, posicaoEm: new Date() },
  })
  return ok(res, { ok: true })
}
