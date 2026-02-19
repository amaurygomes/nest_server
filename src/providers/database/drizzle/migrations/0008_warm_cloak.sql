CREATE TYPE "public"."vehicle_type" AS ENUM('CAR', 'MOTORCYCLE', 'BICYCLE');--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "vehicle_type" "vehicle_type";--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "target_vehicle_types" jsonb;