import type { Access } from 'payload'
import { hasRole } from './roles'
import { isShowAdministrator } from './shows'

export const adminsOrThisUser: Access = async ({ req }) => {
  const { user } = req
  if (user) {
    if (hasRole(user, 'admin') || (await isShowAdministrator(req))) {
      return true
    }

    return {
      id: { equals: user.id },
    }
  }

  return false
}
