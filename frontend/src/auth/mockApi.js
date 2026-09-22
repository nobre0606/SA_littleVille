import { loginSchema, registerSchema } from 'shared/schemas'
import { ApiError } from './ApiError.js'

/**
 * Implementação mock (`?VITE_USE_MOCK=true`) — nenhum componente importa este arquivo direto,
 * só `api.js` (a fachada) decide entre mock e real. Simula os MESMOS schemas zod que o back
 * real (Fase 5) vai validar, então um formulário testado no mock já está testado contra a
 * mesma regra de validação do servidor de verdade.
 */

const LATENCY_MIN = 600
const LATENCY_MAX = 1200
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const randomLatency = () => LATENCY_MIN + Math.random() * (LATENCY_MAX - LATENCY_MIN)

// Usuária semeada: credencial válida pra testar login com sucesso, e-mail/CPF já "cadastrados"
// pra testar a rejeição de duplicata no cadastro. Reseta a cada recarregamento da página (só
// vive em memória, de propósito — não é sessão de verdade).
const SEEDED = { nome: 'Usuária de Teste', email: 'usada@example.com', senha: 'Abcdefg1', cpf: '11144477735' }
const users = new Map([[SEEDED.email, { ...SEEDED }]])
const cpfsUsados = new Set([SEEDED.cpf])

function fieldErrorsFromZod(error) {
  const fieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return new ApiError('Dados inválidos', { status: 400, fieldErrors })
}

export async function login({ email, senha }) {
  await wait(randomLatency())
  const parsed = loginSchema.safeParse({ email, senha })
  if (!parsed.success) throw fieldErrorsFromZod(parsed.error)
  const user = users.get(parsed.data.email)
  // Erro genérico: nunca revela se o e-mail existe (mesma regra do back real — RNF da Fase 5).
  if (!user || user.senha !== senha) throw new ApiError('E-mail ou senha inválidos', { status: 401 })
  return { nome: user.nome, email: user.email }
}

export async function register(payload) {
  await wait(randomLatency())
  const parsed = registerSchema.safeParse(payload)
  if (!parsed.success) throw fieldErrorsFromZod(parsed.error)
  const data = parsed.data
  const fieldErrors = {}
  if (users.has(data.email)) fieldErrors.email = 'Este e-mail já está cadastrado'
  if (cpfsUsados.has(data.cpf)) fieldErrors.cpf = 'Este CPF já está cadastrado'
  if (Object.keys(fieldErrors).length > 0) throw new ApiError('Dados já cadastrados', { status: 409, fieldErrors })
  users.set(data.email, { nome: data.nome, email: data.email, senha: payload.senha, cpf: data.cpf })
  cpfsUsados.add(data.cpf)
  return { nome: data.nome, email: data.email }
}

export async function logout() {
  await wait(200)
  return {}
}

export async function me() {
  await wait(200)
  throw new ApiError('Não autenticado', { status: 401 })
}
