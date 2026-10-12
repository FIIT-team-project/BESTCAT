import { createApp } from './app.js'
import { assertDatabaseConnection, createDatabasePool } from './db/database.js'
import { PostgresAuthRepository } from './db/postgres-auth-repository.js'
import { loadLocalEnv } from './env.js'

loadLocalEnv()

const port = Number(process.env.PORT ?? 3000)
const pool = createDatabasePool()
await assertDatabaseConnection(pool)
const app = await createApp({
  authRepository: new PostgresAuthRepository(pool),
  serveClient: process.env.NODE_ENV === 'production',
})

const server = app.listen(port, () => {
  console.log(`BESTCAT API beží na http://localhost:${port}`)
})

async function shutdown() {
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
