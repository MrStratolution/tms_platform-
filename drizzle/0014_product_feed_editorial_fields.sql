ALTER TABLE "tma_custom"."cms_product"
  ADD COLUMN IF NOT EXISTS "content_kind" text NOT NULL DEFAULT 'product';

ALTER TABLE "tma_custom"."cms_product"
  ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;

ALTER TABLE "tma_custom"."cms_product"
  ADD COLUMN IF NOT EXISTS "listing_priority" integer;

ALTER TABLE "tma_custom"."cms_product"
  ADD COLUMN IF NOT EXISTS "show_in_project_feeds" boolean NOT NULL DEFAULT false;
