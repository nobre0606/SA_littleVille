import { TEAM_CODE_REGEX } from 'shared/schemas'
import { gerarInicial, USUARIO_DEMO_ID } from './seed.js'
import { calcularEstatisticas } from './estatisticas.js'

/**
 * SERVIDOR SIMULADO — as regras de negócio do contrato, executadas no navegador.
 *
 * Isto NÃO é código do app: é o papel que a API real vai cumprir. Por isso aqui (e só aqui,
 * em src/mocks/) é permitido filtrar, paginar, calcular permissões e estatísticas — ver
 * docs/DECISOES.md. Nenhum arquivo fora de src/mocks/ importa isto (regra do ESLint).
 *
 * Estado em MEMÓRIA: criar/editar/excluir aparece na hora em lista, mapa e dashboard, e
 * recarregar a página volta tudo ao estado inicial (esperado, é um mock).
 *
 * Operações lançam `ErroMock` com os códigos do contrato; os handlers do MSW o convertem no
 * JSON de erro padrão.
 */

export class ErroMock extends Error {
  constructor(code, message, fields) {
    super(message)
    this.code = code
    this.fields = fields
  }
}

const RESTAURACAO_MS = 30 * 1000 // contrato §1.7
const INTERVALO_MENSAGEM_MS = 1000 // RN08: 1 envio por segundo
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O/1/I

