import { z } from 'zod'

/**
 * Configuração lida SÓ de variáveis de ambiente (arquivo .env, fora do git). Nenhuma senha,
 * string de conexão ou segredo fica no código.
 *
 * Validada na subida do servidor: se faltar algo (ou o JWT_SECRET for curto demais), o
 * servidor NÃO sobe e diz o que falta — melhor que subir e falhar no primeiro login.
 */
const esquema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://', 'DATABASE_URL precisa ser uma URL postgresql://'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  // 32+ caracteres: segredo curto deixa o JWT vulnerável a força bruta.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres aleatórios'),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN precisa ser uma URL (ex.: http://localhost:5173)'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Rate limit do login (DECISOES D22): configurável por .env, folgado em desenvolvimento
  // (senão testar o login várias vezes seguidas trava a própria pessoa desenvolvendo).
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
})

export function lerAmbiente(fonte = process.env) {
  const r = esquema.safeParse(fonte)
  if (!r.success) {
    const problemas = r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Configuração inválida no .env:\n${problemas}`)
  }
  return {
    ...r.data,
    producao: r.data.NODE_ENV === 'production',
    limiteLogin: { maximo: r.data.LOGIN_RATE_LIMIT_MAX, janelaMs: r.data.LOGIN_RATE_LIMIT_WINDOW_MIN * 60_000 },
  }
}
