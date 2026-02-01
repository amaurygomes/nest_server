CREATE TYPE "public"."payment_method" AS ENUM('PIX', 'APPROVED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'COMPLETED', 'APPROVED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'ADMIN', 'USER', 'SUPPORT');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('A', 'I', 'E');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" text,
	"machine_id" text NOT NULL,
	"cpf" text NOT NULL,
	"name" text NOT NULL,
	"vtr_number" text NOT NULL,
	"email" text NOT NULL,
	"chave_pix" text,
	"status" "status" DEFAULT 'A' NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "accounts_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "accounts_machine_id_unique" UNIQUE("machine_id"),
	CONSTRAINT "accounts_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "accounts_chave_pix_unique" UNIQUE("chave_pix")
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"status" "payment_status" NOT NULL,
	"message" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"description" text,
	"transaction_id" text NOT NULL,
	"payment_date" timestamp with time zone,
	"pix_copy_paste" text,
	"pix_image_base64" text,
	"payment_method" "payment_method",
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"refunded_by" uuid,
	"refunded_at" timestamp with time zone,
	"refund_reason" text,
	"status_sync_at" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_approved_by_accounts_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_refunded_by_accounts_id_fk" FOREIGN KEY ("refunded_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;