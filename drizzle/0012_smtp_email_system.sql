DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'tma_custom' AND table_name = 'smtp_settings'
	) THEN
		CREATE TABLE "tma_custom"."smtp_settings" (
			"id" serial PRIMARY KEY NOT NULL,
			"host" text NOT NULL,
			"port" integer NOT NULL,
			"secure" boolean DEFAULT false NOT NULL,
			"username" text NOT NULL,
			"password_encrypted" text NOT NULL,
			"from_name" text NOT NULL,
			"from_email" text NOT NULL,
			"reply_to" text,
			"active" boolean DEFAULT false NOT NULL,
			"created_at" timestamp with time zone DEFAULT now() NOT NULL,
			"updated_at" timestamp with time zone DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'tma_custom' AND table_name = 'cms_email_template'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'tma_custom' AND table_name = 'email_templates'
	) THEN
		ALTER TABLE "tma_custom"."cms_email_template" RENAME TO "email_templates";
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_templates"
	RENAME COLUMN "slug" TO "key";
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_templates"
	RENAME COLUMN "body" TO "html_body";
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_templates"
	ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'de' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_templates"
	ADD COLUMN IF NOT EXISTS "variables_json" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_templates"
	ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "tma_custom"."email_templates"
SET "key" = REPLACE("key", '-', '_')
WHERE "key" LIKE '%-%';
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_templates"
	DROP CONSTRAINT IF EXISTS "cms_email_template_slug_unique";
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_templates"
	DROP CONSTRAINT IF EXISTS "email_templates_key_unique";
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_templates"
	DROP COLUMN IF EXISTS "name";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_key_language_unique"
	ON "tma_custom"."email_templates" ("key", "language");
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'tma_custom' AND table_name = 'cms_email_log'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'tma_custom' AND table_name = 'email_logs'
	) THEN
		ALTER TABLE "tma_custom"."cms_email_log" RENAME TO "email_logs";
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_logs"
	ADD COLUMN IF NOT EXISTS "template_key" text;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_logs"
	ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'de' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_logs"
	ADD COLUMN IF NOT EXISTS "subject" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_logs"
	ADD COLUMN IF NOT EXISTS "error_message" text;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_logs"
	ADD COLUMN IF NOT EXISTS "payload_json" jsonb;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_logs"
	ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_logs"
	ALTER COLUMN "sent_at" DROP NOT NULL;
--> statement-breakpoint
UPDATE "tma_custom"."email_logs" AS log
SET "template_key" = tpl."key"
FROM "tma_custom"."email_templates" AS tpl
WHERE log."template_id" = tpl."id" AND log."template_key" IS NULL;
--> statement-breakpoint
UPDATE "tma_custom"."email_logs"
SET "template_key" = 'legacy'
WHERE "template_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "tma_custom"."email_logs"
	ALTER COLUMN "template_key" SET NOT NULL;
--> statement-breakpoint
INSERT INTO "tma_custom"."email_templates" (
	"key",
	"language",
	"subject",
	"html_body",
	"variables_json",
	"active"
)
SELECT
	'lead_admin_notification',
	'de',
	'Neuer Lead von {{name}}',
	'<div><p>Ein neuer Lead wurde erfasst.</p><ul><li>Name: {{name}}</li><li>E-Mail: {{email}}</li><li>Telefon: {{phone}}</li><li>Firma: {{company}}</li><li>Service: {{service}}</li><li>Nachricht: {{message}}</li><li>Seite: {{source_page}}</li></ul></div>',
	'["name","email","phone","company","service","message","source_page"]'::jsonb,
	true
WHERE NOT EXISTS (
	SELECT 1 FROM "tma_custom"."email_templates"
	WHERE "key" = 'lead_admin_notification' AND "language" = 'de'
);
--> statement-breakpoint
INSERT INTO "tma_custom"."email_templates" (
	"key",
	"language",
	"subject",
	"html_body",
	"variables_json",
	"active"
)
SELECT
	'lead_user_confirmation',
	'de',
	'Danke für Ihre Anfrage, {{name}}',
	'<div><p>Hallo {{name}},</p><p>vielen Dank für Ihre Anfrage. Wir haben Ihre Nachricht erhalten und melden uns kurzfristig.</p><ul><li>E-Mail: {{email}}</li><li>Telefon: {{phone}}</li><li>Firma: {{company}}</li><li>Service: {{service}}</li><li>Seite: {{source_page}}</li></ul></div>',
	'["name","email","phone","company","service","message","source_page"]'::jsonb,
	true
WHERE NOT EXISTS (
	SELECT 1 FROM "tma_custom"."email_templates"
	WHERE "key" = 'lead_user_confirmation' AND "language" = 'de'
);
--> statement-breakpoint
INSERT INTO "tma_custom"."email_templates" (
	"key",
	"language",
	"subject",
	"html_body",
	"variables_json",
	"active"
)
SELECT
	'lead_admin_notification',
	'en',
	'New lead from {{name}}',
	'<div><p>A new lead was captured.</p><ul><li>Name: {{name}}</li><li>Email: {{email}}</li><li>Phone: {{phone}}</li><li>Company: {{company}}</li><li>Service: {{service}}</li><li>Message: {{message}}</li><li>Page: {{source_page}}</li></ul></div>',
	'["name","email","phone","company","service","message","source_page"]'::jsonb,
	true
WHERE NOT EXISTS (
	SELECT 1 FROM "tma_custom"."email_templates"
	WHERE "key" = 'lead_admin_notification' AND "language" = 'en'
);
--> statement-breakpoint
INSERT INTO "tma_custom"."email_templates" (
	"key",
	"language",
	"subject",
	"html_body",
	"variables_json",
	"active"
)
SELECT
	'lead_user_confirmation',
	'en',
	'Thanks for reaching out, {{name}}',
	'<div><p>Hi {{name}},</p><p>Thanks for your inquiry. We received your message and will get back to you shortly.</p><ul><li>Email: {{email}}</li><li>Phone: {{phone}}</li><li>Company: {{company}}</li><li>Service: {{service}}</li><li>Page: {{source_page}}</li></ul></div>',
	'["name","email","phone","company","service","message","source_page"]'::jsonb,
	true
WHERE NOT EXISTS (
	SELECT 1 FROM "tma_custom"."email_templates"
	WHERE "key" = 'lead_user_confirmation' AND "language" = 'en'
);
