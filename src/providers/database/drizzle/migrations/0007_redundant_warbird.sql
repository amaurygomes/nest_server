ALTER TABLE "accounts" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "role" SET DEFAULT 'USER'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'ADMIN', 'USER', 'SUPPORT');--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "role" SET DEFAULT 'USER'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "is_partner" boolean DEFAULT false NOT NULL;