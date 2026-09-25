/**
 * Rotas do deploy na Vercel (Build Output API v3), geradas NO BUILD a partir de variáveis de
 * ambiente.
 *
 * POR QUE não escrever as rotas direto no vercel.json: o vercel.json é um arquivo fixo e NÃO
 * lê variáveis de ambiente — o destino do rewrite de /api/* teria que ficar escrito no
 * repositório. Gerando aqui, trocar do mock para a API real é só mudar variáveis na Vercel.
 *
 * Ordem das rotas (a primeira que casar vence):
 *  1. /api/*   → API_URL (só se definida). Proxy da Vercel: para o navegador é o MESMO domínio,
 *              então o cookie de sessão (httpOnly, SameSite=Lax) funciona sem CORS.
 *  2. /assets/* → cache de 1 ano (os nomes têm hash: mudou o arquivo, mudou o nome).
 *  3. arquivos que existem de verdade (index.html, favicon, mockServiceWorker.js...).
 *  4. /api/* sem API_URL → 404 (nunca devolver o index.html no lugar de uma resposta da API).
 *  5. qualquer outra rota → index.html (SPA: recarregar em /dashboard não dá 404).
 */
export function gerarConfig({ apiUrl } = {}) {
  const base = (apiUrl ?? '').trim().replace(/\/+$/, '')
  const rotas = []
  if (base) rotas.push({ src: '^/api/(.*)$', dest: `${base}/$1` })
  rotas.push({ src: '^/assets/(.*)$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true })
  rotas.push({ handle: 'filesystem' })
  rotas.push({ src: '^/api/(.*)$', status: 404 })
  rotas.push({ src: '^/(.*)$', dest: '/index.html' })
  return { version: 3, routes: rotas }
}

/**
 * Confere a combinação de variáveis antes de publicar. Sem mock e sem API_URL, o app no ar não
 * teria com quem falar: melhor o build falhar com uma mensagem clara do que publicar quebrado.
 */
export function conferirVariaveis({ usarMock, apiUrl }) {
  if (!usarMock && !(apiUrl ?? '').trim()) {
    return 'VITE_USE_MOCK=false exige API_URL (ex.: https://minha-api.onrender.com/api). Para publicar em modo demonstração, use VITE_USE_MOCK=true.'
  }
  if (apiUrl && !/^https:\/\//.test(apiUrl.trim())) return 'API_URL precisa começar com https://'
  return null
}
