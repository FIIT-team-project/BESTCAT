import type { Access } from 'payload'

export const roleOptions = [
  { label: 'Administrátor', value: 'admin' },
  { label: 'Klub', value: 'club' },
  { label: 'Editor', value: 'editor' },
  { label: 'Divák', value: 'viewer' },
  { label: 'Posudzovateľ', value: 'judge' },
  { label: 'Steward', value: 'steward' },
  { label: 'Hlavný steward', value: 'chief-steward' },
  { label: 'Vystavovateľ', value: 'exhibitor' },
] as const

export type UserRole = (typeof roleOptions)[number]['value']

type RoleUser = { id: number | string; role?: UserRole }

const roleOf = (user: unknown): UserRole | undefined => (user as RoleUser | null)?.role

export const publicRead: Access = () => true
export const authenticated: Access = ({ req }) => Boolean(req.user)
export const adminOnly: Access = ({ req }) => roleOf(req.user) === 'admin'
export const canManageContent: Access = ({ req }) => ['admin', 'club', 'editor'].includes(roleOf(req.user) ?? '')
export const canManageShows: Access = ({ req }) =>
  ['admin', 'club', 'editor', 'chief-steward'].includes(roleOf(req.user) ?? '')
export const canManageJudging: Access = ({ req }) =>
  ['admin', 'club', 'editor', 'judge', 'steward', 'chief-steward'].includes(roleOf(req.user) ?? '')

export const readOwnUser: Access = ({ req }) => {
  if (roleOf(req.user) === 'admin') return true
  if (!req.user) return false
  return { id: { equals: req.user.id } }
}

export const updateOwnUser: Access = ({ req }) => {
  if (roleOf(req.user) === 'admin') return true
  if (!req.user) return false
  return { id: { equals: req.user.id } }
}
