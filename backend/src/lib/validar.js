import { ErroApi } from './resposta.js'

/**
 * Valida com os MESMOS schemas zod do front (shared/schemas) — importados, nunca copiados:
 * o que o formulário aceita, a API aceita. Falhou → 400 VALIDATION_ERROR com `fields`
 * (primeira mensagem de cada campo), no formato do contrato §2.
 */
export function validar(schema, dados) {
  const r = schema.safeParse(dados ?? {})
  if (r.success) return r.data
  const fields = {}
  for (const issue of r.error.issues) {
    const campo = String(issue.path[0] ?? '_')
    fields[campo] ??= issue.message
  }
  throw new ErroApi('VALIDATION_ERROR', 'Confira os campos destacados.', fields)
}
