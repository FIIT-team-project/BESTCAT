import type { FieldAccess } from 'payload'
import { hasRole } from './roles'

export const admins: FieldAccess = ({ req: { user } }) => {
  return hasRole(user, 'admin')
}
