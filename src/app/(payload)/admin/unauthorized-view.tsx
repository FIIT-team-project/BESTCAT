import { Button } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'

export function UnauthorizedView({ initPageResult }: AdminViewServerProps) {
  const {
    permissions,
    req: { i18n, payload, user },
  } = initPageResult
  const { admin, routes } = payload.config
  const isDeniedUser = Boolean(user && !permissions.canAccessAdmin)

  return (
    <div>
      <h1>{i18n.t(isDeniedUser ? 'error:unauthorizedAdmin' : 'error:unauthorized')}</h1>
      <p>{i18n.t('error:notAllowedToAccessPage')}</p>
      {isDeniedUser ? (
        <Button el="anchor" size="large" url="/">
          {i18n.t('general:goBack')}
        </Button>
      ) : (
        <Button
          el="link"
          size="large"
          url={formatAdminURL({ adminRoute: routes.admin, path: admin.routes.logout })}
        >
          {i18n.t('authentication:logOut')}
        </Button>
      )}
    </div>
  )
}
