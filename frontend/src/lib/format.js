/**
 * Formatação em pt-BR no fuso America/Sao_Paulo. A API manda tudo em UTC (contrato §1.5); é só
 * aqui, na hora de mostrar, que o fuso entra. Funções puras: recebem o "agora" como parâmetro
 * (sempre a hora do SERVIDOR, via relogioServidor.agora()) — nunca chamam Date.now().
 */

export const FUSO = 'America/Sao_Paulo'

const MIN = 60 * 1000
const HORA = 60 * MIN

const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
const fmtDiaMes = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric', month: 'short' })
const fmtDiaMesAno = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric', month: 'short', year: 'numeric' })
const fmtCompleto = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'long', timeStyle: 'short' })
const fmtDataChave = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
const fmtNumero = new Intl.NumberFormat('pt-BR')

/** "2026-09-24" do dia no fuso de SP — para comparar "hoje"/"ontem" sem erro de fuso. */
const chaveDoDia = (ms) => fmtDataChave.format(ms)

/**
 * "agora mesmo" · "há 40 min" · "há 3 h" · "ontem às 14:05" · "12 de set." · "12 de set. de 2025"
 * Datas no futuro (desvio residual de relógio) contam como "agora mesmo".
 */
export function formatarTempoRelativo(iso, agoraMs) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const diff = agoraMs - ms
  if (diff < MIN) return 'agora mesmo'
  if (diff < HORA) return `há ${Math.floor(diff / MIN)} min`
  const hoje = chaveDoDia(agoraMs)
  if (chaveDoDia(ms) === hoje) return `há ${Math.floor(diff / HORA)} h`
  if (chaveDoDia(ms) === chaveDoDia(agoraMs - 24 * HORA)) return `ontem às ${fmtHora.format(ms)}`
  const mesmoAno = hoje.slice(0, 4) === chaveDoDia(ms).slice(0, 4)
  return (mesmoAno ? fmtDiaMes : fmtDiaMesAno).format(ms)
}

/** "24 de setembro de 2026 às 10:05" — para o title/tooltip e telas de detalhe. */
export const formatarDataHoraCompleta = (iso) => fmtCompleto.format(Date.parse(iso))

export const formatarHora = (iso) => fmtHora.format(Date.parse(iso))

export const formatarNumero = (n) => fmtNumero.format(n)
