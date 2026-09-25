import test from 'node:test'
import assert from 'node:assert/strict'
import { conferirVariaveis, gerarConfig } from './vercel-config.mjs'

/** Simula a escolha de rota da Vercel: a primeira regra que casa (ignorando `continue`). */
function destino(config, caminho, arquivosQueExistem = ['/index.html', '/mockServiceWorker.js']) {
  for (const r of config.routes) {
    if (r.handle === 'filesystem') {
      if (arquivosQueExistem.includes(caminho)) return caminho
      continue
    }
    const m = caminho.match(new RegExp(r.src))
    if (!m || r.continue) continue
    if (r.status) return r.status
    return r.dest.replace('$1', m[1])
  }
  return 404
}

test('modo demonstração (sem API_URL): SPA fallback, /api/* dá 404, arquivos reais servidos', () => {
  const c = gerarConfig({})
  assert.equal(c.version, 3)
  assert.equal(destino(c, '/dashboard'), '/index.html', 'recarregar em /dashboard não dá 404')
  assert.equal(destino(c, '/avistamentos/s_001/editar'), '/index.html')
  assert.equal(destino(c, '/mockServiceWorker.js'), '/mockServiceWorker.js')
  assert.equal(destino(c, '/api/sightings'), 404, 'nunca devolver index.html como resposta da API')
})

test('API real: /api/* vai para API_URL (barra final ignorada), resto continua SPA', () => {
  const c = gerarConfig({ apiUrl: 'https://minha-api.onrender.com/api/' })
  assert.equal(destino(c, '/api/sightings?page=2'), 'https://minha-api.onrender.com/api/sightings?page=2')
  assert.equal(destino(c, '/api/auth/me'), 'https://minha-api.onrender.com/api/auth/me')
  assert.equal(destino(c, '/perfil'), '/index.html')
})

test('assets com hash ganham cache longo sem interromper as outras regras', () => {
  const regra = gerarConfig({}).routes.find((r) => r.src === '^/assets/(.*)$')
  assert.equal(regra.continue, true)
  assert.match(regra.headers['Cache-Control'], /immutable/)
})

test('conferirVariaveis: sem mock exige API_URL https', () => {
  assert.equal(conferirVariaveis({ usarMock: true }), null)
  assert.match(conferirVariaveis({ usarMock: false }), /exige API_URL/)
  assert.match(conferirVariaveis({ usarMock: false, apiUrl: 'http://inseguro.com/api' }), /https/)
  assert.equal(conferirVariaveis({ usarMock: false, apiUrl: 'https://ok.com/api' }), null)
})
