import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const HASH_LENGTH = 64

export const roles = [
  'Admin',
  'Judge',
  'Steward',
  'Chief Steward',
  'Exhibitor',
  'Club / Editor',
] as const

export type Role = (typeof roles)[number]

export type PublicUser = {
  id: string
  email: string
  name: string
  role: Role
}

export type StoredUser = PublicUser & {
  passwordHash: Buffer
  passwordSalt: Buffer
}

export type PasswordRecord = {
  passwordHash: Buffer
  passwordSalt: Buffer
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<StoredUser | null>
  findUserBySession(tokenHash: string): Promise<StoredUser | null>
  createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>
  deleteSession(tokenHash: string): Promise<void>
  deleteExpiredSessions(): Promise<void>
  ping(): Promise<void>
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US')
}

async function derivePasswordHash(password: string, salt: Buffer) {
  return (await scrypt(password, salt, HASH_LENGTH)) as Buffer
}

export async function createPasswordRecord(password: string): Promise<PasswordRecord> {
  const passwordSalt = randomBytes(16)
  return {
    passwordSalt,
    passwordHash: await derivePasswordHash(password, passwordSalt),
  }
}

function tokenKey(token: string, secret: string) {
  return createHmac('sha256', secret).update(token).digest('base64url')
}

export class AuthService {
  readonly #repository: AuthRepository
  readonly #secret: string
  readonly #dummyHash: Buffer
  readonly #dummySalt: Buffer

  private constructor(
    repository: AuthRepository,
    secret: string,
    dummyHash: Buffer,
    dummySalt: Buffer,
  ) {
    this.#repository = repository
    this.#secret = secret
    this.#dummyHash = dummyHash
    this.#dummySalt = dummySalt
  }

  static async create(repository: AuthRepository, secret: string) {
    const dummy = await createPasswordRecord(randomBytes(24).toString('base64url'))
    return new AuthService(repository, secret, dummy.passwordHash, dummy.passwordSalt)
  }

  async authenticate(email: string, password: string): Promise<PublicUser | null> {
    const user = await this.#repository.findUserByEmail(normalizeEmail(email))
    const suppliedHash = await derivePasswordHash(
      password,
      user?.passwordSalt ?? this.#dummySalt,
    )
    const expectedHash = user?.passwordHash ?? this.#dummyHash

    if (!timingSafeEqual(suppliedHash, expectedHash) || !user) return null
    return toPublicUser(user)
  }

  async createSession(userId: string, ttlMilliseconds: number) {
    await this.#repository.deleteExpiredSessions()
    const token = randomBytes(32).toString('base64url')
    await this.#repository.createSession(
      tokenKey(token, this.#secret),
      userId,
      new Date(Date.now() + ttlMilliseconds),
    )
    return token
  }

  async getSessionUser(token: string | undefined): Promise<PublicUser | null> {
    if (!token) return null
    const user = await this.#repository.findUserBySession(tokenKey(token, this.#secret))
    return user ? toPublicUser(user) : null
  }

  async deleteSession(token: string | undefined) {
    if (token) await this.#repository.deleteSession(tokenKey(token, this.#secret))
  }
}

export function stableUserId(email: string) {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 24)
}
