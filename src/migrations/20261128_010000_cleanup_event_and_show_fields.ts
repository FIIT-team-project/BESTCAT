import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

async function requireEmptyEvents(db: MigrateUpArgs['db']) {
  const [event] = await db.all(sql`SELECT id FROM events LIMIT 1`)
  if (event) {
    throw new Error('Changing the event schedule schema requires an empty events table.')
  }
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await requireEmptyEvents(db)
  await db.run(sql`ALTER TABLE events ADD COLUMN start_time text NOT NULL`)
  await db.run(sql`ALTER TABLE events DROP COLUMN event_date`)
  await db.run(sql`ALTER TABLE events DROP COLUMN event_time`)
  await db.run(sql`ALTER TABLE events DROP COLUMN judgement_number`)
  await db.run(sql`ALTER TABLE shows DROP COLUMN start_date`)
  await db.run(sql`ALTER TABLE shows DROP COLUMN end_date`)
  await db.run(sql`ALTER TABLE shows DROP COLUMN date_from`)
  await db.run(sql`ALTER TABLE shows DROP COLUMN date_to`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await requireEmptyEvents(db)
  await db.run(sql`ALTER TABLE events ADD COLUMN event_date text NOT NULL`)
  await db.run(sql`ALTER TABLE events ADD COLUMN event_time text`)
  await db.run(sql`ALTER TABLE events ADD COLUMN judgement_number numeric`)
  await db.run(sql`ALTER TABLE events DROP COLUMN start_time`)
  await db.run(sql`ALTER TABLE shows ADD COLUMN start_date text`)
  await db.run(sql`ALTER TABLE shows ADD COLUMN end_date text`)
  await db.run(sql`ALTER TABLE shows ADD COLUMN date_from text`)
  await db.run(sql`ALTER TABLE shows ADD COLUMN date_to text`)
}
