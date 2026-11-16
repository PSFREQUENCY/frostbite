CREATE TABLE "frostbite"."referral_reversals" (
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"earning_id" uuid PRIMARY KEY,
	"reason" text NOT NULL,
	"reversal_id" uuid NOT NULL,
	CONSTRAINT "referral_reversals_reason_length" CHECK (char_length("reason") between 1 and 500)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "referral_reversals_reversal_idx" ON "frostbite"."referral_reversals" ("reversal_id");--> statement-breakpoint
ALTER TABLE "frostbite"."referral_reversals" ADD CONSTRAINT "referral_reversals_changed_by_auth_users_id_fkey" FOREIGN KEY ("changed_by") REFERENCES "frostbite"."auth_users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_reversals" ADD CONSTRAINT "referral_reversals_earning_id_reward_entries_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "frostbite"."reward_entries"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_reversals" ADD CONSTRAINT "referral_reversals_reversal_id_reward_entries_id_fkey" FOREIGN KEY ("reversal_id") REFERENCES "frostbite"."reward_entries"("id") ON DELETE RESTRICT;--> statement-breakpoint

-- What was said of a taken-back earning is never rewritten: the reason, the time and which entries it is about stay as written. Only the name of
-- who did it may go (set to nothing when that account is deleted), which is why the trigger names the columns it guards.
CREATE TRIGGER "referral_reversals_never_change"
  BEFORE UPDATE OF "earning_id", "reversal_id", "reason", "created_at" ON "frostbite"."referral_reversals"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."referral_rows_are_facts"();
