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

/* ==========================================================================================
 * CONTRATO DA API — v1.0.0 (docs/API-CONTRACT.md é a descrição em texto; este arquivo é a
 * versão executável). O MSW do front valida cada resposta contra estes schemas nos testes de
 * contrato: se o mock e o documento divergirem, o teste reprova.
 *
 * Convenção de nomes: campos de DOMÍNIO em português (nome, descricao, bairro...), como o
 * cadastro que já existia; campos TÉCNICOS em inglês (id, createdAt, deletedAt, serverTime),
 * que é o vocabulário de qualquer API REST e o que o próprio brief usa.
 * ======================================================================================== */

export const CONTRACT_VERSION = '1.0.0'

/**
 * Data/hora sempre em ISO 8601 UTC com "Z" (ex.: 2026-09-24T13:05:00.000Z). `z.iso.datetime()`
 * sem `offset: true` RECUSA "-03:00" — assim o servidor não consegue mandar hora local por
 * engano, e o fuso America/Sao_Paulo fica só na formatação do front.
 */
export const isoUtcSchema = z.iso.datetime({ message: 'Data/hora deve estar em UTC (ISO 8601 com Z)' })

/** Id opaco: o front nunca interpreta o formato (pode ser uuid, cuid, número em texto...). */
export const idSchema = z.string().min(1).max(64)

export const latSchema = z.number().min(-90, 'Latitude inválida').max(90, 'Latitude inválida')
export const lngSchema = z.number().min(-180, 'Longitude inválida').max(180, 'Longitude inválida')

/** Precisão do GPS em metros (o `coords.accuracy` do navegador). Null quando o local é manual. */
export const precisaoSchema = z.number().min(0).max(100_000).nullable()

// ---------------------------------------------------------------------------------- erros

/**
 * Tabela ÚNICA de códigos de erro → status HTTP. O back responde com estes códigos, o mock
 * também, e o front decide o que fazer pelo `code` (nunca pela `message`, que é texto pra
 * pessoa ler e pode mudar).
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_IN_TEAM: 403,
  NOT_FOUND: 404,
  TEAM_CODE_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  CPF_TAKEN: 409,
  ALREADY_IN_TEAM: 409,
  RESTORE_WINDOW_EXPIRED: 410,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
}

export const errorCodeSchema = z.enum(Object.keys(ERROR_CODES))

/** `fields`: `{ campo: mensagem }` só em erro de validação/duplicidade; ausente nos demais. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string().min(1),
    fields: z.record(z.string(), z.string()).optional(),
  }),
  serverTime: isoUtcSchema,
})

// ------------------------------------------------------------------------------ envelopes

/**
 * Toda resposta de sucesso é `{ data, serverTime }`. O `serverTime` em TODA resposta é o que
 * permite ao front corrigir o relógio local a cada chamada (regra de tempo do RF04 nunca usa
 * o relógio do aparelho, que pode estar errado ou ter sido alterado pelo usuário).
 */
export const envelope = (dataSchema) => z.object({ data: dataSchema, serverTime: isoUtcSchema })

export const pageMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})

export const pagedEnvelope = (itemSchema) =>
  z.object({ data: z.array(itemSchema), page: pageMetaSchema, serverTime: isoUtcSchema })

/** Resposta de operações sem corpo útil (logout, envio de posição). */
export const okSchema = z.object({ ok: z.literal(true) })

// ------------------------------------------------------------------------ usuário/sessão

export const papelSchema = z.enum(['usuario', 'admin'])

/**
 * Usuário como a API devolve. CPF, telefone e endereço NÃO voltam em nenhuma resposta
 * (minimização da LGPD): o front não precisa deles depois do cadastro.
 */
export const userSchema = z.object({
  id: idSchema,
  nome: z.string().min(1),
  email: z.string().email(),
  papel: papelSchema,
  equipeId: idSchema.nullable(),
  createdAt: isoUtcSchema,
})

/** A sessão viaja num cookie httpOnly — o corpo traz só quem está logado e até quando. */
export const sessionSchema = z.object({
  user: userSchema,
  expiraEm: isoUtcSchema,
})

