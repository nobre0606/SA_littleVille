import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { apiErrorSchema } from 'shared/schemas'
import { criarApp } from './app.js'
import { lerAmbiente } from './lib/env.js'

const app = criarApp({ corsOrigin: 'http://localhost:5173' })

describe('esqueleto da API (Fase B0)', () => {
  it('rota inexistente responde 404 no formato ÚNICO de erro do contrato, com serverTime', async () => {
    const r = await request(app).get('/api/nao-existe')
    expect(r.status).toBe(404)
    expect(apiErrorSchema.safeParse(r.body).success).toBe(true)
    expect(r.body.error.code).toBe('NOT_FOUND')
  })

  it('cabeçalhos: versão do contrato, helmet e sem "X-Powered-By: Express"', async () => {
    const r = await request(app).get('/api/nao-existe')
    expect(r.headers['x-contract-version']).toBe('1.1.0')
    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['x-powered-by']).toBeUndefined()
  })

  it('CORS: só a origem do front, com credenciais', async () => {
    const r = await request(app).get('/api/nao-existe').set('Origin', 'http://localhost:5173')
    expect(r.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(r.headers['access-control-allow-credentials']).toBe('true')
  })

  it('corpo acima de 16 kB → 413 PAYLOAD_TOO_LARGE; JSON quebrado → 400', async () => {
    const grande = await request(app).post('/api/nao-existe').set('Content-Type', 'application/json').send(JSON.stringify({ x: 'a'.repeat(20_000) }))
    expect(grande.status).toBe(413)
    expect(grande.body.error.code).toBe('PAYLOAD_TOO_LARGE')
    const quebrado = await request(app).post('/api/nao-existe').set('Content-Type', 'application/json').send('{"x":')
    expect(quebrado.status).toBe(400)
    expect(quebrado.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('.env: recusa JWT_SECRET curto e aceita a configuração completa', () => {
    const base = { DATABASE_URL: 'postgresql://u:s@localhost:5432/db', JWT_SECRET: 'x'.repeat(40), CORS_ORIGIN: 'http://localhost:5173' }
    expect(lerAmbiente(base).PORT).toBe(3333)
    expect(() => lerAmbiente({ ...base, JWT_SECRET: 'curto' })).toThrow(/32 caracteres/)
    expect(() => lerAmbiente({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/)
  })
})
