import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('user', 'admin');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"judging_qualifications" varchar,
  	"role" "enum_users_role" DEFAULT 'user' NOT NULL,
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
  
  CREATE TABLE "cats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"wcf_id" varchar,
  	"name" varchar,
  	"birthday" timestamp(3) with time zone,
  	"country" varchar,
  	"club" varchar,
  	"sex" varchar,
  	"breed" varchar,
  	"color" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cat_owners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id_id" integer NOT NULL,
  	"cat_id_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shows" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"chief_steward_id_id" integer NOT NULL,
  	"is_active" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_id_id" integer NOT NULL,
  	"judge_id_id" integer NOT NULL,
  	"steward_id_id" integer NOT NULL,
  	"name" varchar,
  	"event_type" varchar,
  	"event_rating" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cat_event_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cat_id_id" integer NOT NULL,
  	"event_id_id" integer NOT NULL,
  	"status" varchar,
  	"queue_position" numeric,
  	"rating" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
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
  	"cats_id" integer,
  	"cat_owners_id" integer,
  	"shows_id" integer,
  	"events_id" integer,
  	"cat_event_entries_id" integer
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
  ALTER TABLE "cat_owners" ADD CONSTRAINT "cat_owners_user_id_id_users_id_fk" FOREIGN KEY ("user_id_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cat_owners" ADD CONSTRAINT "cat_owners_cat_id_id_cats_id_fk" FOREIGN KEY ("cat_id_id") REFERENCES "public"."cats"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shows" ADD CONSTRAINT "shows_chief_steward_id_id_users_id_fk" FOREIGN KEY ("chief_steward_id_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_show_id_id_shows_id_fk" FOREIGN KEY ("show_id_id") REFERENCES "public"."shows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_judge_id_id_users_id_fk" FOREIGN KEY ("judge_id_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_steward_id_id_users_id_fk" FOREIGN KEY ("steward_id_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cat_event_entries" ADD CONSTRAINT "cat_event_entries_cat_id_id_cats_id_fk" FOREIGN KEY ("cat_id_id") REFERENCES "public"."cats"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cat_event_entries" ADD CONSTRAINT "cat_event_entries_event_id_id_events_id_fk" FOREIGN KEY ("event_id_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cats_fk" FOREIGN KEY ("cats_id") REFERENCES "public"."cats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cat_owners_fk" FOREIGN KEY ("cat_owners_id") REFERENCES "public"."cat_owners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shows_fk" FOREIGN KEY ("shows_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cat_event_entries_fk" FOREIGN KEY ("cat_event_entries_id") REFERENCES "public"."cat_event_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "cats_updated_at_idx" ON "cats" USING btree ("updated_at");
  CREATE INDEX "cats_created_at_idx" ON "cats" USING btree ("created_at");
  CREATE INDEX "cat_owners_user_id_idx" ON "cat_owners" USING btree ("user_id_id");
  CREATE INDEX "cat_owners_cat_id_idx" ON "cat_owners" USING btree ("cat_id_id");
  CREATE INDEX "cat_owners_updated_at_idx" ON "cat_owners" USING btree ("updated_at");
  CREATE INDEX "cat_owners_created_at_idx" ON "cat_owners" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_id_cat_id_idx" ON "cat_owners" USING btree ("user_id_id","cat_id_id");
  CREATE INDEX "shows_chief_steward_id_idx" ON "shows" USING btree ("chief_steward_id_id");
  CREATE INDEX "shows_is_active_idx" ON "shows" USING btree ("is_active");
  CREATE INDEX "shows_updated_at_idx" ON "shows" USING btree ("updated_at");
  CREATE INDEX "shows_created_at_idx" ON "shows" USING btree ("created_at");
  CREATE INDEX "events_show_id_idx" ON "events" USING btree ("show_id_id");
  CREATE INDEX "events_judge_id_idx" ON "events" USING btree ("judge_id_id");
  CREATE INDEX "events_steward_id_idx" ON "events" USING btree ("steward_id_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "cat_event_entries_cat_id_idx" ON "cat_event_entries" USING btree ("cat_id_id");
  CREATE INDEX "cat_event_entries_event_id_idx" ON "cat_event_entries" USING btree ("event_id_id");
  CREATE INDEX "cat_event_entries_updated_at_idx" ON "cat_event_entries" USING btree ("updated_at");
  CREATE INDEX "cat_event_entries_created_at_idx" ON "cat_event_entries" USING btree ("created_at");
  CREATE UNIQUE INDEX "cat_id_event_id_idx" ON "cat_event_entries" USING btree ("cat_id_id","event_id_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_cats_id_idx" ON "payload_locked_documents_rels" USING btree ("cats_id");
  CREATE INDEX "payload_locked_documents_rels_cat_owners_id_idx" ON "payload_locked_documents_rels" USING btree ("cat_owners_id");
  CREATE INDEX "payload_locked_documents_rels_shows_id_idx" ON "payload_locked_documents_rels" USING btree ("shows_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_cat_event_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("cat_event_entries_id");
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
  DROP TABLE "cats" CASCADE;
  DROP TABLE "cat_owners" CASCADE;
  DROP TABLE "shows" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "cat_event_entries" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";`)
}
