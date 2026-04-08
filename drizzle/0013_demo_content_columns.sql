ALTER TABLE "tma_custom"."cms_page"
  ADD COLUMN IF NOT EXISTS "is_demo_content" boolean NOT NULL DEFAULT false;

ALTER TABLE "tma_custom"."cms_lead"
  ADD COLUMN IF NOT EXISTS "is_demo_content" boolean NOT NULL DEFAULT false;

ALTER TABLE "tma_custom"."cms_lead"
  ADD COLUMN IF NOT EXISTS "assigned_to_user_id" uuid;

ALTER TABLE "tma_custom"."cms_page_localization"
  ADD COLUMN IF NOT EXISTS "blocks_total" integer;

ALTER TABLE "tma_custom"."cms_page_localization"
  ADD COLUMN IF NOT EXISTS "blocks_translated" integer;

ALTER TABLE "tma_custom"."cms_page_localization"
  ADD COLUMN IF NOT EXISTS "last_job_completed_at" timestamp with time zone;
