import { ApiError } from './ApiError.js'

/**
 * Implementação real — chama as rotas da Fase 5. `credentials: 'include'` manda o cookie
 * httpOnly de volta em toda chamada (é assim que a sessão viaja; o token NUNCA aparece no
 * corpo da resposta nem é lido pelo front, ver RNF05 do brief).
 */
const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, { method = 'POST', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor', { status: 0 })
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* corpo vazio (ex.: 204 do logout) é esperado em alguns casos */
  }
  if (!res.ok) {
    throw new ApiError(data?.message ?? 'Erro inesperado', { status: res.status, fieldErrors: data?.fieldErrors ?? {} })
  }
  return data
}

export const login = (payload) => request('/auth/login', { body: payload })
export const register = (payload) => request('/auth/register', { body: payload })
export const logout = () => request('/auth/logout', { method: 'POST' })
export const me = () => request('/auth/me', { method: 'GET' })
