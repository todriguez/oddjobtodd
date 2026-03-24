CREATE TYPE "public"."sem_anchor_status" AS ENUM('none', 'pending', 'anchored', 'failed');--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'agent_pdf' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "sem_anchor_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"object_id" text NOT NULL,
	"state_hash" varchar(64) NOT NULL,
	"state_version" integer NOT NULL,
	"cell_id" text,
	"anchor_kind" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"txid" varchar(64),
	"vout" integer,
	"merkle_root" varchar(64),
	"beef_envelope" "bytea",
	"error_message" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"broadcast_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sem_pending_writes" (
	"id" text PRIMARY KEY NOT NULL,
	"object_id" text NOT NULL,
	"write_kind" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"last_error" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"next_retry_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sem_objects" ADD COLUMN "anchor_status" "sem_anchor_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "sem_objects" ADD COLUMN "on_chain_txid" varchar(64);--> statement-breakpoint
ALTER TABLE "sem_objects" ADD COLUMN "merkle_root" varchar(64);--> statement-breakpoint
ALTER TABLE "sem_anchor_requests" ADD CONSTRAINT "sem_anchor_requests_object_id_sem_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."sem_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sem_pending_writes" ADD CONSTRAINT "sem_pending_writes_object_id_sem_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."sem_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sem_anchor_requests_object_idx" ON "sem_anchor_requests" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "sem_anchor_requests_status_idx" ON "sem_anchor_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sem_anchor_requests_hash_idx" ON "sem_anchor_requests" USING btree ("state_hash");--> statement-breakpoint
CREATE INDEX "sem_pending_writes_object_idx" ON "sem_pending_writes" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "sem_pending_writes_status_idx" ON "sem_pending_writes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sem_pending_writes_retry_idx" ON "sem_pending_writes" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "sem_objects_anchor_status_idx" ON "sem_objects" USING btree ("anchor_status");