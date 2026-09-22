/**
 * Fachada da API de autenticação. É a ÚNICA coisa que os componentes importam — nunca
 * `mockApi.js`/`realApi.js` diretamente — então trocar de mock pra real (quando a Fase 5
 * estiver no ar) não muda uma linha de componente, só a env var.
 *
 * `VITE_USE_MOCK=true` (frontend/.env, veja .env.example): usa o mock, com latência simulada
 * e cenários determinísticos (ver mockApi.js). Qualquer outro valor (ou ausente): chama as
 * rotas reais da Fase 5.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const impl = USE_MOCK ? import('./mockApi.js') : import('./realApi.js')

export const login = async (payload) => (await impl).login(payload)
export const register = async (payload) => (await impl).register(payload)
export const logout = async () => (await impl).logout()
export const me = async () => (await impl).me()

export { ApiError } from './ApiError.js'
