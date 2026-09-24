import { api } from './client.js'

/**
 * Uma função por rota do contrato (docs/API-CONTRACT.md §10). É a única "cara" da API que as
 * telas enxergam: elas nunca montam URL nem chamam `api.get` direto. Mudou o contrato? Muda
 * aqui (e no schema), e o teste de contrato acusa se o mock ficou para trás.
 *
 * Todas devolvem o envelope inteiro ({ data, serverTime } ou { data, page, serverTime }).
 */

const id = (v) => encodeURIComponent(v)

export const sessao = {
  obter: (opts) => api.get('/auth/me', opts),
  sair: () => api.post('/auth/logout'),
  entrar: (credenciais) => api.post('/auth/login', credenciais),
  cadastrar: (dados) => api.post('/auth/register', dados),
}

export const avistamentos = {
  /** filtros: { q, autor, de, ate, sort, page, pageSize } — a filtragem é feita PELO SERVIDOR. */
  listar: (filtros, opts) => api.get('/sightings', { ...opts, query: filtros }),
  obter: (sid, opts) => api.get(`/sightings/${id(sid)}`, opts),
  criar: (dados) => api.post('/sightings', dados),
  atualizar: (sid, dados) => api.put(`/sightings/${id(sid)}`, dados),
  excluir: (sid) => api.delete(`/sightings/${id(sid)}`),
  restaurar: (sid) => api.post(`/sightings/${id(sid)}/restore`),
}

export const dashboard = {
  estatisticas: (opts) => api.get('/dashboard/stats', opts),
}

export const equipes = {
  minhas: (opts) => api.get('/teams', opts),
  criar: (dados) => api.post('/teams', dados),
  entrar: (codigo) => api.post('/teams/join', { codigo }),
  sair: (tid) => api.post(`/teams/${id(tid)}/leave`),
  membros: (tid, opts) => api.get(`/teams/${id(tid)}/members`, opts),
  mensagens: (tid, since, opts) => api.get(`/teams/${id(tid)}/messages`, { ...opts, query: { since } }),
  enviarMensagem: (tid, dados) => api.post(`/teams/${id(tid)}/messages`, dados),
}

export const emergencia = {
  locais: (opts) => api.get('/emergency-places', opts),
}

export const localizacao = {
  enviar: (posicao) => api.post('/me/location', posicao),
}
