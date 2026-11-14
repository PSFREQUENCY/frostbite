CREATE TABLE "frostbite"."referral_payout_batch_items" (
	"batch_id" uuid NOT NULL,
	"held" boolean DEFAULT true NOT NULL,
	"payout_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frostbite"."referral_payout_batches" (
	"id" uuid PRIMARY KEY,
	"asset_key" text NOT NULL,
	"created_by" uuid,
	"submitted_by" uuid,
	"broadcast_at" timestamp with time zone,
	"chain" text NOT NULL,
	"contract_family" text,
	"contract_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"failure_reason" text,
	"signed_payload" text,
	"state" text NOT NULL,
	"summary" jsonb NOT NULL,
	"transaction_id" text,
	"unsigned_family" text NOT NULL,
	"unsigned_format" text NOT NULL,
	"unsigned_payload" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_payout_batches_no_contract" CHECK ("contract_family" is null and "contract_id" is null),
	CONSTRAINT "referral_payout_batches_state_known" CHECK ("state" in ('constructed', 'simulated', 'awaiting_signature', 'signed', 'broadcast_unknown', 'broadcast_accepted', 'broadcast_rejected', 'pending', 'confirmed', 'indexed_success', 'indexed_failure', 'reconciled', 'complete', 'expired')),
	CONSTRAINT "referral_payout_batches_payload_bounded" CHECK (char_length("unsigned_payload") <= 520000 and ("signed_payload" is null or char_length("signed_payload") <= 520000)),
	CONSTRAINT "referral_payout_batches_signed_coherent" CHECK (("state" in ('constructed', 'simulated', 'awaiting_signature', 'expired')) = ("signed_payload" is null)),
	CONSTRAINT "referral_payout_batches_transaction_coherent" CHECK (("state" in ('constructed', 'simulated', 'awaiting_signature', 'signed', 'expired', 'broadcast_rejected')) = ("transaction_id" is null)),
	CONSTRAINT "referral_payout_batches_broadcast_coherent" CHECK (("transaction_id" is null) = ("broadcast_at" is null)),
	CONSTRAINT "referral_payout_batches_failure_coherent" CHECK (("state" in ('broadcast_rejected', 'indexed_failure')) = ("failure_reason" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "referral_payout_batch_items_batch_payout_idx" ON "frostbite"."referral_payout_batch_items" ("batch_id","payout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_payout_batch_items_held_idx" ON "frostbite"."referral_payout_batch_items" ("payout_id") WHERE "held";--> statement-breakpoint
CREATE UNIQUE INDEX "referral_payout_batches_one_in_progress_idx" ON "frostbite"."referral_payout_batches" ("asset_key") WHERE "state" not in ('broadcast_rejected', 'complete', 'expired', 'indexed_failure');--> statement-breakpoint
CREATE INDEX "referral_payout_batches_newest_idx" ON "frostbite"."referral_payout_batches" ("created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "frostbite"."referral_payout_batch_items" ADD CONSTRAINT "referral_payout_batch_items_oLu0vYGxsQQx_fkey" FOREIGN KEY ("batch_id") REFERENCES "frostbite"."referral_payout_batches"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_payout_batch_items" ADD CONSTRAINT "referral_payout_batch_items_payout_id_reward_payouts_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "frostbite"."reward_payouts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_payout_batches" ADD CONSTRAINT "referral_payout_batches_created_by_auth_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "frostbite"."auth_users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_payout_batches" ADD CONSTRAINT "referral_payout_batches_submitted_by_auth_users_id_fkey" FOREIGN KEY ("submitted_by") REFERENCES "frostbite"."auth_users"("id") ON DELETE SET NULL;