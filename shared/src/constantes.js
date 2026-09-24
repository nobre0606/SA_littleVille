/**
 * Constantes do contrato SEM dependência do zod.
 *
 * POR QUE um arquivo separado: o api/client.js (que carrega em toda tela) só precisa da versão
 * do contrato e da tabela de erros. Se importasse de schemas.js, levaria o zod inteiro (~25 kB
 * gzip) para a entrada inicial do app. schemas.js reexporta tudo daqui, então quem já importa
 * de 'shared/schemas' não muda nada.
 */

export const CONTRACT_VERSION = '1.1.0'

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

/**
 * Lista FIXA de bairros de Florianópolis. O usuário escolhe o bairro no formulário — o
 * servidor não deduz pelas coordenadas, porque geocodificação reversa seria uma dependência
 * externa que o projeto não adotou. Mudar esta lista é mudança de contrato (sobe a versão).
 * "Outros" NÃO está aqui de propósito: é só o agrupamento do dashboard, nunca uma escolha.
 */
export const BAIRROS = [
  'Abraão', 'Agronômica', 'Armação', 'Balneário', 'Barra da Lagoa', 'Cachoeira do Bom Jesus',
  'Cacupé', 'Campeche', 'Canasvieiras', 'Canto', 'Capoeiras', 'Carianos', 'Carvoeira', 'Centro',
  'Coloninha', 'Coqueiros', 'Córrego Grande', 'Costeira do Pirajubaé', 'Daniela', 'Estreito',
  'Ingleses', 'Itacorubi', 'Itaguaçu', 'Jardim Atlântico', 'João Paulo', 'Joaquina', 'Jurerê',
  'Lagoa da Conceição', 'Monte Cristo', 'Monte Verde', 'Morro das Pedras', 'Pantanal',
  'Pântano do Sul', 'Ponta das Canas', 'Ratones', 'Ribeirão da Ilha', 'Rio Tavares',
  'Rio Vermelho', 'Saco dos Limões', 'Saco Grande', 'Sambaqui', 'Santa Mônica', 'Santinho',
  'Santo Antônio de Lisboa', 'Tapera', 'Trindade', 'Vargem Grande', 'Vargem Pequena',
]

export const BAIRRO_OUTROS = 'Outros'

export const SIGHTING_SORTS = ['-vistoEm', 'vistoEm', 'bairro', '-bairro', 'autor', '-autor']

/** Código de convite: 6 caracteres, sem 0/O/1/I pra não confundir quem digita. */
export const TEAM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/

export const MESSAGE_MAX = 500