/** Resumo do autor embutido em avistamento/mensagem (evita uma chamada por item na lista). */
export const autorResumoSchema = z.object({ id: idSchema, nome: z.string().min(1) })

// ---------------------------------------------------------------------------- avistamentos

export const origemLocalSchema = z.enum(['gps', 'manual'])

/**
 * Corpo de POST e PUT /api/sightings. `z.strictObject` recusa campo desconhecido — em
 * especial `vistoEm`: a hora do avistamento é SEMPRE a do servidor no momento da criação
 * (regra "hora automática"), o cliente não tem como mandá-la.
 */
export const sightingInputSchema = z.strictObject({
  descricao: z
    .string()
    .trim()
    .min(3, 'Descreva o avistamento (mínimo 3 caracteres)')
    .max(500, 'A descrição pode ter no máximo 500 caracteres'),
  lat: latSchema,
  lng: lngSchema,
  origemLocal: origemLocalSchema,
  precisaoM: precisaoSchema.optional().default(null),
})

export const sightingSchema = z.object({
  id: idSchema,
  autor: autorResumoSchema,
  descricao: z.string().min(3).max(500),
  lat: latSchema,
  lng: lngSchema,
  origemLocal: origemLocalSchema,
  precisaoM: precisaoSchema,
  /** Preenchido pelo servidor a partir das coordenadas; null se fora de qualquer bairro conhecido. */
  bairro: z.string().min(1).nullable(),
  /** Hora do avistamento = hora do servidor na criação. Imutável (PUT não altera). */
  vistoEm: isoUtcSchema,
  createdAt: isoUtcSchema,
  updatedAt: isoUtcSchema,
  /** Exclusão lógica: null nas respostas normais; preenchido só na resposta do DELETE. */
  deletedAt: isoUtcSchema.nullable(),
  /**
   * Permissões calculadas PELO SERVIDOR para o usuário da sessão. O front só esconde/mostra o
   * botão com base nisto — a checagem de verdade é sempre no servidor (403 FORBIDDEN).
   */
  acoes: z.object({ podeEditar: z.boolean(), podeExcluir: z.boolean() }),
})

export const SIGHTING_SORTS = ['-vistoEm', 'vistoEm', 'bairro', '-bairro', 'autor', '-autor']

/**
 * Query string do GET /api/sightings. Tudo chega como texto na URL, por isso o `coerce` nos
 * números. `autor` aceita um id ou a palavra `me` (o próprio usuário da sessão).
 */