/** Minúsculas e sem acento: "Conceição" encontra "conceicao". */
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function criarBanco({ agora = () => Date.now(), exemplo = false } = {}) {
  let s = gerarInicial(agora(), { exemplo })
  let seq = 1000
  const novoId = (prefixo) => `${prefixo}_${++seq}`
  const iso = () => new Date(agora()).toISOString()
  const ultimaMensagem = new Map() // userId → ms do último envio (trava de 1/s)

  const usuario = (uid) => s.usuarios.find((u) => u.id === uid)
  const membroDe = (uid) => s.membros.find((m) => m.userId === uid)
  const equipe = (tid) => s.equipes.find((e) => e.id === tid)

  // -------------------------------------------------------------------------- usuários

  function usuarioPublico(u) {
    return { id: u.id, nome: u.nome, email: u.email, papel: u.papel, equipeId: membroDe(u.id)?.equipeId ?? null, createdAt: u.createdAt }
  }

  function autenticar(email, senha) {
    const u = s.usuarios.find((x) => x.email === email)
    // Mensagem genérica de propósito: nunca revela se o e-mail existe.
    if (!u || u.senha !== senha) throw new ErroMock('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.')
    return u
  }

  function registrar(dados) {
    const fields = {}
    if (s.usuarios.some((u) => u.email === dados.email)) fields.email = 'Este e-mail já está cadastrado'
    if (s.usuarios.some((u) => u.cpf === dados.cpf)) fields.cpf = 'Este CPF já está cadastrado'
    if (fields.email) throw new ErroMock('EMAIL_TAKEN', 'Dados já cadastrados.', fields)
    if (fields.cpf) throw new ErroMock('CPF_TAKEN', 'Dados já cadastrados.', fields)
    const u = { id: novoId('u'), nome: dados.nome, email: dados.email, senha: dados.senha, cpf: dados.cpf, papel: 'usuario', createdAt: iso() }
    s.usuarios.push(u)
    return u
  }

  // ---------------------------------------------------------------------- avistamentos

  /** Formato do contrato + `acoes` calculadas para QUEM está pedindo (contrato §1.8). */
  function avistamentoPublico(a, quem) {
    const autor = usuario(a.autorId)
    const ehAutor = quem.id === a.autorId
    return {
      id: a.id,
      autor: { id: autor.id, nome: autor.nome },
      descricao: a.descricao,
      lat: a.lat,
      lng: a.lng,
      origemLocal: a.origemLocal,
      precisaoM: a.precisaoM,
      bairro: a.bairro,
      vistoEm: a.vistoEm,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      deletedAt: a.deletedAt,
      acoes: { podeEditar: ehAutor, podeExcluir: ehAutor || quem.papel === 'admin' },
    }
  }

  const ativos = () => s.avistamentos.filter((a) => !a.deletedAt)

  function buscarAtivo(sid) {
    const a = s.avistamentos.find((x) => x.id === sid && !x.deletedAt)
    if (!a) throw new ErroMock('NOT_FOUND', 'Avistamento não encontrado.')
    return a
  }

  const ORDENACOES = {
    vistoEm: (a) => a.vistoEm,
    bairro: (a) => normalizar(a.bairro),
    autor: (a) => normalizar(usuario(a.autorId).nome),
  }

  function listarAvistamentos(f, quem) {
    let lista = ativos()
    if (f.autor) {
      const autorId = f.autor === 'me' ? quem.id : f.autor
      lista = lista.filter((a) => a.autorId === autorId)
    }
    if (f.de) lista = lista.filter((a) => a.vistoEm >= f.de)
    if (f.ate) lista = lista.filter((a) => a.vistoEm <= f.ate)
    if (f.q) {
      const termo = normalizar(f.q)
      lista = lista.filter((a) => [a.descricao, a.bairro, usuario(a.autorId).nome].some((c) => normalizar(c).includes(termo)))
    }
    const desc = f.sort.startsWith('-')
    const chave = ORDENACOES[f.sort.replace('-', '')]
    lista = [...lista].sort((x, y) => {
      const cx = chave(x)
      const cy = chave(y)
      const base = cx < cy ? -1 : cx > cy ? 1 : 0
      // Desempate sempre pelo mais recente (contrato §4).
      return (desc ? -base : base) || (y.vistoEm < x.vistoEm ? -1 : y.vistoEm > x.vistoEm ? 1 : 0)
    })
    const total = lista.length
    const inicio = (f.page - 1) * f.pageSize
    return {
      itens: lista.slice(inicio, inicio + f.pageSize).map((a) => avistamentoPublico(a, quem)),
      page: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.ceil(total / f.pageSize) },
    }
  }

  function criarAvistamento(dados, quem) {
    const agoraIso = iso() // hora AUTOMÁTICA: a do servidor, nunca do cliente (RN02)
    const a = { id: novoId('s'), autorId: quem.id, ...dados, vistoEm: agoraIso, createdAt: agoraIso, updatedAt: agoraIso, deletedAt: null, excluidoPor: null }
    s.avistamentos.push(a)
    return avistamentoPublico(a, quem)
  }

  function atualizarAvistamento(sid, dados, quem) {
    const a = buscarAtivo(sid)
    // Só o autor edita — nem o admin edita o de outra pessoa (contrato §1.8).
    if (a.autorId !== quem.id) throw new ErroMock('FORBIDDEN', 'Só quem registrou pode editar este avistamento.')
    Object.assign(a, dados, { updatedAt: iso() }) // vistoEm/autor/createdAt não mudam
    return avistamentoPublico(a, quem)
  }

  function excluirAvistamento(sid, quem) {
    const a = buscarAtivo(sid)
    if (a.autorId !== quem.id && quem.papel !== 'admin') {
      throw new ErroMock('FORBIDDEN', 'Você só pode excluir os seus próprios avistamentos.')
    }
    // Exclusão LÓGICA: marca a data, não apaga (contrato §1.7).
    a.deletedAt = iso()
    a.excluidoPor = quem.id
    return avistamentoPublico(a, quem)
  }

  function restaurarAvistamento(sid, quem) {
    const a = s.avistamentos.find((x) => x.id === sid && x.deletedAt)
    if (!a) throw new ErroMock('NOT_FOUND', 'Avistamento não encontrado.')
    if (a.excluidoPor !== quem.id) throw new ErroMock('FORBIDDEN', 'Só quem excluiu pode desfazer.')
    if (agora() - Date.parse(a.deletedAt) > RESTAURACAO_MS) {
      throw new ErroMock('RESTORE_WINDOW_EXPIRED', 'Não foi possível desfazer: o tempo acabou.')
    }
    a.deletedAt = null
    a.excluidoPor = null
    return avistamentoPublico(a, quem)
  }

  // --------------------------------------------------------------------------- equipes

  function equipePublica(e) {
    return { ...e, membrosCount: s.membros.filter((m) => m.equipeId === e.id).length }
  }

  function exigirMembro(tid, quem) {
    if (!equipe(tid)) throw new ErroMock('NOT_FOUND', 'Equipe não encontrada.')
    if (membroDe(quem.id)?.equipeId !== tid) throw new ErroMock('NOT_IN_TEAM', 'Você não faz parte desta equipe.')
  }

  function gerarCodigo() {
    let codigo
    do {
      codigo = Array.from({ length: 6 }, () => ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)]).join('')
    } while (!TEAM_CODE_REGEX.test(codigo) || s.equipes.some((e) => e.codigo === codigo))
    return codigo
  }

  function exigirSemEquipe(quem) {
    if (membroDe(quem.id)) throw new ErroMock('ALREADY_IN_TEAM', 'Você já está em uma equipe. Saia dela antes.')
  }

  function criarEquipe({ nome }, quem) {
    exigirSemEquipe(quem) // RN05: uma equipe por vez
    const e = { id: novoId('t'), nome, codigo: gerarCodigo(), liderId: quem.id, createdAt: iso() }
    s.equipes.push(e)
    s.membros.push({ equipeId: e.id, userId: quem.id, entrouEm: iso() })
    return equipePublica(e)
  }

  function entrarEquipe({ codigo }, quem) {
    exigirSemEquipe(quem)
    const e = s.equipes.find((x) => x.codigo === codigo)
    if (!e) throw new ErroMock('TEAM_CODE_NOT_FOUND', 'Nenhuma equipe com esse código.', { codigo: 'Nenhuma equipe com esse código' })
    s.membros.push({ equipeId: e.id, userId: quem.id, entrouEm: iso() })
    return equipePublica(e)
  }

  function sairEquipe(tid, quem) {
    exigirMembro(tid, quem)
    s.membros = s.membros.filter((m) => m.userId !== quem.id)
    const restantes = s.membros.filter((m) => m.equipeId === tid).sort((a, b) => (a.entrouEm < b.entrouEm ? -1 : 1))
    const e = equipe(tid)
    if (restantes.length === 0) {
      // Último membro saiu: a equipe é encerrada e o código deixa de valer.
      s.equipes = s.equipes.filter((x) => x.id !== tid)
      s.mensagens = s.mensagens.filter((m) => m.equipeId !== tid)
    } else if (e.liderId === quem.id) {
      e.liderId = restantes[0].userId // liderança passa ao membro mais antigo
    }
  }

  function membros(tid, quem) {
    exigirMembro(tid, quem)
    const e = equipe(tid)
    return s.membros
      .filter((m) => m.equipeId === tid)
      .map((m) => ({
        userId: m.userId,
        nome: usuario(m.userId).nome,
        papelNaEquipe: m.userId === e.liderId ? 'lider' : 'membro',
        entrouEm: m.entrouEm,
        ultimaPosicao: s.posicoes[m.userId] ?? null,
      }))
      .sort((a, b) => (a.papelNaEquipe === 'lider' ? -1 : b.papelNaEquipe === 'lider' ? 1 : a.entrouEm < b.entrouEm ? -1 : 1))
  }

  // ------------------------------------------------------------------------------ chat

  function mensagemPublica(m) {
    const autor = usuario(m.autorId)
    return { id: m.id, equipeId: m.equipeId, autor: { id: autor.id, nome: autor.nome }, texto: m.texto, createdAt: m.createdAt, clientId: m.clientId }
  }

  function listarMensagens(tid, since, quem) {
    exigirMembro(tid, quem)
    const daEquipe = s.mensagens.filter((m) => m.equipeId === tid)
    const lista = since ? daEquipe.filter((m) => m.createdAt > since).slice(0, 100) : daEquipe.slice(-50)
    return lista.map(mensagemPublica)
  }

  function enviarMensagem(tid, { texto, clientId }, quem) {
    exigirMembro(tid, quem)
    const ultima = ultimaMensagem.get(quem.id) ?? 0
    if (agora() - ultima < INTERVALO_MENSAGEM_MS) throw new ErroMock('RATE_LIMITED', 'Aguarde um instante antes de enviar outra mensagem.')
    ultimaMensagem.set(quem.id, agora())
    const m = { id: novoId('m'), equipeId: tid, autorId: quem.id, texto, createdAt: iso(), clientId: clientId ?? null }
    s.mensagens.push(m)
    return mensagemPublica(m)
  }

  // ------------------------------------------------------------------------ interface

  return {
    usuario,
    usuarioPublico,
    autenticar,
    registrar,
    listarAvistamentos,
    obterAvistamento: (sid, quem) => avistamentoPublico(buscarAtivo(sid), quem),
    criarAvistamento,
    atualizarAvistamento,
    excluirAvistamento,
    restaurarAvistamento,
    estatisticas: (quem) => calcularEstatisticas(ativos(), quem.id, agora()),
    minhasEquipes: (quem) => {
      const m = membroDe(quem.id)
      return m ? [equipePublica(equipe(m.equipeId))] : []
    },
    criarEquipe,
    entrarEquipe,
    sairEquipe,
    membros,
    listarMensagens,
    enviarMensagem,
    locais: () => s.locais,
    registrarPosicao: (dados, quem) => {
      s.posicoes[quem.id] = { ...dados, em: iso() }
    },
    /** Cenário "sem equipe" do painel de debug: tira a usuária da equipe. */
    removerDaEquipe: (uid) => {
      const m = membroDe(uid)
      if (m) sairEquipe(m.equipeId, usuario(uid))
    },
    definirPapel: (uid, papel) => {
      usuario(uid).papel = papel
    },
    reiniciar: () => {
      s = gerarInicial(agora(), { exemplo })
      ultimaMensagem.clear()
    },
    agora,
  }
}

export { USUARIO_DEMO_ID }
