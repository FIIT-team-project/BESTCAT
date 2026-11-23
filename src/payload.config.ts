import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, ValidationError } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Cats } from './collections/Cats'
import { Shows } from './collections/Shows'
import { Events } from './collections/Events'
import { CatEventEntries } from './collections/CatEventEntries'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admins.slug,
    components: {
      views: {
        logout: {
          Component: '/app/(payload)/admin/logout-view#LogoutView',
        },
        unauthorized: {
          Component: '/app/(payload)/admin/unauthorized-view#UnauthorizedView',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Admins, Users, Media, Cats, Shows, Events, CatEventEntries],
  graphQL: {
    disable: true,
  },
  editor: lexicalEditor(),
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || '',
        defaultFromName: process.env.EMAIL_FROM_NAME || '',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 465),
          secure: (process.env.SMTP_SECURE || 'true') === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      })
    : undefined,
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.SERVER_URL,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  onInit: async (payload) => {
    const email = process.env.ADMIN_EMAIL?.trim()
    const password = process.env.ADMIN_PASSWORD
    if (!email || !password) return

    const collection = Admins.slug
    const { totalDocs } = await payload.count({ collection })
    if (totalDocs > 0) return

    try {
      await payload.create({ collection, data: { email, password } })
    } catch (error) {
      // Another instance with the same credentials may have created the account first.
      if (!(error instanceof ValidationError)) throw error
      const { totalDocs } = await payload.count({
        collection,
        where: { email: { equals: email.toLowerCase() } },
      })
      if (totalDocs === 0) throw error
    }
  },
  db: sqliteAdapter({
    prodMigrations: migrations,
    client: {
      url: process.env.DATABASE_URL || 'file:./payload.db',
    },
  }),
  sharp,
  plugins: [],
})
