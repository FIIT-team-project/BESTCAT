import type { PayloadRequest } from 'payload'

export const isAdmin = ({ req }: { req: Pick<PayloadRequest, 'user'> }) =>
  req.user?.collection === 'admins'
