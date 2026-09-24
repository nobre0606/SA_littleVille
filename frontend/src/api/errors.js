import { ERROR_CODES } from 'shared/constantes'

/**
 * Erro único do front. Tudo que dá errado numa chamada — erro do servidor no formato do
 * contrato, erro no formato ANTIGO do login/cadastro, ou falha de rede — vira isto, com os
 * mesmos campos. Os componentes decidem pelo `code`, nunca pelo texto da mensagem.
 */
export class ApiClientError extends Error {
  constructor({ code, message, fields = {}, status = 0, serverTime = null }) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.fields = fields
    this.status = status
    this.serverTime = serverTime
  }
}

/** Mensagem pt-BR de reserva, para quando o servidor não mandar nenhuma. */
export const MENSAGEM_PADRAO = {
  VALIDATION_ERROR: 'Confira os campos destacados.',
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre novamente.',
  FORBIDDEN: 'Você não tem permissão para fazer isso.',
  NOT_IN_TEAM: 'Você não faz parte desta equipe.',
  NOT_FOUND: 'Não encontramos o que você procurou.',
  TEAM_CODE_NOT_FOUND: 'Nenhuma equipe com esse código.',
  EMAIL_TAKEN: 'Este e-mail já está cadastrado.',
  CPF_TAKEN: 'Este CPF já está cadastrado.',
  ALREADY_IN_TEAM: 'Você já está em uma equipe. Saia dela antes.',
  RESTORE_WINDOW_EXPIRED: 'Não foi possível desfazer: o tempo acabou.',
  PAYLOAD_TOO_LARGE: 'O conteúdo enviado é grande demais.',
  RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde um instante.',
  INTERNAL_ERROR: 'Algo deu errado no servidor. Tente de novo.',
  SERVICE_UNAVAILABLE: 'O servidor está indisponível no momento.',
  NETWORK_ERROR: 'Sem conexão com o servidor. Verifique sua internet.',
}

/** Primeiro código da tabela do contrato para cada status (usado quando o corpo não traz código). */
function codigoPorStatus(status) {
  const exato = Object.entries(ERROR_CODES).find(([, s]) => s === status)?.[0]
  if (exato) return exato
  return status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR'
}

/**
 * Converte QUALQUER corpo de erro para o formato do contrato.
 *
 * POR QUE aceitar o formato antigo: as telas de login e cadastro estão congeladas e foram
 * feitas para `{ message, fieldErrors }`. Em vez de mexer nelas, a tradução mora aqui, num
 * único lugar — o resto do app só conhece `{ code, message, fields }`.
 *
 * No formato antigo não existe `code`, então ele é deduzido do status e da rota:
 *   401 no /auth/login → INVALID_CREDENTIALS (senha errada), senão UNAUTHENTICATED
 *   409 com erro só no CPF → CPF_TAKEN; 409 em /teams → ALREADY_IN_TEAM; outro 409 → EMAIL_TAKEN
 */
export function normalizarErro(corpo, status, rota = '') {
  const serverTime = corpo?.serverTime ?? null

  // 1. Formato do contrato.
  if (corpo?.error && typeof corpo.error === 'object') {
    const { code, message, fields } = corpo.error
    const conhecido = code in ERROR_CODES ? code : codigoPorStatus(status)
    return new ApiClientError({
      code: conhecido,
      message: message || MENSAGEM_PADRAO[conhecido],
      fields: fields ?? {},
      status,
      serverTime,
    })
  }

  // 2. Formato antigo do login/cadastro, ou 3. corpo vazio/não-JSON.
  const fields = corpo?.fieldErrors && typeof corpo.fieldErrors === 'object' ? corpo.fieldErrors : {}
  let code = codigoPorStatus(status)
  if (status === 401) code = rota.includes('/auth/login') ? 'INVALID_CREDENTIALS' : 'UNAUTHENTICATED'
  if (status === 409) {
    if (rota.includes('/teams')) code = 'ALREADY_IN_TEAM'
    else if (fields.cpf && !fields.email) code = 'CPF_TAKEN'
    else code = 'EMAIL_TAKEN'
  }
  const message = typeof corpo?.message === 'string' && corpo.message ? corpo.message : MENSAGEM_PADRAO[code]
  return new ApiClientError({ code, message, fields, status, serverTime })
}

/**
 * Mesmo tratamento para o `ApiError` que o módulo congelado `auth/api.js` lança (ele tem
 * `status`, `message` e `fieldErrors`). Útil se o app precisar tratar um erro vindo de lá.
 */
export const normalizarErroLegado = (erro, rota = '') =>
  normalizarErro({ message: erro?.message, fieldErrors: erro?.fieldErrors }, erro?.status ?? 0, rota)

/** Falha antes de existir resposta HTTP (sem internet, DNS, CORS). Nunca vem da API. */
export const erroDeRede = () =>
  new ApiClientError({ code: 'NETWORK_ERROR', message: MENSAGEM_PADRAO.NETWORK_ERROR, status: 0 })
