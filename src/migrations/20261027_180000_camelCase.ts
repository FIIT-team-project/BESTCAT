import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Payload keeps SQL table and column names in snake_case. Only compound index
// names and application-defined text values change with this naming update.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER INDEX "user_id_cat_id_idx" RENAME TO "userId_catId_idx";
    ALTER INDEX "cat_id_event_id_idx" RENAME TO "catId_eventId_idx";
    UPDATE "events" SET "event_type" = 'traditionalJudging' WHERE "event_type" = 'traditional_judging';
    UPDATE "events" SET "event_type" = 'wcfRingAdults' WHERE "event_type" = 'wcf_ring_adults';
    UPDATE "events" SET "event_rating" = 'rankingTop10' WHERE "event_rating" = 'ranking_top_10';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER INDEX "userId_catId_idx" RENAME TO "user_id_cat_id_idx";
    ALTER INDEX "catId_eventId_idx" RENAME TO "cat_id_event_id_idx";
    UPDATE "events" SET "event_type" = 'traditional_judging' WHERE "event_type" = 'traditionalJudging';
    UPDATE "events" SET "event_type" = 'wcf_ring_adults' WHERE "event_type" = 'wcfRingAdults';
    UPDATE "events" SET "event_rating" = 'ranking_top_10' WHERE "event_rating" = 'rankingTop10';
  `)
}
