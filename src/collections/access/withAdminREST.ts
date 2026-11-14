import config from '@payload-config'
import type { REST_GET } from '@payloadcms/next/routes'
import { getPayload } from 'payload'

import { isAdmin } from './isAdmin'

type RESTHandler = ReturnType<typeof REST_GET>

const publicAdminActions = new Set(['login', 'first-register', 'forgot-password', 'reset-password'])

export const withAdminREST = (handler: RESTHandler): RESTHandler => {
  return async (request, args) => {
    const { slug = [] } = await args.params

    // These paths would otherwise fall through to the REST catch-all route.
    if (slug[0] === 'graphql' || slug[0] === 'graphql-playground') {
      return new Response(null, { status: 404 })
    }

    const payloadConfig = await config
    const isAdminAuthRoute = slug.length === 2 && slug[0] === payloadConfig.admin.user
    const isPublicAdminAction =
      isAdminAuthRoute &&
      ((request.method === 'POST' && publicAdminActions.has(slug[1])) ||
        (request.method === 'GET' && (slug[1] === 'init' || slug[1] === 'me')))

    // The dashboard needs these before an administrator has signed in.
    if (isPublicAdminAction) return handler(request, args)

    const payload = await getPayload({ config: payloadConfig })
    const auth = await payload.auth({ headers: request.headers })

    if (!isAdmin({ req: auth })) {
      return Response.json(
        { errors: [{ message: 'REST access is reserved for administrators.' }] },
        {
          status: 403,
        },
      )
    }

    return handler(request, args)
  }
}
