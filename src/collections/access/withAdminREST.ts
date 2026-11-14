import config from '@payload-config'
import type { REST_GET } from '@payloadcms/next/routes'
import { getPayload } from 'payload'

import { isAdmin } from './isAdmin'

type RESTHandler = ReturnType<typeof REST_GET>

const payloadAuthRoutes = new Set([
  'GET init',
  'POST login',
  'POST logout',
  'POST forgot-password',
  'POST reset-password',
  'POST refresh-token',
])

export const withAdminREST = (handler: RESTHandler): RESTHandler => {
  return async (request, args) => {
    const { slug = [] } = await args.params
    const [collectionSlug, action] = slug
    const { method } = request

    // These paths would otherwise fall through to the REST catch-all route.
    if (collectionSlug === 'graphql' || collectionSlug === 'graphql-playground') {
      return new Response(null, { status: 404 })
    }

    const payloadConfig = await config
    const isAuthRoute =
      slug.length === 2 &&
      payloadConfig.collections.some(
        (collection) => collection.slug === collectionSlug && collection.auth,
      )
    const isPayloadAuthRoute =
      isAuthRoute &&
      (payloadAuthRoutes.has(`${method} ${action}`) ||
        (method === 'POST' &&
          collectionSlug === payloadConfig.admin.user &&
          action === 'first-register'))

    // Payload's auth handlers enforce their own credentials, tokens, and session checks.
    if (isPayloadAuthRoute) return handler(request, args)

    const payload = await getPayload({ config: payloadConfig })
    const auth = await payload.auth({ headers: request.headers })

    // A regular user can look up their own session. Denying admins/me for that user
    // also prevents the admin UI from replacing their identity with a null admin session.
    const canReadSession =
      isAuthRoute &&
      method === 'GET' &&
      action === 'me' &&
      (!auth.user || auth.user.collection === collectionSlug)

    if (isAdmin({ req: auth }) || canReadSession) {
      return handler(request, args)
    }

    return Response.json(
      { errors: [{ message: 'REST access is reserved for administrators.' }] },
      { status: 403 },
    )
  }
}
