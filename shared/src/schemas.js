import { z } from 'zod'
import { isValidCPF, sanitizeCPF } from './cpf.js'

/**
 * Schemas zod compartilhados entre o front (Fase 4) e o back (Fase 5) — o MESMO arquivo,
 * importado dos dois lados (`shared/schemas`), para nunca validar coisas diferentes nas duas
 * pontas. Mensagens em português: usadas direto como erro de campo no front.
 */

const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '')

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail')
  .email('E-mail inválido')

export const senhaSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .regex(/[a-z]/, 'A senha precisa de uma letra minúscula')
  .regex(/[A-Z]/, 'A senha precisa de uma letra maiúscula')
  .regex(/[0-9]/, 'A senha precisa de um número')

export const cpfSchema = z
  .string()
  .transform(sanitizeCPF)
  .refine((v) => v.length === 11, 'CPF precisa ter 11 dígitos')
  .refine(isValidCPF, 'CPF inválido')

export const telefoneSchema = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 10 || v.length === 11, 'Telefone inválido (informe DDD + número)')

export const cepSchema = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 8, 'CEP inválido')

export const nomeSchema = z.string().trim().min(3, 'Informe seu nome completo')

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Informe a senha'),
})

/** Etapa 1 do cadastro: dados pessoais e credenciais. */
export const registerStep1Schema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaSchema,
  cpf: cpfSchema,
  telefone: telefoneSchema,
})

/** Etapa 2: endereço (CEP autopreenche rua/bairro no front) + consentimento LGPD obrigatório. */
export const registerStep2Schema = z.object({
  cep: cepSchema,
  numero: z.string().trim().min(1, 'Informe o número'),
  rua: z.string().trim().min(1, 'Informe a rua'),
  bairro: z.string().trim().min(1, 'Informe o bairro'),
  consentimentoLgpd: z.literal(true, 'É preciso aceitar o uso dos dados para continuar'),
})

/** Schema completo (as duas etapas juntas) — o que o back (Fase 5) valida no corpo do POST. */
export const registerSchema = registerStep1Schema.merge(registerStep2Schema)
