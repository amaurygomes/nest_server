ALTER TABLE "payments" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."payment_method";--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('PIX', 'APPROVED');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method" USING "payment_method"::"public"."payment_method";