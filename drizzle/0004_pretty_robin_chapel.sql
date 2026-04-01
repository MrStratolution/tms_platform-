CREATE TABLE "tma_custom"."cms_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"alt" text,
	"mime_type" text,
	"byte_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_media_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_product" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_product_slug_unique" UNIQUE("slug")
);
