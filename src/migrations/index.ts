import * as migration_20261123_100230_initial from './20261123_100230_initial';
import * as migration_20261123_193747_show_import from './20261123_193747_show_import';

export const migrations = [
  {
    up: migration_20261123_100230_initial.up,
    down: migration_20261123_100230_initial.down,
    name: '20261123_100230_initial',
  },
  {
    up: migration_20261123_193747_show_import.up,
    down: migration_20261123_193747_show_import.down,
    name: '20261123_193747_show_import'
  },
];
