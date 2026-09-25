import { prisma } from '../lib/prisma.js'
import { ok } from '../lib/resposta.js'

/**
 * GET /api/dashboard/stats (contrato §5). TODAS as contas são feitas PELO POSTGRESQL (count,
 * FILTER, GROUP BY, generate_series, janelas) — nada de trazer a lista inteira para o
 * JavaScript somar. Com milhares de avistamentos, só voltam algumas dezenas de números.
 *
 * Dias e períodos são contados no fuso de Florianópolis (`AT TIME ZONE 'America/Sao_Paulo'`):
 * um avistamento às 23h locais (02h UTC do dia seguinte) cai no dia certo.
 * Excluídos ("deletedAt" preenchido) nunca entram.
 */
const FUSO = 'America/Sao_Paulo'
const CELULA = 0.005 // graus ≈ 500 m (topLocais)

export async function estatisticas(req, res) {
  const eu = req.usuario.id

  const [[resumo], serie, [periodos], bairros, locais] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE "vistoEm" > now() - interval '7 days')::int AS ultimos7,
        count(*) FILTER (WHERE "vistoEm" <= now() - interval '7 days' AND "vistoEm" > now() - interval '14 days')::int AS anterior,
        count(*) FILTER (WHERE "vistoEm" > now() - interval '2 hours')::int AS ativos,
        count(*) FILTER (WHERE "autorId" = ${eu})::int AS meus
      FROM sightings WHERE "deletedAt" IS NULL`,

    // 30 dias SEMPRE, inclusive os zerados: generate_series cria os dias e o LEFT JOIN conta.
    prisma.$queryRaw`
      WITH dias AS (
        SELECT generate_series((now() AT TIME ZONE ${FUSO})::date - 29, (now() AT TIME ZONE ${FUSO})::date, interval '1 day')::date AS dia
      )
      SELECT to_char(d.dia, 'YYYY-MM-DD') AS data, count(s.id)::int AS total
      FROM dias d
      LEFT JOIN sightings s ON s."deletedAt" IS NULL AND (s."vistoEm" AT TIME ZONE ${FUSO})::date = d.dia
      GROUP BY d.dia ORDER BY d.dia`,

    prisma.$queryRaw`
      SELECT
        count(*) FILTER (WHERE extract(hour FROM "vistoEm" AT TIME ZONE ${FUSO}) < 6)::int AS madrugada,
        count(*) FILTER (WHERE extract(hour FROM "vistoEm" AT TIME ZONE ${FUSO}) BETWEEN 6 AND 11)::int AS manha,
        count(*) FILTER (WHERE extract(hour FROM "vistoEm" AT TIME ZONE ${FUSO}) BETWEEN 12 AND 17)::int AS tarde,
        count(*) FILTER (WHERE extract(hour FROM "vistoEm" AT TIME ZONE ${FUSO}) >= 18)::int AS noite
      FROM sightings WHERE "deletedAt" IS NULL`,

    // Top 8 bairros + "Outros" (só quando há mais de 8), tudo no SQL com funções de janela.
    prisma.$queryRaw`
      WITH c AS (SELECT bairro, count(*)::int AS total FROM sightings WHERE "deletedAt" IS NULL GROUP BY bairro),
      r AS (SELECT *, row_number() OVER (ORDER BY total DESC, bairro) AS pos, count(*) OVER () AS qtd FROM c)
      SELECT CASE WHEN qtd > 8 AND pos > 8 THEN 'Outros' ELSE bairro END AS bairro, sum(total)::int AS total
      FROM r GROUP BY 1 ORDER BY min(pos)`,

    // Células de ~500 m com mais avistamentos; rótulo = bairro mais frequente na célula.
    prisma.$queryRaw`
      SELECT
        ((floor(latitude / ${CELULA}) + 0.5) * ${CELULA})::float AS lat,
        ((floor(longitude / ${CELULA}) + 0.5) * ${CELULA})::float AS lng,
        count(*)::int AS total,
        mode() WITHIN GROUP (ORDER BY bairro) AS rotulo
      FROM sightings WHERE "deletedAt" IS NULL
      GROUP BY floor(latitude / ${CELULA}), floor(longitude / ${CELULA})
      ORDER BY total DESC LIMIT 5`,
  ])

  const variacaoPct = resumo.anterior === 0 ? null : Math.round(((resumo.ultimos7 - resumo.anterior) / resumo.anterior) * 100)
  return ok(res, {
    total: resumo.total,
    ultimos7Dias: { total: resumo.ultimos7, anterior: resumo.anterior, variacaoPct },
    ativosAgora: resumo.ativos,
    minhaContribuicao: { total: resumo.meus, percentual: resumo.total === 0 ? 0 : Math.round((resumo.meus / resumo.total) * 100) },
    seriePorDia: serie,
    porPeriodo: ['madrugada', 'manha', 'tarde', 'noite'].map((periodo) => ({ periodo, total: periodos[periodo] })),
    porBairro: bairros,
    topLocais: locais.map((l) => ({ rotulo: l.rotulo, lat: Number(l.lat.toFixed(5)), lng: Number(l.lng.toFixed(5)), total: l.total })),
  })
}
