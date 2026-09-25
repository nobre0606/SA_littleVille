/** Rótulos em pt-BR dos períodos do dia (o servidor manda a chave: madrugada, manha...). */
export const ROTULO_PERIODO = {
  madrugada: 'Madrugada',
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
}

/** Faixas de hora de cada período, como o contrato define (§5), para a tabela equivalente. */
export const FAIXA_PERIODO = {
  madrugada: '0h–6h',
  manha: '6h–12h',
  tarde: '12h–18h',
  noite: '18h–24h',
}

/** "2026-09-24" → "24/09" (a data já vem agrupada no fuso de Florianópolis pelo servidor). */
export const diaCurto = (data) => `${data.slice(8, 10)}/${data.slice(5, 7)}`
