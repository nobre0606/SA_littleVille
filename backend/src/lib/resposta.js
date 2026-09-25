import { ERROR_CODES } from 'shared/constantes'

/**
 * Envelopes do contrato (§1.3) em UM lugar: toda resposta — sucesso ou erro — sai daqui, com
 * `serverTime` (ISO UTC com ms). É o `serverTime` que permite ao front corrigir o relógio do
 * aparelho (contrato §1.4).
 */
export const serverTime = () => new Date().toISOString()

export function ok(res, data, { status = 200, extra = {} } = {}) {
  return res.status(status).json({ data, ...extra, serverTime: serverTime() })
}

/**
 * Erro no formato único do contrato (§2): `{ error: { code, message, fields? }, serverTime }`.
 * O status HTTP vem SEMPRE da tabela ERROR_CODES do shared — o mesmo arquivo que o front usa.
 */
export class ErroApi extends Error {
  constructor(code, message, fields) {
    super(message)
    this.code = code
    this.fields = fields
  }
}

export function erro(res, code, message, fields) {
  const status = ERROR_CODES[code] ?? 500
  return res.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) }, serverTime: serverTime() })
}
