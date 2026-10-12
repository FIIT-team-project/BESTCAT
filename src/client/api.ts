export type Role =
  | 'admin'
  | 'club'
  | 'editor'
  | 'viewer'
  | 'judge'
  | 'steward'
  | 'chief-steward'
  | 'exhibitor'

export const roleLabels: Record<Role, string> = {
  admin: 'Administrátor',
  club: 'Klub',
  editor: 'Editor',
  viewer: 'Divák',
  judge: 'Posudzovateľ',
  steward: 'Steward',
  'chief-steward': 'Hlavný steward',
  exhibitor: 'Vystavovateľ',
}

export type User = {
  id: number | string
  email: string
  name: string
  role: Role
}

export type DashboardData = {
  cats: number
  entries: number
  completedEntries: number
  imports: number
  exhibition?: {
    title: string
    city: string
    startDate: string
    endDate: string
  }
}

type ApiErrorBody = {
  message?: string
  errors?: Array<{ message?: string }>
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiError(response.status, body.errors?.[0]?.message ?? body.message ?? 'Požiadavka zlyhala.')
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getCurrentUser() {
  return request<{ user: User | null }>('/api/users/me')
}

export function login(email: string, password: string, _keepSignedIn: boolean) {
  return request<{ user: User }>('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return request<unknown>('/api/users/logout', { method: 'POST' })
}

type Paginated<T> = { docs: T[]; totalDocs: number }

export async function getDashboardData(): Promise<DashboardData> {
  const [cats, entries, completedEntries, imports, exhibitions] = await Promise.all([
    request<Paginated<never>>('/api/cats?limit=1&depth=0'),
    request<Paginated<never>>('/api/entries?limit=1&depth=0'),
    request<Paginated<never>>('/api/entries?limit=1&depth=0&where[status][equals]=completed'),
    request<Paginated<never>>('/api/import-batches?limit=1&depth=0'),
    request<Paginated<{ title: string; city: string; startDate: string; endDate: string }>>('/api/exhibitions?limit=1&depth=0&sort=-startDate'),
  ])

  return {
    cats: cats.totalDocs,
    entries: entries.totalDocs,
    completedEntries: completedEntries.totalDocs,
    imports: imports.totalDocs,
    exhibition: exhibitions.docs[0],
  }
}
