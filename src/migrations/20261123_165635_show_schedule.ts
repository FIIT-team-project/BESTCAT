import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`shows\` ADD \`start_date\` text;`)
  await db.run(sql`ALTER TABLE \`shows\` ADD \`end_date\` text;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`event_time\` text;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`status\` text DEFAULT 'planned' NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`shows\` DROP COLUMN \`start_date\`;`)
  await db.run(sql`ALTER TABLE \`shows\` DROP COLUMN \`end_date\`;`)
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`event_time\`;`)
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`status\`;`)
}
