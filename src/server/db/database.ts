import { Pool, type PoolConfig } from 'pg'

function getSslConfiguration(value: string | undefined): PoolConfig['ssl'] {
  const mode = value ?? 'disable'
  if (mode === 'disable') return false
  if (mode === 'require') return { rejectUnauthorized: false }
  if (mode === 'verify-full') return { rejectUnauthorized: true }
  throw new Error('DATABASE_SSL must be disable, require, or verify-full.')
}

export function getDatabaseUrl() {
  const configuredUrl = process.env.DATABASE_URL
  if (configuredUrl) return configuredUrl
  throw new Error('DATABASE_URL must be configured.')
}

export function createDatabasePool() {
  const configuredPoolSize = Number(process.env.DATABASE_POOL_SIZE ?? 10)
  const max = Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
    ? configuredPoolSize
    : 10

  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: getSslConfiguration(process.env.DATABASE_SSL),
    max,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  })

  pool.on('error', (error) => {
    console.error('Neočakávaná chyba nečinného databázového spojenia:', error)
  })

  return pool
}

export async function assertDatabaseConnection(pool: Pool) {
  await pool.query('SELECT 1')
}
