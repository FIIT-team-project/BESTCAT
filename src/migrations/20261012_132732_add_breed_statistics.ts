import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "breed_statistics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"year" numeric NOT NULL,
  	"club_id" integer NOT NULL,
  	"breed_id" integer NOT NULL,
  	"region" varchar NOT NULL,
  	"born_count" numeric DEFAULT 0 NOT NULL,
  	"imported_wcf_count" numeric DEFAULT 0 NOT NULL,
  	"imported_non_wcf_count" numeric DEFAULT 0 NOT NULL,
  	"registered_lo_count" numeric DEFAULT 0 NOT NULL,
  	"registered_riex_count" numeric DEFAULT 0 NOT NULL,
  	"import_batch_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "breed_statistics_id" integer;
  ALTER TABLE "breed_statistics" ADD CONSTRAINT "breed_statistics_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "breed_statistics" ADD CONSTRAINT "breed_statistics_breed_id_breeds_id_fk" FOREIGN KEY ("breed_id") REFERENCES "public"."breeds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "breed_statistics" ADD CONSTRAINT "breed_statistics_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "breed_statistics_key_idx" ON "breed_statistics" USING btree ("key");
  CREATE INDEX "breed_statistics_year_idx" ON "breed_statistics" USING btree ("year");
  CREATE INDEX "breed_statistics_club_idx" ON "breed_statistics" USING btree ("club_id");
  CREATE INDEX "breed_statistics_breed_idx" ON "breed_statistics" USING btree ("breed_id");
  CREATE INDEX "breed_statistics_region_idx" ON "breed_statistics" USING btree ("region");
  CREATE INDEX "breed_statistics_import_batch_idx" ON "breed_statistics" USING btree ("import_batch_id");
  CREATE INDEX "breed_statistics_updated_at_idx" ON "breed_statistics" USING btree ("updated_at");
  CREATE INDEX "breed_statistics_created_at_idx" ON "breed_statistics" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_breed_statistics_fk" FOREIGN KEY ("breed_statistics_id") REFERENCES "public"."breed_statistics"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_breed_statistics_id_idx" ON "payload_locked_documents_rels" USING btree ("breed_statistics_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_breed_statistics_fk";
  DROP INDEX "payload_locked_documents_rels_breed_statistics_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "breed_statistics_id";
  DROP TABLE "breed_statistics" CASCADE;`)
}
