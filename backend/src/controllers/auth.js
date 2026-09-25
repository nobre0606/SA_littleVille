import bcrypt from 'bcryptjs'
import { loginSchema, registerSchema } from 'shared/schemas'
import { prisma } from '../lib/prisma.js'
import { ErroApi, ok, serverTime } from '../lib/resposta.js'
import { CAMPOS_PUBLICOS, abrirSessao, encerrarSessao } from '../lib/sessao.js'
import { sessaoPublica } from '../lib/formatos.js'
import { validar } from '../lib/validar.js'
import { ERROR_CODES } from 'shared/constantes'

const CUSTO_BCRYPT = 12 // ~250 ms por hash: lento de propósito, para força bruta ficar cara

// Hash de uma senha qualquer, calculado uma vez. Usado quando o e-mail NÃO existe: fazemos o
// bcrypt.compare mesmo assim, para a resposta demorar o mesmo tanto — senão o tempo de
// resposta revelaria quais e-mails têm conta.
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe', CUSTO_BCRYPT)

export function criarAuth({ jwtSecret, producao }) {
  return {
    async cadastrar(req, res) {
      const dados = validar(registerSchema, req.body) // já normaliza e-mail, CPF, telefone, CEP
      const [porEmail, porCpf] = await Promise.all([
        prisma.user.findUnique({ where: { email: dados.email }, select: { id: true } }),
        prisma.user.findUnique({ where: { cpf: dados.cpf }, select: { id: true } }),
      ])
      if (porEmail || porCpf) {
        const fields = {}
        if (porEmail) fields.email = 'Este e-mail já está cadastrado'
        if (porCpf) fields.cpf = 'Este CPF já está cadastrado'
        throw new ErroApi(porEmail ? 'EMAIL_TAKEN' : 'CPF_TAKEN', 'Dados já cadastrados.', fields)
      }
      let usuario
      try {
        usuario = await prisma.user.create({
          data: {
            nome: dados.nome,
            email: dados.email,
            senhaHash: await bcrypt.hash(dados.senha, CUSTO_BCRYPT),
            cpf: dados.cpf,
            telefone: dados.telefone,
            cep: dados.cep,
            numero: dados.numero,
            rua: dados.rua,
            bairro: dados.bairro,
            consentimentoLgpdEm: new Date(),
          },
          select: CAMPOS_PUBLICOS,
        })
      } catch (e) {
        // Dois cadastros iguais ao mesmo tempo: o índice único do banco é quem desempata.
        if (e.code === 'P2002') throw new ErroApi('EMAIL_TAKEN', 'Dados já cadastrados.', { email: 'Este e-mail ou CPF já está cadastrado' })
        throw e
      }
      const expiraEm = abrirSessao(res, usuario, { jwtSecret, producao })
      return ok(res, sessaoPublica(usuario, expiraEm), { status: 201 })
    },

    async entrar(req, res) {
      const { email, senha } = validar(loginSchema, req.body)
      const conta = await prisma.user.findUnique({ where: { email }, select: { ...CAMPOS_PUBLICOS, senhaHash: true } })
      const confere = await bcrypt.compare(senha, conta?.senhaHash ?? HASH_FALSO)
      // Mensagem GENÉRICA: nunca diz se foi o e-mail ou a senha que errou.
      if (!conta || !confere) throw new ErroApi('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.')
      const { senhaHash: _, ...usuario } = conta
      const expiraEm = abrirSessao(res, usuario, { jwtSecret, producao })
      return ok(res, sessaoPublica(usuario, expiraEm))
    },

    // Idempotente (contrato §3): sem sessão também responde 200.
    sair(_req, res) {
      encerrarSessao(res, { producao })
      return ok(res, { ok: true })
    },

    eu(req, res) {
      return ok(res, sessaoPublica(req.usuario, req.expiraEm))
    },
  }
}

/**
 * COMPATIBILIDADE COM A TELA CONGELADA (DECISOES D23): a tela de login/cadastro do front não
 * pode mudar e lê os erros no formato antigo `{ message, fieldErrors }`. Só nas rotas
 * /auth/login e /auth/register, o erro sai no formato do contrato E, no topo, esses dois
 * campos a mais. Nada do contrato muda: quem lê `error` continua funcionando.
 */
export function respostaDeErroAuth(res, code, message, fields) {
  return res.status(ERROR_CODES[code] ?? 500).json({
    error: { code, message, ...(fields ? { fields } : {}) },
    message,
    fieldErrors: fields ?? {},
    serverTime: serverTime(),
  })
}

export function tratarErrosAuth({ producao }) {
  return (e, _req, res, next) => {
    if (e instanceof ErroApi) return respostaDeErroAuth(res, e.code, e.message, e.fields)
    if (e?.type === 'entity.too.large') return respostaDeErroAuth(res, 'PAYLOAD_TOO_LARGE', 'O conteúdo enviado é grande demais.')
    if (e?.type === 'entity.parse.failed') return respostaDeErroAuth(res, 'VALIDATION_ERROR', 'Corpo da requisição não é um JSON válido.')
    if (producao) return respostaDeErroAuth(res, 'INTERNAL_ERROR', 'Algo deu errado no servidor. Tente de novo.')
    return next(e)
  }
}
