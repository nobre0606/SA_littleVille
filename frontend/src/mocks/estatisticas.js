import { BAIRRO_OUTROS } from 'shared/schemas'

/**
 * Números do dashboard (GET /api/dashboard/stats), calculados como o SERVIDOR calcularia.
 * Permitido aqui porque src/mocks/ simula o servidor; nas telas é proibido (docs/DECISOES.md).
 *
 * Dias e períodos do dia são contados no fuso de Florianópolis, não em UTC: um avistamento às
 * 23h locais (02h UTC do dia seguinte) conta no dia certo.
 */

const FUSO = 'America/Sao_Paulo'
const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
const fmtHora = new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', hourCycle: 'h23' })

const diaLocal = (ms) => fmtDia.format(ms) // "2026-09-24"
const horaLocal = (ms) => Number(fmtHora.format(ms))

export function periodoDoDia(ms) {
  const h = horaLocal(ms)
  if (h < 6) return 'madrugada'
  if (h < 12) return 'manha'
  if (h < 18) return 'tarde'
  return 'noite'
}

const CELULA = 0.005 // graus ≈ 500 m

/** `ativos`: avistamentos NÃO excluídos (formato interno do banco, com vistoEm ISO). */
export function calcularEstatisticas(ativos, userId, agoraMs) {
  const total = ativos.length
  const idade = (a) => agoraMs - Date.parse(a.vistoEm)

  const ultimos7 = ativos.filter((a) => idade(a) < 7 * DIA).length
  const anterior = ativos.filter((a) => idade(a) >= 7 * DIA && idade(a) < 14 * DIA).length
  const meus = ativos.filter((a) => a.autorId === userId).length

  // Série de 30 dias, incluindo os zerados (o gráfico de linha precisa do eixo completo).
  const porDia = new Map()
  for (let i = 29; i >= 0; i--) porDia.set(diaLocal(agoraMs - i * DIA), 0)
  for (const a of ativos) {
    const dia = diaLocal(Date.parse(a.vistoEm))
    if (porDia.has(dia)) porDia.set(dia, porDia.get(dia) + 1)
  }

  const periodos = { madrugada: 0, manha: 0, tarde: 0, noite: 0 }
  for (const a of ativos) periodos[periodoDoDia(Date.parse(a.vistoEm))]++

  const bairros = new Map()
  for (const a of ativos) bairros.set(a.bairro, (bairros.get(a.bairro) ?? 0) + 1)
  const ranking = [...bairros].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'pt-BR'))
  const porBairro = ranking.length > 8
    ? [...ranking.slice(0, 8), [BAIRRO_OUTROS, ranking.slice(8).reduce((soma, [, n]) => soma + n, 0)]]
    : ranking

  const celulas = new Map()
  for (const a of ativos) {
    const chave = `${Math.floor(a.lat / CELULA)}:${Math.floor(a.lng / CELULA)}`
    const c = celulas.get(chave) ?? { total: 0, bairros: new Map() }
    c.total++
    c.bairros.set(a.bairro, (c.bairros.get(a.bairro) ?? 0) + 1)
    celulas.set(chave, c)
  }
  const topLocais = [...celulas]
    .sort((x, y) => y[1].total - x[1].total)
    .slice(0, 5)
    .map(([chave, c]) => {
      const [i, j] = chave.split(':').map(Number)
      return {
        rotulo: [...c.bairros].sort((x, y) => y[1] - x[1])[0][0],
        lat: Number(((i + 0.5) * CELULA).toFixed(5)),
        lng: Number(((j + 0.5) * CELULA).toFixed(5)),
        total: c.total,
      }
    })

  return {
    total,
    ultimos7Dias: {
      total: ultimos7,
      anterior,
      variacaoPct: anterior === 0 ? null : Math.round(((ultimos7 - anterior) / anterior) * 100),
    },
    ativosAgora: ativos.filter((a) => idade(a) < 2 * HORA).length,
    minhaContribuicao: { total: meus, percentual: total === 0 ? 0 : Math.round((meus / total) * 100) },
    seriePorDia: [...porDia].map(([data, n]) => ({ data, total: n })),
    porPeriodo: Object.entries(periodos).map(([periodo, n]) => ({ periodo, total: n })),
    porBairro: porBairro.map(([bairro, n]) => ({ bairro, total: n })),
    topLocais,
  }
}
