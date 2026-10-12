import {
  createPasswordRecord,
  normalizeEmail,
  type AuthRepository,
  type Role,
  type StoredUser,
} from '../src/server/auth.js'

type Credential = {
  id: string
  email: string
  password: string
  name: string
  role: Role
}

type Session = {
  userId: string
  expiresAt: Date
}

export class MemoryAuthRepository implements AuthRepository {
  readonly #users: StoredUser[]
  readonly #sessions = new Map<string, Session>()

  private constructor(users: StoredUser[]) {
    this.#users = users
  }

  static async create(credentials: Credential[]) {
    const users = await Promise.all(credentials.map(async ({ password, ...user }) => ({
      ...user,
      email: normalizeEmail(user.email),
      ...await createPasswordRecord(password),
    })))
    return new MemoryAuthRepository(users)
  }

  async findUserByEmail(email: string) {
    return this.#users.find((user) => user.email === email) ?? null
  }

  async findUserBySession(tokenHash: string) {
    const session = this.#sessions.get(tokenHash)
    if (!session || session.expiresAt <= new Date()) return null
    return this.#users.find((user) => user.id === session.userId) ?? null
  }

  async createSession(tokenHash: string, userId: string, expiresAt: Date) {
    this.#sessions.set(tokenHash, { userId, expiresAt })
  }

  async deleteSession(tokenHash: string) {
    this.#sessions.delete(tokenHash)
  }

  async deleteExpiredSessions() {
    const now = new Date()
    for (const [tokenHash, session] of this.#sessions) {
      if (session.expiresAt <= now) this.#sessions.delete(tokenHash)
    }
  }

  async ping() {}
}
