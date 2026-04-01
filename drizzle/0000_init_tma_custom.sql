CREATE SCHEMA "tma_custom";
--> statement-breakpoint
CREATE TABLE "tma_custom"."migration_checkpoint" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
