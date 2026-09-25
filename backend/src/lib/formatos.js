/**
 * Banco → formato do contrato. Toda saída da API passa por aqui, então o banco pode ter os
 * nomes dele (latitude, papel USER/ADMIN, enums em MAIÚSCULAS) e o contrato continua com os
 * nomes dele (lat, "usuario"/"admin", "gps"). Datas sempre em ISO UTC.
 */
const iso = (d) => (d ? new Date(d).toISOString() : null)

export const papelDaApi = (papel) => (papel === 'ADMIN' ? 'admin' : 'usuario')

/** User (contrato §3). `u` precisa vir com CAMPOS_PUBLICOS (sessao.js). */
export function usuarioPublico(u) {
  return { id: u.id, nome: u.nome, email: u.email, papel: papelDaApi(u.papel), equipeId: u.membroDe?.teamId ?? null, createdAt: iso(u.createdAt) }
}

export const sessaoPublica = (u, expiraEm) => ({ user: usuarioPublico(u), expiraEm: iso(expiraEm) })

/**
 * Sighting (contrato §4). `acoes` é calculado AQUI, no servidor, para quem está pedindo
 * (contrato §1.8): o front só esconde botões; a regra de verdade é esta (e o 403 nas rotas).
 */
export function avistamentoPublico(s, quem) {
  const ehAutor = s.autorId === quem.id
  return {
    id: s.id,
    autor: { id: s.autor.id, nome: s.autor.nome },
    descricao: s.descricao,
    lat: s.latitude,
    lng: s.longitude,
    origemLocal: s.origemLocal === 'GPS' ? 'gps' : 'manual',
    precisaoM: s.precisaoM,
    bairro: s.bairro,
    vistoEm: iso(s.vistoEm),
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
    deletedAt: iso(s.deletedAt),
    acoes: { podeEditar: ehAutor, podeExcluir: ehAutor || quem.papel === 'ADMIN' },
  }
}

export function equipePublica(t, membrosCount) {
  return { id: t.id, nome: t.nome, codigo: t.codigo, liderId: t.liderId, membrosCount, createdAt: iso(t.createdAt) }
}

export function membroPublico(m, liderId) {
  const u = m.user
  return {
    userId: u.id,
    nome: u.nome,
    papelNaEquipe: u.id === liderId ? 'lider' : 'membro',
    entrouEm: iso(m.entrouEm),
    ultimaPosicao: u.posicaoEm ? { lat: u.posicaoLat, lng: u.posicaoLng, precisaoM: u.posicaoPrecisaoM, em: iso(u.posicaoEm) } : null,
  }
}

export function mensagemPublica(m) {
  return { id: m.id, equipeId: m.teamId, autor: { id: m.autor.id, nome: m.autor.nome }, texto: m.texto, createdAt: iso(m.createdAt), clientId: m.clientId }
}

export function localPublico(l) {
  return { id: l.id, nome: l.nome, tipo: l.tipo.toLowerCase(), lat: l.latitude, lng: l.longitude, endereco: l.endereco, telefones: l.telefones, horario: l.horario }
}
