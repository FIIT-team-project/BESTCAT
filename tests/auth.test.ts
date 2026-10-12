import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, type Server } from 'node:http'
import { after, before, test } from 'node:test'

import { createApp } from '../src/server/app.js'
import { MemoryAuthRepository } from './memory-auth-repository.js'

let server: Server
let baseUrl: string

before(async () => {
  const authRepository = await MemoryAuthRepository.create([
    {
      id: 'test-user',
      email: 'admin@bestcat.test',
      password: 'VeryStrongTestPassword!123',
      name: 'Test Admin',
      role: 'Admin',
    },
  ])
  const app = await createApp({
    authRepository,
    sessionSecret: 'test-session-secret-with-more-than-32-characters',
    clientOrigin: 'http://localhost',
    production: false,
    serveClient: false,
  })
  server = createServer(app)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not start.')
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  server.close()
  await once(server, 'close')
})

test('health endpoint is available', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' })
})

test('rejects invalid credentials without setting a session', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bestcat.test', password: 'wrong-password' }),
  })
  assert.equal(response.status, 401)
  assert.equal(response.headers.get('set-cookie'), null)
})

test('creates, reads and removes an authenticated session', async () => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ADMIN@BESTCAT.TEST',
      password: 'VeryStrongTestPassword!123',
      keepSignedIn: true,
    }),
  })
  assert.equal(loginResponse.status, 200)
  const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie?.startsWith('bestcat_session='))
  if (!cookie) throw new Error('Login response did not contain a session cookie.')
  const loginBody = await loginResponse.json() as { user: { email: string; role: string } }
  assert.equal(loginBody.user.email, 'admin@bestcat.test')
  assert.equal(loginBody.user.role, 'Admin')

  const meResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } })
  assert.equal(meResponse.status, 200)

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie },
  })
  assert.equal(logoutResponse.status, 204)

  const expiredResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } })
  assert.equal(expiredResponse.status, 401)
})

test('rejects cross-origin state-changing requests', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { origin: 'https://attacker.example' },
  })
  assert.equal(response.status, 403)
})

test('production refuses to start without a private session secret', async () => {
  const authRepository = await MemoryAuthRepository.create([])
  await assert.rejects(
    createApp({
      authRepository,
      sessionSecret: 'replace-with-at-least-32-random-characters',
      production: true,
      serveClient: false,
    }),
    /SESSION_SECRET/,
  )
})
