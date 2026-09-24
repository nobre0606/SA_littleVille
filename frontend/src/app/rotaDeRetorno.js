/**
 * Rota de retorno: quando a sessão cai (401) no meio do uso, a pessoa vai para o login e,
 * depois de entrar de novo, deve voltar EXATAMENTE para onde estava.
 *
 * O login é congelado e sempre navega para /permissao-localizacao depois de entrar — ele não
 * lê `?voltar=`. Por isso a rota viaja em DOIS lugares:
 *  - na URL do login (`/login?voltar=%2Favistamentos`), para ficar visível e testável;
 *  - no sessionStorage (só desta aba), de onde a tela de permissão a lê e a consome.
 * Não é dado de sessão nem segredo: é só um caminho de tela.
 *
 * Segurança: só aceita caminho INTERNO ("/algo", nunca "//site.com" ou "https://..."), senão
 * um link malicioso com ?voltar= poderia mandar a pessoa para outro site depois do login
 * (redirecionamento aberto).
 */

const CHAVE = 'lv:voltar'
const PROIBIDAS = ['/', '/login', '/permissao-localizacao']

export function rotaSegura(caminho) {
  if (typeof caminho !== 'string' || !caminho.startsWith('/') || caminho.startsWith('//') || caminho.includes('\\')) return null
  const soCaminho = caminho.split(/[?#]/)[0]
  if (PROIBIDAS.includes(soCaminho)) return null
  return caminho
}

/** Monta o destino do login: `/login?expirou=1&voltar=...` (expirou só se já havia sessão). */
export function urlDoLogin({ voltar, expirou }) {
  const p = new URLSearchParams()
  if (expirou) p.set('expirou', '1')
  const seguro = rotaSegura(voltar)
  if (seguro) p.set('voltar', seguro)
  const qs = p.toString()
  return qs ? `/login?${qs}` : '/login'
}

/** `armazenamento` injetável para teste; no app é o sessionStorage (com try: pode estar bloqueado). */
export function guardarRetorno(caminho, armazenamento = globalThis.sessionStorage) {
  const seguro = rotaSegura(caminho)
  try {
    if (seguro) armazenamento?.setItem(CHAVE, seguro)
  } catch {
    /* navegação privada/armazenamento bloqueado: sem retorno, cai no dashboard */
  }
}

/** Lê e APAGA (uso único): voltar uma vez só, nunca "prender" a pessoa numa rota antiga. */
export function consumirRetorno(armazenamento = globalThis.sessionStorage) {
  try {
    const valor = armazenamento?.getItem(CHAVE)
    armazenamento?.removeItem(CHAVE)
    return rotaSegura(valor)
  } catch {
    return null
  }
}

/** Só olha, sem apagar (para a tela avisar "depois voltamos para onde você estava"). */
export function temRetorno(armazenamento = globalThis.sessionStorage) {
  try {
    return rotaSegura(armazenamento?.getItem(CHAVE)) !== null
  } catch {
    return false
  }
}
