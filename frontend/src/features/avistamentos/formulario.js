import { sightingInputSchema } from 'shared/schemas'

/**
 * Regras do formulário de avistamento (criar e editar usam o MESMO formulário).
 *
 * A validação usa o mesmo schema zod que o servidor usa (shared/schemas): o que o formulário
 * aceita, o servidor aceita. Não há hora no formulário — ela é do servidor (RN02).
 */

export const DESCRICAO_MAX = 500

/** Estado inicial: vazio (novo) ou a partir do avistamento (editar). */
export function valoresIniciais(avistamento) {
  if (!avistamento) return { descricao: '', bairro: '', local: null }
  return {
    descricao: avistamento.descricao,
    bairro: avistamento.bairro,
    local: { lat: avistamento.lat, lng: avistamento.lng, origem: avistamento.origemLocal, precisaoM: avistamento.precisaoM },
  }
}

/**
 * Por que o envio está bloqueado, em frases para a pessoa ler (RN01: "sem local, envio
 * bloqueado com motivo visível"). Lista vazia = pode enviar.
 */
export function motivosDeBloqueio(valores) {
  const motivos = []
  if (!valores.local) motivos.push('Marque o local: toque no mapa ou use sua localização.')
  if (!valores.bairro) motivos.push('Escolha o bairro.')
  if (valores.descricao.length > DESCRICAO_MAX) motivos.push(`Encurte a descrição (máximo ${DESCRICAO_MAX} caracteres).`)
  return motivos
}

/** Valores do formulário → corpo do POST/PUT (contrato §4). */
export function paraEnvio(valores) {
  return {
    descricao: valores.descricao,
    bairro: valores.bairro,
    lat: valores.local?.lat,
    lng: valores.local?.lng,
    origemLocal: valores.local?.origem,
    precisaoM: valores.local?.precisaoM ?? null,
  }
}

/**
 * Corpo enviado → valores do formulário (o inverso de paraEnvio). Usado no "Revisar" de um
 * envio que falhou: o formulário reabre com exatamente o que tinha sido digitado.
 */
export function valoresDeEnvio(dados) {
  return {
    descricao: dados.descricao ?? '',
    bairro: dados.bairro ?? '',
    local: dados.lat === undefined ? null : { lat: dados.lat, lng: dados.lng, origem: dados.origemLocal, precisaoM: dados.precisaoM ?? null },
  }
}

/** Valida com o schema do contrato. Devolve { ok, dados } ou { ok: false, erros: { campo: msg } }. */
export function validar(valores) {
  const r = sightingInputSchema.safeParse(paraEnvio(valores))
  if (r.success) return { ok: true, dados: r.data }
  const erros = {}
  for (const issue of r.error.issues) {
    // lat/lng/origem são um campo só na tela: "local".
    const campo = ['lat', 'lng', 'origemLocal', 'precisaoM'].includes(issue.path[0]) ? 'local' : String(issue.path[0])
    erros[campo] ??= issue.message
  }
  return { ok: false, erros }
}

/** Houve mudança em relação ao início? (aviso de "alterações não salvas"). */
export function estaAlterado(valores, iniciais) {
  const mesmoLocal =
    valores.local === iniciais.local ||
    (valores.local && iniciais.local && valores.local.lat === iniciais.local.lat && valores.local.lng === iniciais.local.lng)
  return valores.descricao !== iniciais.descricao || valores.bairro !== iniciais.bairro || !mesmoLocal
}

/** Arredonda coordenada para exibir (5 casas ≈ 1 m) — a API recebe o valor inteiro. */
export const formatarCoordenada = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })
