import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from '@/collections/Media'
import { Users } from '@/collections/Users'
import { BreedStatistics } from '@/collections/BreedStatistics'
import {
  BreedGroups,
  Breeds,
  Calls,
  Cats,
  Clubs,
  Entries,
  Exhibitions,
  ImportBatches,
  Judges,
  Owners,
  Results,
  Rings,
} from '@/collections/domain'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const databaseSslMode = process.env.DATABASE_SSL || 'disable'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: '— BESTCAT CMS' },
  },
  collections: [
    Users,
    Clubs,
    Exhibitions,
    Judges,
    Owners,
    BreedGroups,
    Breeds,
    Cats,
    Entries,
    Rings,
    Calls,
    Results,
    BreedStatistics,
    ImportBatches,
    Media,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      max: Number(process.env.DATABASE_POOL_SIZE || 10),
      ssl: databaseSslMode === 'disable' ? false : { rejectUnauthorized: databaseSslMode === 'verify-full' },
    },
  }),
  sharp,
})
