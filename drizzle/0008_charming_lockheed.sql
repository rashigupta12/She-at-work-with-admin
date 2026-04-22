CREATE TYPE "public"."banner_element_type" AS ENUM('TEXT', 'BUTTON');--> statement-breakpoint
CREATE TYPE "public"."banner_status" AS ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SCHEDULED');--> statement-breakpoint
CREATE TYPE "public"."icon_position" AS ENUM('left', 'right');--> statement-breakpoint
CREATE TYPE "public"."screen_type" AS ENUM('DESKTOP', 'TABLET', 'MOBILE');--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"screen_type" "screen_type" NOT NULL,
	"page" text NOT NULL,
	"position" text DEFAULT 'top' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"background_color" text DEFAULT '#ffffff',
	"background_image_url" text,
	"background_image_alt" text,
	"background_size" text DEFAULT 'cover',
	"background_position" text DEFAULT 'center',
	"elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "banner_status" DEFAULT 'DRAFT' NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banners_status_idx" ON "banners" USING btree ("status");--> statement-breakpoint
CREATE INDEX "banners_slug_screen_idx" ON "banners" USING btree ("slug","screen_type");--> statement-breakpoint
CREATE INDEX "banners_screen_page_position_idx" ON "banners" USING btree ("screen_type","page","position");--> statement-breakpoint
CREATE INDEX "banners_priority_idx" ON "banners" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "banners_status_dates_idx" ON "banners" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "banners_dates_idx" ON "banners" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "banners_created_by_idx" ON "banners" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "banners_updated_by_idx" ON "banners" USING btree ("updated_by");