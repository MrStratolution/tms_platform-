CREATE TABLE "tma_custom"."cms_case_study" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"industry_id" integer,
	"featured_image_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_case_study_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_team_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"bio" text,
	"photo_media_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"linkedin_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
