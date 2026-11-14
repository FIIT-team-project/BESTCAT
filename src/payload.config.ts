import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Cats } from './collections/Cats'
import { Shows } from './collections/Shows'
import { Events } from './collections/Events'
import { CatEventEntries } from './collections/CatEventEntries'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Admins, Users, Media, Cats, Shows, Events, CatEventEntries],
  graphQL: {
    disable: true,
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || 'file:./payload.db',
    },
    transactionOptions: {},
  }),
  sharp,
  plugins: [],
})
