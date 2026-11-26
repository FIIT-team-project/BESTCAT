import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Restore schedule columns if the original import migration already rebuilt the table.
  const eventColumns = await db.all<{ name: string }>(sql`PRAGMA table_info('events');`)
  if (!eventColumns.some(({ name }) => name === 'event_time')) {
    await db.run(sql`ALTER TABLE \`events\` ADD \`event_time\` text;`)
  }
  if (!eventColumns.some(({ name }) => name === 'status')) {
    await db.run(sql`ALTER TABLE \`events\` ADD \`status\` text DEFAULT 'planned' NOT NULL;`)
  }

  await db.run(sql`ALTER TABLE \`cats\` ADD \`ring_type\` text;`)
  await db.run(sql`ALTER TABLE \`shows\` ADD \`date_from\` text;`)
  await db.run(sql`ALTER TABLE \`shows\` ADD \`date_to\` text;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`judgement_number\` numeric;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` ADD \`called_at\` text;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` ADD \`place\` numeric;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` ADD \`title\` text;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` ADD \`score\` numeric;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` ADD \`text_rating\` text;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // The show schedule migration owns its date, time and status columns.
  await db.run(sql`ALTER TABLE \`cats\` DROP COLUMN \`ring_type\`;`)
  await db.run(sql`ALTER TABLE \`shows\` DROP COLUMN \`date_from\`;`)
  await db.run(sql`ALTER TABLE \`shows\` DROP COLUMN \`date_to\`;`)
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`judgement_number\`;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` DROP COLUMN \`called_at\`;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` DROP COLUMN \`place\`;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` DROP COLUMN \`title\`;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` DROP COLUMN \`score\`;`)
  await db.run(sql`ALTER TABLE \`cat_event_entries\` DROP COLUMN \`text_rating\`;`)
}
