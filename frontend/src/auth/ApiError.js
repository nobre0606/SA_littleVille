/**
 * Erro padronizado das chamadas de autenticação — mock e real (Fase 5) lançam a MESMA forma,
 * então o formulário trata os dois iguais. `fieldErrors` é `{ campo: mensagem }` pra erro de
 * validação por campo; sem isso, é erro genérico (ex.: "E-mail ou senha inválidos").
 */
export class ApiError extends Error {
  constructor(message, { status = 400, fieldErrors = {} } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}
