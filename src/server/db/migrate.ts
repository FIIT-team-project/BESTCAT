import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Pool } from 'pg'

import { loadLocalEnv } from '../env.js'
import { createDatabasePool } from './database.js'

type AppliedMigration = {
  filename: string
  checksum: string
}

export async function runMigrations(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const migrationsDirectory = resolve(process.cwd(), 'database/migrations')
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort()
  const appliedResult = await pool.query<AppliedMigration>(
    'SELECT filename, checksum FROM schema_migrations',
  )
  const applied = new Map(appliedResult.rows.map((row) => [row.filename, row.checksum]))

  for (const filename of filenames) {
    const sql = await readFile(resolve(migrationsDirectory, filename), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const existingChecksum = applied.get(filename)
    if (existingChecksum === checksum) continue
    if (existingChecksum) {
      throw new Error(`Migration ${filename} was changed after it was applied.`)
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [filename, checksum],
      )
      await client.query('COMMIT')
      console.log(`Aplikovaná migrácia: ${filename}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

async function main() {
  loadLocalEnv()
  const pool = createDatabasePool()
  try {
    await runMigrations(pool)
    console.log('Databázové migrácie sú aktuálne.')
  } finally {
    await pool.end()
  }
}

const isDirectExecution = process.argv[1]?.endsWith('/db/migrate.ts') || process.argv[1]?.endsWith('/db/migrate.js')
if (isDirectExecution) await main()
