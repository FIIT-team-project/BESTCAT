import * as initialMigration from './20261026_154259_initial'
import * as seedMigration from './seed'

import * as camelCaseMigration from './20261027_180000_camelCase'

export const migrations = [
  {
    up: initialMigration.up,
    down: initialMigration.down,
    name: '20261026_154259_initial',
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
