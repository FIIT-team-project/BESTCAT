import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'club', 'editor', 'viewer', 'judge', 'steward', 'chief-steward', 'exhibitor');
  CREATE TYPE "public"."enum_exhibitions_status" AS ENUM('draft', 'published', 'live', 'completed');
  CREATE TYPE "public"."enum_cats_sex" AS ENUM('male', 'female', 'male-neuter', 'female-spay', 'unknown');
  CREATE TYPE "public"."enum_cats_registration_book" AS ENUM('lo', 'riex', 'other');
  CREATE TYPE "public"."enum_cats_source_system" AS ENUM('bestcat', 'wcf', 'non-wcf', 'manual');
  CREATE TYPE "public"."enum_entries_status" AS ENUM('registered', 'checked-in', 'judging', 'completed', 'absent');
  CREATE TYPE "public"."enum_rings_stage" AS ENUM('table', 'ring', 'best-in-show');
  CREATE TYPE "public"."enum_rings_status" AS ENUM('planned', 'open', 'paused', 'closed');
  CREATE TYPE "public"."enum_calls_status" AS ENUM('waiting', 'called', 'acknowledged', 'in-judging', 'completed', 'absent');
  CREATE TYPE "public"."enum_results_stage" AS ENUM('table', 'ring', 'best-in-show');
  CREATE TYPE "public"."enum_import_batches_messages_level" AS ENUM('info', 'warning', 'error');
  CREATE TYPE "public"."enum_import_batches_source_type" AS ENUM('csv', 'excel', 'pdf', 'api');
  CREATE TYPE "public"."enum_import_batches_status" AS ENUM('pending', 'processing', 'completed', 'partial', 'failed');
  CREATE TYPE "public"."enum_media_document_type" AS ENUM('catalog', 'import', 'report', 'image', 'other');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'viewer' NOT NULL,
  	"club_id" integer,
  	"phone" varchar,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "clubs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"federation" varchar DEFAULT 'WCF',
  	"country" varchar NOT NULL,
  	"city" varchar,
  	"region" varchar,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "exhibitions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"club_id" integer NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"license_number" varchar,
  	"city" varchar NOT NULL,
  	"country" varchar NOT NULL,
  	"address" varchar,
  	"region" varchar,
  	"status" "enum_exhibitions_status" DEFAULT 'draft' NOT NULL,
  	"catalog_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "exhibitions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"judges_id" integer
  );
  
  CREATE TABLE "judges_qualifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "judges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"country" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"user_id" integer,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "owners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"country" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"club_id" integer,
  	"user_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "breed_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"sort_order" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "breeds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"group_id" integer NOT NULL,
  	"recognized_by_wcf" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"wcf_id" varchar,
  	"breed_id" integer NOT NULL,
  	"ems_code" varchar,
  	"color_description" varchar,
  	"sex" "enum_cats_sex" NOT NULL,
  	"birth_date" timestamp(3) with time zone,
  	"sire" varchar,
  	"dam" varchar,
  	"owner_id" integer NOT NULL,
  	"registration_book" "enum_cats_registration_book",
  	"origin_country" varchar,
  	"source_system" "enum_cats_source_system" DEFAULT 'bestcat',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "entries_ring_types" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"external_key" varchar NOT NULL,
  	"exhibition_id" integer NOT NULL,
  	"cat_id" integer NOT NULL,
  	"catalog_number" numeric NOT NULL,
  	"show_class" varchar NOT NULL,
  	"ems_code" varchar,
  	"status" "enum_entries_status" DEFAULT 'registered' NOT NULL,
  	"import_batch_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"exhibition_id" integer NOT NULL,
  	"stage" "enum_rings_stage" NOT NULL,
  	"category" varchar,
  	"judge_id" integer,
  	"status" "enum_rings_status" DEFAULT 'planned',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "calls" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"exhibition_id" integer NOT NULL,
  	"entry_id" integer NOT NULL,
  	"ring_id" integer NOT NULL,
  	"queue_position" numeric,
  	"status" "enum_calls_status" DEFAULT 'waiting' NOT NULL,
  	"called_at" timestamp(3) with time zone,
  	"acknowledged_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "results" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"exhibition_id" integer NOT NULL,
  	"entry_id" integer NOT NULL,
  	"ring_id" integer,
  	"judge_id" integer,
  	"stage" "enum_results_stage" NOT NULL,
  	"award" varchar,
  	"placement" numeric,
  	"score" numeric,
  	"notes" varchar,
  	"published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_batches_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"level" "enum_import_batches_messages_level" NOT NULL,
  	"message" varchar NOT NULL
  );
  
  CREATE TABLE "import_batches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"exhibition_id" integer NOT NULL,
  	"source_name" varchar NOT NULL,
  	"source_type" "enum_import_batches_source_type" NOT NULL,
  	"source_file_id" integer,
  	"status" "enum_import_batches_status" DEFAULT 'pending' NOT NULL,
  	"total_rows" numeric DEFAULT 0,
  	"successful_rows" numeric DEFAULT 0,
  	"failed_rows" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"document_type" "enum_media_document_type",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"clubs_id" integer,
  	"exhibitions_id" integer,
  	"judges_id" integer,
  	"owners_id" integer,
  	"breed_groups_id" integer,
  	"breeds_id" integer,
  	"cats_id" integer,
  	"entries_id" integer,
  	"rings_id" integer,
  	"calls_id" integer,
  	"results_id" integer,
  	"import_batches_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exhibitions" ADD CONSTRAINT "exhibitions_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exhibitions" ADD CONSTRAINT "exhibitions_catalog_id_media_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exhibitions_rels" ADD CONSTRAINT "exhibitions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exhibitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exhibitions_rels" ADD CONSTRAINT "exhibitions_rels_judges_fk" FOREIGN KEY ("judges_id") REFERENCES "public"."judges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "judges_qualifications" ADD CONSTRAINT "judges_qualifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."judges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "judges" ADD CONSTRAINT "judges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "owners" ADD CONSTRAINT "owners_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "owners" ADD CONSTRAINT "owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "breeds" ADD CONSTRAINT "breeds_group_id_breed_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."breed_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cats" ADD CONSTRAINT "cats_breed_id_breeds_id_fk" FOREIGN KEY ("breed_id") REFERENCES "public"."breeds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cats" ADD CONSTRAINT "cats_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries_ring_types" ADD CONSTRAINT "entries_ring_types_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_exhibition_id_exhibitions_id_fk" FOREIGN KEY ("exhibition_id") REFERENCES "public"."exhibitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rings" ADD CONSTRAINT "rings_exhibition_id_exhibitions_id_fk" FOREIGN KEY ("exhibition_id") REFERENCES "public"."exhibitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rings" ADD CONSTRAINT "rings_judge_id_judges_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rings_rels" ADD CONSTRAINT "rings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."rings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "rings_rels" ADD CONSTRAINT "rings_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "calls" ADD CONSTRAINT "calls_exhibition_id_exhibitions_id_fk" FOREIGN KEY ("exhibition_id") REFERENCES "public"."exhibitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "calls" ADD CONSTRAINT "calls_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "calls" ADD CONSTRAINT "calls_ring_id_rings_id_fk" FOREIGN KEY ("ring_id") REFERENCES "public"."rings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "results" ADD CONSTRAINT "results_exhibition_id_exhibitions_id_fk" FOREIGN KEY ("exhibition_id") REFERENCES "public"."exhibitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "results" ADD CONSTRAINT "results_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "results" ADD CONSTRAINT "results_ring_id_rings_id_fk" FOREIGN KEY ("ring_id") REFERENCES "public"."rings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "results" ADD CONSTRAINT "results_judge_id_judges_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_batches_messages" ADD CONSTRAINT "import_batches_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_exhibition_id_exhibitions_id_fk" FOREIGN KEY ("exhibition_id") REFERENCES "public"."exhibitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_source_file_id_media_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clubs_fk" FOREIGN KEY ("clubs_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exhibitions_fk" FOREIGN KEY ("exhibitions_id") REFERENCES "public"."exhibitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_judges_fk" FOREIGN KEY ("judges_id") REFERENCES "public"."judges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_owners_fk" FOREIGN KEY ("owners_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_breed_groups_fk" FOREIGN KEY ("breed_groups_id") REFERENCES "public"."breed_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_breeds_fk" FOREIGN KEY ("breeds_id") REFERENCES "public"."breeds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cats_fk" FOREIGN KEY ("cats_id") REFERENCES "public"."cats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rings_fk" FOREIGN KEY ("rings_id") REFERENCES "public"."rings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_calls_fk" FOREIGN KEY ("calls_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_results_fk" FOREIGN KEY ("results_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_batches_fk" FOREIGN KEY ("import_batches_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_club_idx" ON "users" USING btree ("club_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "clubs_code_idx" ON "clubs" USING btree ("code");
  CREATE INDEX "clubs_region_idx" ON "clubs" USING btree ("region");
  CREATE INDEX "clubs_updated_at_idx" ON "clubs" USING btree ("updated_at");
  CREATE INDEX "clubs_created_at_idx" ON "clubs" USING btree ("created_at");
  CREATE UNIQUE INDEX "exhibitions_slug_idx" ON "exhibitions" USING btree ("slug");
  CREATE INDEX "exhibitions_club_idx" ON "exhibitions" USING btree ("club_id");
  CREATE INDEX "exhibitions_start_date_idx" ON "exhibitions" USING btree ("start_date");
  CREATE INDEX "exhibitions_license_number_idx" ON "exhibitions" USING btree ("license_number");
  CREATE INDEX "exhibitions_region_idx" ON "exhibitions" USING btree ("region");
  CREATE INDEX "exhibitions_catalog_idx" ON "exhibitions" USING btree ("catalog_id");
  CREATE INDEX "exhibitions_updated_at_idx" ON "exhibitions" USING btree ("updated_at");
  CREATE INDEX "exhibitions_created_at_idx" ON "exhibitions" USING btree ("created_at");
  CREATE INDEX "exhibitions_rels_order_idx" ON "exhibitions_rels" USING btree ("order");
  CREATE INDEX "exhibitions_rels_parent_idx" ON "exhibitions_rels" USING btree ("parent_id");
  CREATE INDEX "exhibitions_rels_path_idx" ON "exhibitions_rels" USING btree ("path");
  CREATE INDEX "exhibitions_rels_judges_id_idx" ON "exhibitions_rels" USING btree ("judges_id");
  CREATE INDEX "judges_qualifications_order_idx" ON "judges_qualifications" USING btree ("_order");
  CREATE INDEX "judges_qualifications_parent_id_idx" ON "judges_qualifications" USING btree ("_parent_id");
  CREATE INDEX "judges_name_idx" ON "judges" USING btree ("name");
  CREATE INDEX "judges_user_idx" ON "judges" USING btree ("user_id");
  CREATE INDEX "judges_updated_at_idx" ON "judges" USING btree ("updated_at");
  CREATE INDEX "judges_created_at_idx" ON "judges" USING btree ("created_at");
  CREATE INDEX "owners_name_idx" ON "owners" USING btree ("name");
  CREATE INDEX "owners_club_idx" ON "owners" USING btree ("club_id");
  CREATE INDEX "owners_user_idx" ON "owners" USING btree ("user_id");
  CREATE INDEX "owners_updated_at_idx" ON "owners" USING btree ("updated_at");
  CREATE INDEX "owners_created_at_idx" ON "owners" USING btree ("created_at");
  CREATE UNIQUE INDEX "breed_groups_slug_idx" ON "breed_groups" USING btree ("slug");
  CREATE INDEX "breed_groups_updated_at_idx" ON "breed_groups" USING btree ("updated_at");
  CREATE INDEX "breed_groups_created_at_idx" ON "breed_groups" USING btree ("created_at");
  CREATE UNIQUE INDEX "breeds_code_idx" ON "breeds" USING btree ("code");
  CREATE INDEX "breeds_group_idx" ON "breeds" USING btree ("group_id");
  CREATE INDEX "breeds_updated_at_idx" ON "breeds" USING btree ("updated_at");
  CREATE INDEX "breeds_created_at_idx" ON "breeds" USING btree ("created_at");
  CREATE INDEX "cats_name_idx" ON "cats" USING btree ("name");
  CREATE UNIQUE INDEX "cats_wcf_id_idx" ON "cats" USING btree ("wcf_id");
  CREATE INDEX "cats_breed_idx" ON "cats" USING btree ("breed_id");
  CREATE INDEX "cats_ems_code_idx" ON "cats" USING btree ("ems_code");
  CREATE INDEX "cats_owner_idx" ON "cats" USING btree ("owner_id");
  CREATE INDEX "cats_updated_at_idx" ON "cats" USING btree ("updated_at");
  CREATE INDEX "cats_created_at_idx" ON "cats" USING btree ("created_at");
  CREATE INDEX "entries_ring_types_order_idx" ON "entries_ring_types" USING btree ("_order");
  CREATE INDEX "entries_ring_types_parent_id_idx" ON "entries_ring_types" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "entries_external_key_idx" ON "entries" USING btree ("external_key");
  CREATE INDEX "entries_exhibition_idx" ON "entries" USING btree ("exhibition_id");
  CREATE INDEX "entries_cat_idx" ON "entries" USING btree ("cat_id");
  CREATE INDEX "entries_catalog_number_idx" ON "entries" USING btree ("catalog_number");
  CREATE INDEX "entries_show_class_idx" ON "entries" USING btree ("show_class");
  CREATE INDEX "entries_import_batch_idx" ON "entries" USING btree ("import_batch_id");
  CREATE INDEX "entries_updated_at_idx" ON "entries" USING btree ("updated_at");
  CREATE INDEX "entries_created_at_idx" ON "entries" USING btree ("created_at");
  CREATE INDEX "rings_exhibition_idx" ON "rings" USING btree ("exhibition_id");
  CREATE INDEX "rings_judge_idx" ON "rings" USING btree ("judge_id");
  CREATE INDEX "rings_updated_at_idx" ON "rings" USING btree ("updated_at");
  CREATE INDEX "rings_created_at_idx" ON "rings" USING btree ("created_at");
  CREATE INDEX "rings_rels_order_idx" ON "rings_rels" USING btree ("order");
  CREATE INDEX "rings_rels_parent_idx" ON "rings_rels" USING btree ("parent_id");
  CREATE INDEX "rings_rels_path_idx" ON "rings_rels" USING btree ("path");
  CREATE INDEX "rings_rels_users_id_idx" ON "rings_rels" USING btree ("users_id");
  CREATE INDEX "calls_exhibition_idx" ON "calls" USING btree ("exhibition_id");
  CREATE INDEX "calls_entry_idx" ON "calls" USING btree ("entry_id");
  CREATE INDEX "calls_ring_idx" ON "calls" USING btree ("ring_id");
  CREATE INDEX "calls_status_idx" ON "calls" USING btree ("status");
  CREATE INDEX "calls_updated_at_idx" ON "calls" USING btree ("updated_at");
  CREATE INDEX "calls_created_at_idx" ON "calls" USING btree ("created_at");
  CREATE INDEX "results_exhibition_idx" ON "results" USING btree ("exhibition_id");
  CREATE INDEX "results_entry_idx" ON "results" USING btree ("entry_id");
  CREATE INDEX "results_ring_idx" ON "results" USING btree ("ring_id");
  CREATE INDEX "results_judge_idx" ON "results" USING btree ("judge_id");
  CREATE INDEX "results_updated_at_idx" ON "results" USING btree ("updated_at");
  CREATE INDEX "results_created_at_idx" ON "results" USING btree ("created_at");
  CREATE INDEX "import_batches_messages_order_idx" ON "import_batches_messages" USING btree ("_order");
  CREATE INDEX "import_batches_messages_parent_id_idx" ON "import_batches_messages" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "import_batches_key_idx" ON "import_batches" USING btree ("key");
  CREATE INDEX "import_batches_exhibition_idx" ON "import_batches" USING btree ("exhibition_id");
  CREATE INDEX "import_batches_source_file_idx" ON "import_batches" USING btree ("source_file_id");
  CREATE INDEX "import_batches_updated_at_idx" ON "import_batches" USING btree ("updated_at");
  CREATE INDEX "import_batches_created_at_idx" ON "import_batches" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_clubs_id_idx" ON "payload_locked_documents_rels" USING btree ("clubs_id");
  CREATE INDEX "payload_locked_documents_rels_exhibitions_id_idx" ON "payload_locked_documents_rels" USING btree ("exhibitions_id");
  CREATE INDEX "payload_locked_documents_rels_judges_id_idx" ON "payload_locked_documents_rels" USING btree ("judges_id");
  CREATE INDEX "payload_locked_documents_rels_owners_id_idx" ON "payload_locked_documents_rels" USING btree ("owners_id");
  CREATE INDEX "payload_locked_documents_rels_breed_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("breed_groups_id");
  CREATE INDEX "payload_locked_documents_rels_breeds_id_idx" ON "payload_locked_documents_rels" USING btree ("breeds_id");
  CREATE INDEX "payload_locked_documents_rels_cats_id_idx" ON "payload_locked_documents_rels" USING btree ("cats_id");
  CREATE INDEX "payload_locked_documents_rels_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("entries_id");
  CREATE INDEX "payload_locked_documents_rels_rings_id_idx" ON "payload_locked_documents_rels" USING btree ("rings_id");
  CREATE INDEX "payload_locked_documents_rels_calls_id_idx" ON "payload_locked_documents_rels" USING btree ("calls_id");
  CREATE INDEX "payload_locked_documents_rels_results_id_idx" ON "payload_locked_documents_rels" USING btree ("results_id");
  CREATE INDEX "payload_locked_documents_rels_import_batches_id_idx" ON "payload_locked_documents_rels" USING btree ("import_batches_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "clubs" CASCADE;
  DROP TABLE "exhibitions" CASCADE;
  DROP TABLE "exhibitions_rels" CASCADE;
  DROP TABLE "judges_qualifications" CASCADE;
  DROP TABLE "judges" CASCADE;
  DROP TABLE "owners" CASCADE;
  DROP TABLE "breed_groups" CASCADE;
  DROP TABLE "breeds" CASCADE;
  DROP TABLE "cats" CASCADE;
  DROP TABLE "entries_ring_types" CASCADE;
  DROP TABLE "entries" CASCADE;
  DROP TABLE "rings" CASCADE;
  DROP TABLE "rings_rels" CASCADE;
  DROP TABLE "calls" CASCADE;
  DROP TABLE "results" CASCADE;
  DROP TABLE "import_batches_messages" CASCADE;
  DROP TABLE "import_batches" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_exhibitions_status";
  DROP TYPE "public"."enum_cats_sex";
  DROP TYPE "public"."enum_cats_registration_book";
  DROP TYPE "public"."enum_cats_source_system";
  DROP TYPE "public"."enum_entries_status";
  DROP TYPE "public"."enum_rings_stage";
  DROP TYPE "public"."enum_rings_status";
  DROP TYPE "public"."enum_calls_status";
  DROP TYPE "public"."enum_results_stage";
  DROP TYPE "public"."enum_import_batches_messages_level";
  DROP TYPE "public"."enum_import_batches_source_type";
  DROP TYPE "public"."enum_import_batches_status";
  DROP TYPE "public"."enum_media_document_type";`)
}
