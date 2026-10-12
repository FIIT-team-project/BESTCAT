import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import helmet from 'helmet'
import { resolve } from 'node:path'

import { AuthService, type AuthRepository } from './auth.js'

const SESSION_COOKIE = 'bestcat_session'
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

type AppOptions = {
  authRepository: AuthRepository
  sessionSecret?: string
  clientOrigin?: string
  production?: boolean
  serveClient?: boolean
}

type Attempt = {
  failures: number
  resetAt: number
}

function parseCookie(header: string | undefined, name: string) {
  if (!header) return undefined
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=')
    if (separator === -1) continue
    const key = pair.slice(0, separator).trim()
    if (key === name) return decodeURIComponent(pair.slice(separator + 1).trim())
  }
  return undefined
}

function setSessionCookie(
  response: express.Response,
  token: string,
  production: boolean,
  maxAge?: number,
) {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
    maxAge,
  })
}

export async function createApp(options: AppOptions) {
  const production = options.production ?? process.env.NODE_ENV === 'production'
  const configuredSessionSecret = options.sessionSecret ?? process.env.SESSION_SECRET
  const sessionSecret = configuredSessionSecret ?? 'bestcat-local-development-secret-change-me'

  if (
    production &&
    (!configuredSessionSecret ||
      configuredSessionSecret === 'replace-with-at-least-32-random-characters' ||
      configuredSessionSecret.length < 32)
  ) {
    throw new Error('SESSION_SECRET must contain at least 32 characters in production.')
  }

  const auth = await AuthService.create(options.authRepository, sessionSecret)
  const app = express()
  const attempts = new Map<string, Attempt>()
  const clientOrigin = options.clientOrigin ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
  const sessionHours = Number(process.env.SESSION_TTL_HOURS ?? 12)
  const sessionTtl = Number.isFinite(sessionHours) && sessionHours > 0 ? sessionHours * HOUR : 12 * HOUR

  if (production) app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
          'script-src': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
        },
      },
    }),
  )
  app.use(express.json({ limit: '10kb' }))

  const checkOrigin: RequestHandler = (request, response, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next()
    const origin = request.get('origin')
    const serverOrigin = `${request.protocol}://${request.get('host')}`
    if (origin && origin !== clientOrigin && origin !== serverOrigin) {
      response.status(403).json({ message: 'Požiadavka pochádza z nepovoleného zdroja.' })
      return
    }
    next()
  }
  app.use('/api', checkOrigin)
  app.use('/api/auth', (_request, response, next) => {
    response.set('Cache-Control', 'no-store')
    next()
  })

  app.get('/api/health', async (_request, response, next) => {
    try {
      await options.authRepository.ping()
      response.json({ status: 'ok', database: 'connected' })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/auth/me', async (request, response, next) => {
    try {
      const token = parseCookie(request.get('cookie'), SESSION_COOKIE)
      const user = await auth.getSessionUser(token)
      if (!user) {
        response.status(401).json({ message: 'Nie ste prihlásený.' })
        return
      }
      response.json({ user })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/auth/login', async (request, response, next) => {
    try {
      const ip = request.ip || request.socket.remoteAddress || 'unknown'
      const now = Date.now()
      const currentAttempt = attempts.get(ip)
      if (currentAttempt && currentAttempt.resetAt > now && currentAttempt.failures >= 5) {
        response
          .status(429)
          .set('Retry-After', String(Math.ceil((currentAttempt.resetAt - now) / 1_000)))
          .json({ message: 'Priveľa pokusov. Skúste to znova o niekoľko minút.' })
        return
      }

      const email = typeof request.body?.email === 'string' ? request.body.email : ''
      const password = typeof request.body?.password === 'string' ? request.body.password : ''
      const keepSignedIn = request.body?.keepSignedIn === true
      if (!email || email.length > 254 || !password || password.length > 256) {
        response.status(400).json({ message: 'Zadajte platný e-mail a heslo.' })
        return
      }

      const user = await auth.authenticate(email, password)
      if (!user) {
        const attempt = currentAttempt && currentAttempt.resetAt > now
          ? currentAttempt
          : { failures: 0, resetAt: now + 15 * MINUTE }
        attempt.failures += 1
        attempts.set(ip, attempt)
        response.status(401).json({ message: 'Nesprávny e-mail alebo heslo.' })
        return
      }

      attempts.delete(ip)
      const ttl = keepSignedIn ? 30 * DAY : sessionTtl
      const token = await auth.createSession(user.id, ttl)
      setSessionCookie(response, token, production, keepSignedIn ? ttl : undefined)
      response.json({ user })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/auth/logout', async (request, response, next) => {
    try {
      await auth.deleteSession(parseCookie(request.get('cookie'), SESSION_COOKIE))
      response.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        sameSite: 'lax',
        secure: production,
        path: '/',
      })
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  app.use('/api', (_request, response) => {
    response.status(404).json({ message: 'API endpoint neexistuje.' })
  })

  if (options.serveClient ?? production) {
    const clientDirectory = resolve(process.cwd(), 'dist/client')
    app.use(express.static(clientDirectory, { index: false }))
    app.get('*', (_request, response) => {
      response.sendFile(resolve(clientDirectory, 'index.html'))
    })
  }

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    void _next
    if (error instanceof SyntaxError) {
      response.status(400).json({ message: 'Požiadavka nemá platný formát.' })
      return
    }
    console.error(error)
    response.status(500).json({ message: 'Server požiadavku nedokázal spracovať.' })
  }
  app.use(errorHandler)

  return app
}
