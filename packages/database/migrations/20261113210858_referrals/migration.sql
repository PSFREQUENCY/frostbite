CREATE TABLE "frostbite"."referral_codes" (
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid PRIMARY KEY,
	CONSTRAINT "referral_codes_code_shape" CHECK ("code" ~ '^[23456789BCDFGHJKMNPQRSTVWXYZ]{8}$')
);
--> statement-breakpoint
CREATE TABLE "frostbite"."referral_freezes" (
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"frozen" boolean NOT NULL,
	"id" uuid PRIMARY KEY,
	"reason" text NOT NULL,
	"referrer_id" uuid NOT NULL,
	CONSTRAINT "referral_freezes_reason_length" CHECK (char_length("reason") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "frostbite"."referral_links" (
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referred_user_id" uuid PRIMARY KEY,
	"referrer_id" uuid NOT NULL,
	CONSTRAINT "referral_links_not_self" CHECK ("referred_user_id" <> "referrer_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_code_unique" ON "frostbite"."referral_codes" ("code");--> statement-breakpoint
CREATE INDEX "referral_freezes_newest_idx" ON "frostbite"."referral_freezes" ("referrer_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "referral_links_referrer_idx" ON "frostbite"."referral_links" ("referrer_id","created_at");--> statement-breakpoint
ALTER TABLE "frostbite"."referral_codes" ADD CONSTRAINT "referral_codes_user_id_auth_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "frostbite"."auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_freezes" ADD CONSTRAINT "referral_freezes_changed_by_auth_users_id_fkey" FOREIGN KEY ("changed_by") REFERENCES "frostbite"."auth_users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_freezes" ADD CONSTRAINT "referral_freezes_referrer_id_auth_users_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "frostbite"."auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_links" ADD CONSTRAINT "referral_links_referred_user_id_auth_users_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "frostbite"."auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "frostbite"."referral_links" ADD CONSTRAINT "referral_links_referrer_id_auth_users_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "frostbite"."auth_users"("id") ON DELETE CASCADE;--> statement-breakpoint

-- What these tables say is never rewritten: a code stays the person's, a link stays the one made when the account was, and a freeze or an
-- unfreeze is a row, not a change of an earlier one. (An account being deleted still takes its rows with it, by the foreign keys.)
CREATE FUNCTION "frostbite"."referral_rows_are_facts"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'a row of % is never changed', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "referral_codes_never_change"
  BEFORE UPDATE ON "frostbite"."referral_codes"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."referral_rows_are_facts"();
--> statement-breakpoint
CREATE TRIGGER "referral_links_never_change"
  BEFORE UPDATE ON "frostbite"."referral_links"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."referral_rows_are_facts"();
--> statement-breakpoint
CREATE TRIGGER "referral_freezes_never_change"
  BEFORE UPDATE ON "frostbite"."referral_freezes"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."referral_rows_are_facts"();
