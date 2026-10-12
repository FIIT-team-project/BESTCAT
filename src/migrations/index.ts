import * as migration_20261012_121646_initial_schema from './20261012_121646_initial_schema';
import * as migration_20261012_132732_add_breed_statistics from './20261012_132732_add_breed_statistics';

export const migrations = [
  {
    up: migration_20261012_121646_initial_schema.up,
    down: migration_20261012_121646_initial_schema.down,
    name: '20261012_121646_initial_schema',
  },
  {
    up: migration_20261012_132732_add_breed_statistics.up,
    down: migration_20261012_132732_add_breed_statistics.down,
    name: '20261012_132732_add_breed_statistics'
  },
];
