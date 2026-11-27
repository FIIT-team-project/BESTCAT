import * as migration_20261123_100230_initial from './20261123_100230_initial'
import * as migration_20261123_165635_show_schedule from './20261123_165635_show_schedule'
import * as migration_20261123_193747_show_import from './20261123_193747_show_import'
import * as migration_20261126_104137_reconcile_show_schema from './20261126_104137_reconcile_show_schema'
import * as migration_20261128_010000_cleanup_event_and_show_fields from './20261128_010000_cleanup_event_and_show_fields'

export const migrations = [
  {
    up: migration_20261123_100230_initial.up,
    down: migration_20261123_100230_initial.down,
    name: '20261123_100230_initial',
  },
  {
    up: migration_20261123_165635_show_schedule.up,
    down: migration_20261123_165635_show_schedule.down,
    name: '20261123_165635_show_schedule',
  },
  {
    up: migration_20261123_193747_show_import.up,
    down: migration_20261123_193747_show_import.down,
    name: '20261123_193747_show_import',
  },
  {
    up: migration_20261126_104137_reconcile_show_schema.up,
    down: migration_20261126_104137_reconcile_show_schema.down,
    name: '20261126_104137_reconcile_show_schema',
  },
  {
    up: migration_20261128_010000_cleanup_event_and_show_fields.up,
    down: migration_20261128_010000_cleanup_event_and_show_fields.down,
    name: '20261128_010000_cleanup_event_and_show_fields',
  },
]
