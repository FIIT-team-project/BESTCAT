import type { Role } from '../auth.js'
import {
  createPasswordRecord,
  normalizeEmail,
  roles,
  stableUserId,
} from '../auth.js'
import { loadLocalEnv } from '../env.js'
import { createDatabasePool } from './database.js'

function getSeedRole(): Role {
  const value = process.env.AUTH_ROLE ?? 'Admin'
  const role = roles.find((candidate) => candidate === value)
  if (!role) throw new Error(`AUTH_ROLE has unsupported value: ${value}`)
  return role
}

async function main() {
  loadLocalEnv()
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The development seed cannot run in production.')
  }

  const email = normalizeEmail(process.env.AUTH_EMAIL ?? 'admin@bestcat.sk')
  const password = process.env.AUTH_PASSWORD ?? 'Bestcat123!'
  const name = process.env.AUTH_NAME ?? 'Daniel Moore'
  if (password.length < 10) throw new Error('AUTH_PASSWORD must contain at least 10 characters.')

  const role = getSeedRole()
  const passwordRecord = await createPasswordRecord(password)
  const pool = createDatabasePool()
  try {
    await pool.query(
      `INSERT INTO users (id, email, name, role, password_hash, password_salt)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         password_hash = EXCLUDED.password_hash,
         password_salt = EXCLUDED.password_salt,
         updated_at = NOW()`,
      [
        stableUserId(email),
        email,
        name,
        role,
        passwordRecord.passwordHash,
        passwordRecord.passwordSalt,
      ],
    )
    console.log(`DEV používateľ ${email} je pripravený v databáze.`)
  } finally {
    await pool.end()
  }
}

await main()