export const sightingListQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    autor: z.union([z.literal('me'), idSchema]).optional(),
    de: isoUtcSchema.optional(),
    ate: isoUtcSchema.optional(),
    sort: z.enum(SIGHTING_SORTS).default('-vistoEm'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((v) => !v.de || !v.ate || v.de <= v.ate, { message: '"de" deve ser anterior a "ate"', path: ['de'] })

// -------------------------------------------------------------------------------- dashboard

export const periodoDoDiaSchema = z.enum(['madrugada', 'manha', 'tarde', 'noite'])

/**
 * Tudo aqui é calculado NO SERVIDOR (o front só desenha). Os "dias" e "períodos do dia" são
 * contados no fuso America/Sao_Paulo — um avistamento às 23h de Florianópolis cai no dia
 * certo, mesmo sendo 02h UTC do dia seguinte.
 */
export const dashboardStatsSchema = z.object({
  total: z.number().int().min(0),
  ultimos7Dias: z.object({
    total: z.number().int().min(0),
    /** 7 dias anteriores a esses, para a seta de variação do StatCard. */
    anterior: z.number().int().min(0),
    /** Variação em % (arredondada); null quando `anterior` é 0 (divisão por zero). */
    variacaoPct: z.number().nullable(),
  }),
  /** Área RF04 ainda "viva": avistamentos com menos de 2 h. */
  ativosAgora: z.number().int().min(0),
  minhaContribuicao: z.object({
    total: z.number().int().min(0),
    /** Fatia do total geral, em % arredondada (0 quando não há avistamentos). */
    percentual: z.number().min(0).max(100),
  }),
  /** Exatamente 30 itens, do mais antigo ao mais recente, incluindo dias com zero. */
  seriePorDia: z
    .array(z.object({ data: z.iso.date(), total: z.number().int().min(0) }))
    .length(30),
  /** Sempre os 4 períodos, nesta ordem, mesmo zerados. */
  porPeriodo: z.array(z.object({ periodo: periodoDoDiaSchema, total: z.number().int().min(0) })).length(4),
  /** Do maior para o menor; no máximo 8 bairros + "Outros" agregando o resto. */
  porBairro: z.array(z.object({ bairro: z.string().min(1), total: z.number().int().min(0) })).max(9),
  /** Até 5 pontos de maior concentração (células de ~500 m), com o bairro como rótulo. */
  topLocais: z
    .array(z.object({ rotulo: z.string().min(1), lat: latSchema, lng: lngSchema, total: z.number().int().min(1) }))
    .max(5),
})

// ------------------------------------------------------------------------------ equipes

/** Código de convite: 6 caracteres, sem 0/O/1/I pra não confundir quem digita. */
export const TEAM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/

export const teamSchema = z.object({
  id: idSchema,
  nome: z.string().min(3).max(40),
  codigo: z.string().regex(TEAM_CODE_REGEX),
  liderId: idSchema,
  membrosCount: z.number().int().min(1),
  createdAt: isoUtcSchema,
})

export const teamCreateSchema = z.strictObject({
  nome: z.string().trim().min(3, 'O nome da equipe precisa de pelo menos 3 caracteres').max(40, 'Máximo de 40 caracteres'),
})

/** Aceita o código com espaços/minúsculas (como a pessoa digitou) e normaliza. */
export const teamJoinSchema = z.strictObject({
  codigo: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
    .refine((v) => TEAM_CODE_REGEX.test(v), 'Código inválido (6 letras/números)'),
})

export const posicaoSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  precisaoM: precisaoSchema,
  em: isoUtcSchema,
})

export const teamMemberSchema = z.object({
  userId: idSchema,
  nome: z.string().min(1),
  papelNaEquipe: z.enum(['lider', 'membro']),
  entrouEm: isoUtcSchema,
  /** Última posição enviada por POST /api/me/location; null se nunca enviou. */
  ultimaPosicao: posicaoSchema.nullable(),
})

// -------------------------------------------------------------------------------- chat

export const MESSAGE_MAX = 500

export const messageSchema = z.object({
  id: idSchema,
  equipeId: idSchema,
  autor: autorResumoSchema,
  /** Texto puro. O front renderiza como texto, NUNCA como HTML. */
  texto: z.string().min(1).max(MESSAGE_MAX),
  createdAt: isoUtcSchema,
  /** Eco do `clientId` enviado no POST — liga a mensagem otimista à confirmada. */
  clientId: z.string().max(64).nullable(),
})

export const messageCreateSchema = z.strictObject({
  texto: z
    .string()
    .trim()
    .min(1, 'Escreva uma mensagem')
    .max(MESSAGE_MAX, `A mensagem pode ter no máximo ${MESSAGE_MAX} caracteres`),
  clientId: z.string().min(1).max(64).optional(),
})

export const messageListQuerySchema = z.object({ since: isoUtcSchema.optional() })

// --------------------------------------------------------------------- locais de emergência

export const emergencyTypeSchema = z.enum(['hospital', 'policia', 'bombeiros', 'defesa_civil', 'abrigo'])

export const emergencyPlaceSchema = z.object({
  id: idSchema,
  nome: z.string().min(1),
  tipo: emergencyTypeSchema,
  lat: latSchema,
  lng: lngSchema,
  endereco: z.string().min(1),
  /** Só dígitos (ex.: "193", "4832510000") — o front formata e monta o link tel:. */
  telefones: z.array(z.object({ rotulo: z.string().min(1), numero: z.string().regex(/^\d{3,13}$/) })).min(1),
  /** Texto livre ("24 horas", "Seg–Sex 8h–18h"). */
  horario: z.string().min(1),
})

// --------------------------------------------------------------------------- localização

export const locationUpdateSchema = z.strictObject({
  lat: latSchema,
  lng: lngSchema,
  precisaoM: precisaoSchema.optional().default(null),
})
