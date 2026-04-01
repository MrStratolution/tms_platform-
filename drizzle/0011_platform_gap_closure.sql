ALTER TABLE "tma_custom"."admin_user"
  ADD COLUMN "ui_locale" text DEFAULT 'de' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_page"
  ADD COLUMN "last_edited_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_page"
  ADD COLUMN "last_edited_by_email" text;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_service"
  ADD COLUMN "summary" text;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_service"
  ADD COLUMN "promise" text;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_service"
  ADD COLUMN "proof" jsonb;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_service"
  ADD COLUMN "active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_service"
  ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_industry"
  ADD COLUMN "summary" text;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_industry"
  ADD COLUMN "messaging" jsonb;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_industry"
  ADD COLUMN "active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."cms_industry"
  ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_page_revision" (
  "id" serial PRIMARY KEY NOT NULL,
  "page_id" integer NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "page_type" text NOT NULL,
  "status" text NOT NULL,
  "document" jsonb NOT NULL,
  "reason" text,
  "actor_user_id" uuid,
  "actor_email" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_audit_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_user_id" uuid,
  "actor_email" text,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
