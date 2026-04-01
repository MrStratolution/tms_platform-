CREATE TABLE "tma_custom"."cms_ab_variant" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"label" text NOT NULL,
	"experiment_slug" text,
	"variant_key" text NOT NULL,
	"weight" integer,
	"active" boolean DEFAULT true NOT NULL,
	"hero_headline" text,
	"hero_subheadline" text,
	"primary_cta_label" text,
	"primary_cta_href" text,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_booking_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"booking_profile_id" integer,
	"provider_event_id" text,
	"scheduled_for" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_booking_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"internal_slug" text,
	"active" boolean DEFAULT true NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_booking_profile_internal_slug_unique" UNIQUE("internal_slug")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_crm_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"target_system" text NOT NULL,
	"status" text NOT NULL,
	"payload" jsonb NOT NULL,
	"response" jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer,
	"template_id" integer,
	"recipient" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_email_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_email_template_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_form_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_type" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_form_config_form_type_unique" UNIQUE("form_type")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_industry" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_industry_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_lead" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"website" text,
	"service_interest_id" integer,
	"industry_id" integer,
	"source_page_id" integer,
	"source_page_slug" text,
	"utm" jsonb,
	"form_type" text,
	"booking_status" text DEFAULT 'none' NOT NULL,
	"owner" text,
	"lead_status" text DEFAULT 'new' NOT NULL,
	"crm_sync_status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"consent_marketing" boolean DEFAULT false NOT NULL,
	"idempotency_key" text,
	"submission_extras" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_lead_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_page_localization" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"locale" text NOT NULL,
	"source_locale" text,
	"job_status" text,
	"last_error" text,
	"hero_headline" text,
	"hero_subheadline" text,
	"seo_title" text,
	"seo_description" text,
	"layout_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_page" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"page_type" text NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_page_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_service" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_service_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tma_custom"."cms_tracking_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"properties" jsonb,
	"lead_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
