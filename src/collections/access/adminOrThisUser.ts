import type { Access } from 'payload'
import { hasRole } from './roles'

export const adminsOrThisUser: Access = ({ req: { user } }) => {
  if (user) {
    if (hasRole(user, 'admin')) {
      return true
    }

    return {
      id: { equals: user.id },
    }
  }

  return false
}
