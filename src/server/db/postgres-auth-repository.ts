import type { Pool } from 'pg'

import type { AuthRepository, Role, StoredUser } from '../auth.js'

type UserRow = {
  id: string
  email: string
  name: string
  role: Role
  password_hash: Buffer
  password_salt: Buffer
}

function toStoredUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
  }
}

export class PostgresAuthRepository implements AuthRepository {
  readonly #pool: Pool

  constructor(pool: Pool) {
    this.#pool = pool
  }

  async findUserByEmail(email: string) {
    const result = await this.#pool.query<UserRow>(
      `SELECT id, email, name, role, password_hash, password_salt
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    )
    return result.rows[0] ? toStoredUser(result.rows[0]) : null
  }

  async findUserBySession(tokenHash: string) {
    const result = await this.#pool.query<UserRow>(
      `SELECT u.id, u.email, u.name, u.role, u.password_hash, u.password_salt
       FROM auth_sessions AS session
       INNER JOIN users AS u ON u.id = session.user_id
       WHERE session.token_hash = $1 AND session.expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    )
    return result.rows[0] ? toStoredUser(result.rows[0]) : null
  }

  async createSession(tokenHash: string, userId: string, expiresAt: Date) {
    await this.#pool.query(
      `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [tokenHash, userId, expiresAt],
    )
  }

  async deleteSession(tokenHash: string) {
    await this.#pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash])
  }

  async deleteExpiredSessions() {
    await this.#pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()')
  }

  async ping() {
    await this.#pool.query('SELECT 1')
  }
}
