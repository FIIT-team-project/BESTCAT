import * as initialMigration from './20261026_154259_initial'
import * as seedMigration from './seed'
import * as catImagesMigration from './20261027_190000_catImages'

import * as camelCaseMigration from './20261027_180000_camelCase'

export const migrations = [
  {
    up: initialMigration.up,
    down: initialMigration.down,
    name: '20261026_154259_initial',
  },
  {
    // The seed writes imageUrl, so its column must exist first on a fresh database.
    up: catImagesMigration.up,
    down: catImagesMigration.down,
    name: '20261027_190000_catImages',
  },
  {
    up: seedMigration.up,
    down: seedMigration.down,
    name: 'seed',
  },
  {
    up: camelCaseMigration.up,
    down: camelCaseMigration.down,
    name: '20261027_180000_camelCase',
  },
]
