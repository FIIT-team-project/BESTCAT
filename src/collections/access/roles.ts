import type { User } from '@/payload-types'

export function hasRole(user: User | null, role: User['role']) {
  return user?.role === role
}

export function hasAnyRole(user: User | null, roles: User['role'][]) {
  return Boolean(user && roles.includes(user.role))
}
