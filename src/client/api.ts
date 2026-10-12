export type Role =
  | 'Admin'
  | 'Judge'
  | 'Steward'
  | 'Chief Steward'
  | 'Exhibitor'
  | 'Club / Editor'

export type User = {
  id: string
  email: string
  name: string
  role: Role
}

type ApiErrorBody = {
  message?: string
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
    throw new ApiError(response.status, body.message ?? 'Požiadavka zlyhala.')
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getCurrentUser() {
  return request<{ user: User }>('/api/auth/me')
}

export function login(email: string, password: string, keepSignedIn: boolean) {
  return request<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, keepSignedIn }),
  })
}

export function logout() {
  return request<void>('/api/auth/logout', { method: 'POST' })
}
