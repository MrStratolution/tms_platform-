CREATE TABLE "tma_custom"."cms_site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"document" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "tma_custom"."cms_site_settings" ("document") VALUES ('{}'::jsonb);
