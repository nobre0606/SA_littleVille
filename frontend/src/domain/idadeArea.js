/**
 * RF04 — a área de 1 km de cada avistamento muda de aparência com a idade (RN06).
 *
 * Função PURA: recebe a hora do avistamento e o "agora" do SERVIDOR (relogioServidor.agora()),
 * nunca lê o relógio sozinha. Isso a torna testável e garante a regra "tempo sempre do servidor".
 *
 * Cor NUNCA sozinha (acessibilidade): cada faixa tem também ícone, rótulo e estilo de traço do
 * círculo no mapa — quem não distingue vermelho de laranja ainda vê "sólido × tracejado".
 * O retorno traz o NOME do token (`status-fresh`), não a cor: a cor só existe no tokens.css.
 */

const HORA = 60 * 60 * 1000

export const FAIXAS = {
  fresh: { estado: 'fresh', rotulo: 'Recente', token: 'status-fresh', icone: 'flame', traco: 'solido', dashArray: null },
  warm: { estado: 'warm', rotulo: '1–2 h', token: 'status-warm', icone: 'hourglass', traco: 'tracejado', dashArray: '12 8' },
  cold: { estado: 'cold', rotulo: 'Antigo', token: 'status-cold', icone: 'snowflake', traco: 'pontilhado', dashArray: '2 6' },
}

/** Círculo do RF04: raio fixo de 1000 m, preenchimento 12% e traço 70% de opacidade. */
export const AREA = { raioM: 1000, opacidadePreenchimento: 0.12, opacidadeTraco: 0.7 }

/**
 * < 1 h → fresh · de 1 h até 2 h (inclusive) → warm · > 2 h → cold.
 * Avistamento "no futuro" (desvio residual) conta como recente.
 */
export function corDaArea(horaAvistamento, serverNow) {
  const ms = typeof horaAvistamento === 'number' ? horaAvistamento : Date.parse(horaAvistamento)
  if (Number.isNaN(ms)) return FAIXAS.cold
  const idade = serverNow - ms
  if (idade < HORA) return FAIXAS.fresh
  if (idade <= 2 * HORA) return FAIXAS.warm
  return FAIXAS.cold
}
