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
