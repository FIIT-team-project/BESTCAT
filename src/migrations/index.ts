import * as migration_20261123_100230_initial from './20261123_100230_initial'

export const migrations = [
  {
    up: migration_20261123_100230_initial.up,
    down: migration_20261123_100230_initial.down,
    name: '20261123_100230_initial',
  },
]
