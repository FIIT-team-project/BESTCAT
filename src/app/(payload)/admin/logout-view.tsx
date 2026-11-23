'use client'

import { Banner, Button, useAuth, useConfig, useTranslation } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { useActionState } from 'react'

export function LogoutView() {
  const { user } = useAuth()
  const { config } = useConfig()
  const { t } = useTranslation()
  const { admin, routes } = config
  const loginURL = formatAdminURL({ adminRoute: routes.admin, path: admin.routes.login })
  const logoutURL = formatAdminURL({ apiRoute: routes.api, path: `/${admin.user}/logout` })

  const [error, confirmLogout, pending] = useActionState(async () => {
    try {
      const response = await fetch(logoutURL, { method: 'POST' })
      if (response.ok) {
        window.location.replace(loginURL)
        return null
      }
    } catch {
      // Keep the confirmation available so the user can retry.
    }
    return t('error:logoutFailed')
  }, null)

  if (!user) redirect(loginURL)
  if (user.collection !== admin.user) {
    redirect(formatAdminURL({ adminRoute: routes.admin, path: admin.routes.unauthorized }))
  }

  return (
    <div>
      <div className="form-header">
        <h1>{t('authentication:logOut')}</h1>
        <p>Are you sure you want to log out?</p>
      </div>
      <form action={confirmLogout}>
        {error && (
          <div role="alert">
            <Banner type="error">{error}</Banner>
          </div>
        )}
        <div className="admin-logout__actions">
          <Button
            buttonStyle="secondary"
            el="anchor"
            url={routes.admin}
            disabled={pending}
            margin={false}
            size="large"
          >
            {t('general:cancel')}
          </Button>
          <Button type="submit" disabled={pending} margin={false} size="large">
            {pending ? t('authentication:loggingOut') : t('authentication:logOut')}
          </Button>
        </div>
      </form>
    </div>
  )
}
