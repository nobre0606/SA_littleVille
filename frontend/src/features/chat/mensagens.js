/**
 * Regras de exibição do chat (funções puras, testadas).
 */

const JANELA_GRUPO_MS = 5 * 60 * 1000 // mensagens seguidas do mesmo autor em até 5 min = um grupo

const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
const fmtDataLonga = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long' })
const dia = (ms) => fmtDia.format(ms)

/**
 * Junta mensagens novas às que já estão na tela: sem duplicar (o polling pode trazer de novo a
 * mensagem que eu mesmo enviei) e na ordem de criação. A confirmada substitui a otimista pelo
 * `clientId` que o servidor ecoa.
 */
export function mesclarMensagens(atuais, novas) {
  const porChave = new Map()
  for (const m of [...atuais, ...novas]) {
    // Otimista (sem id do servidor) é identificada pelo clientId; a confirmada, pelo id.
    const chave = m.id ?? `c:${m.clientId}`
    if (m.id && m.clientId) porChave.delete(`c:${m.clientId}`)
    porChave.set(chave, m)
  }
  return [...porChave.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
}

/** "Hoje" · "Ontem" · "12 de setembro" — no fuso de Florianópolis, com o "agora" do servidor. */
export function rotuloDoDia(iso, agoraMs) {
  const d = dia(Date.parse(iso))
  if (d === dia(agoraMs)) return 'Hoje'
  if (d === dia(agoraMs - 24 * 60 * 60 * 1000)) return 'Ontem'
  return fmtDataLonga.format(Date.parse(iso))
}

/**
 * Agrupa para exibir: separador por DIA e, dentro do dia, grupos de mensagens seguidas do
 * mesmo autor (nome e avatar aparecem uma vez por grupo, como nos apps de conversa).
 * → [{ tipo: 'dia', rotulo }, { tipo: 'grupo', autor, mensagens: [...] }, ...]
 */
export function agruparMensagens(mensagens, agoraMs) {
  const saida = []
  let diaAtual = null
  let grupo = null
  for (const m of mensagens) {
    const ms = Date.parse(m.createdAt)
    const d = dia(ms)
    if (d !== diaAtual) {
      diaAtual = d
      saida.push({ tipo: 'dia', rotulo: rotuloDoDia(m.createdAt, agoraMs), chave: `dia-${d}` })
      grupo = null
    }
    const ultima = grupo?.mensagens[grupo.mensagens.length - 1]
    if (grupo && grupo.autor.id === m.autor.id && ms - Date.parse(ultima.createdAt) <= JANELA_GRUPO_MS) {
      grupo.mensagens.push(m)
    } else {
      grupo = { tipo: 'grupo', autor: m.autor, mensagens: [m], chave: `g-${m.id ?? m.clientId}` }
      saida.push(grupo)
    }
  }
  return saida
}

/** Perto do fim (tolerância de 48 px)? Só então a rolagem automática acompanha as novas. */
export const estaNoFim = ({ scrollTop, scrollHeight, clientHeight }) => scrollHeight - scrollTop - clientHeight < 48
