import { User } from '@/payload-types'

export function hasRole(user: User | null, role: User['roles'][number]) {
  return Boolean(user?.roles?.includes(role))
}

export function hasAnyRole(user: User | null, roles: User['roles']) {
  return Boolean(user?.roles?.some((role) => roles.includes(role)))
}
