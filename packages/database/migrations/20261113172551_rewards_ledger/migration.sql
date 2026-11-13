CREATE TABLE "frostbite"."reward_balances" (
	"asset_key" text NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"in_flight" bigint DEFAULT 0 NOT NULL,
	"paid" bigint DEFAULT 0 NOT NULL,
	"program_key" text NOT NULL,
	"unpaid" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frostbite"."reward_entries" (
	"amount" bigint NOT NULL,
	"asset_key" text NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY,
	"kind" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"payable_at" timestamp with time zone NOT NULL,
	"payout_id" uuid,
	"program_key" text NOT NULL,
	"reverses_entry_id" uuid,
	"setting_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	CONSTRAINT "reward_entries_kind_and_sign" CHECK (("kind" = 'accrual' AND "amount" > 0 AND "reverses_entry_id" IS NULL)
        OR ("kind" = 'reversal' AND "amount" < 0 AND "reverses_entry_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "frostbite"."reward_payout_transitions" (
	"actor_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_state" text,
	"id" uuid PRIMARY KEY,
	"payout_id" uuid NOT NULL,
	"reason" text,
	"to_state" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frostbite"."reward_payouts" (
	"amount" bigint NOT NULL,
	"asset_key" text NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"destination" text NOT NULL,
	"executor" text,
	"executor_ref" text,
	"failure_reason" text,
	"id" uuid PRIMARY KEY,
	"program_key" text NOT NULL,
	"state" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_payouts_state_known" CHECK ("state" IN ('requested', 'in_progress', 'complete', 'failed', 'cancelled')),
	CONSTRAINT "reward_payouts_amount_positive" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "frostbite"."reward_program_settings" (
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enabled" boolean NOT NULL,
	"id" uuid PRIMARY KEY,
	"kind" text NOT NULL,
	"maturity_seconds" integer NOT NULL,
	"minimum_payout" bigint NOT NULL,
	"params" jsonb NOT NULL,
	"program_key" text NOT NULL,
	CONSTRAINT "reward_program_settings_not_negative" CHECK ("maturity_seconds" >= 0 AND "minimum_payout" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "reward_balances_key_idx" ON "frostbite"."reward_balances" ("beneficiary_id","program_key","asset_key");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_entries_source_idx" ON "frostbite"."reward_entries" ("program_key","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_entries_reversal_idx" ON "frostbite"."reward_entries" ("reverses_entry_id") WHERE "reverses_entry_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "reward_entries_unpaid_idx" ON "frostbite"."reward_entries" ("beneficiary_id","program_key","asset_key","payable_at") WHERE "payout_id" IS NULL;--> statement-breakpoint
CREATE INDEX "reward_entries_history_idx" ON "frostbite"."reward_entries" ("beneficiary_id","program_key","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reward_entries_payout_idx" ON "frostbite"."reward_entries" ("payout_id") WHERE "payout_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "reward_payout_transitions_payout_idx" ON "frostbite"."reward_payout_transitions" ("payout_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_payouts_one_open_idx" ON "frostbite"."reward_payouts" ("beneficiary_id","program_key","asset_key") WHERE "state" IN ('requested', 'in_progress');--> statement-breakpoint
CREATE INDEX "reward_payouts_beneficiary_idx" ON "frostbite"."reward_payouts" ("beneficiary_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reward_payouts_state_idx" ON "frostbite"."reward_payouts" ("state","created_at") WHERE "state" IN ('requested', 'in_progress');--> statement-breakpoint
CREATE INDEX "reward_program_settings_newest_idx" ON "frostbite"."reward_program_settings" ("program_key","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "frostbite"."reward_balances" ADD CONSTRAINT "reward_balances_beneficiary_id_auth_users_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "frostbite"."auth_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."reward_entries" ADD CONSTRAINT "reward_entries_beneficiary_id_auth_users_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "frostbite"."auth_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."reward_entries" ADD CONSTRAINT "reward_entries_payout_id_reward_payouts_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "frostbite"."reward_payouts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."reward_entries" ADD CONSTRAINT "reward_entries_reverses_entry_id_reward_entries_id_fkey" FOREIGN KEY ("reverses_entry_id") REFERENCES "frostbite"."reward_entries"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."reward_entries" ADD CONSTRAINT "reward_entries_setting_id_reward_program_settings_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "frostbite"."reward_program_settings"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."reward_payout_transitions" ADD CONSTRAINT "reward_payout_transitions_actor_id_auth_users_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "frostbite"."auth_users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "frostbite"."reward_payout_transitions" ADD CONSTRAINT "reward_payout_transitions_payout_id_reward_payouts_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "frostbite"."reward_payouts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."reward_payouts" ADD CONSTRAINT "reward_payouts_beneficiary_id_auth_users_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "frostbite"."auth_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "frostbite"."reward_program_settings" ADD CONSTRAINT "reward_program_settings_changed_by_auth_users_id_fkey" FOREIGN KEY ("changed_by") REFERENCES "frostbite"."auth_users"("id") ON DELETE SET NULL;
--> statement-breakpoint
-- What the platform owes is held by the database, not by the code that happens to run: the rules below hold whoever writes.

-- An entry is a fact. Nothing about it changes, and it is never deleted, except which payout it is in: put in one (only while that payout is
-- still `requested`, and only one for the same person, program and asset) and taken out again if that payout fails or is cancelled.
CREATE FUNCTION "frostbite"."reward_entries_guard"() RETURNS trigger AS $$
DECLARE
  target "frostbite"."reward_payouts"%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'a reward entry is never deleted';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.payout_id IS NOT NULL THEN
      RAISE EXCEPTION 'a reward entry is made outside every payout';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.program_key IS DISTINCT FROM OLD.program_key
    OR NEW.setting_id IS DISTINCT FROM OLD.setting_id
    OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id
    OR NEW.asset_key IS DISTINCT FROM OLD.asset_key
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.kind IS DISTINCT FROM OLD.kind
    OR NEW.source_key IS DISTINCT FROM OLD.source_key
    OR NEW.reverses_entry_id IS DISTINCT FROM OLD.reverses_entry_id
    OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    OR NEW.payable_at IS DISTINCT FROM OLD.payable_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'a reward entry is never changed';
  END IF;
  IF NEW.payout_id IS NOT DISTINCT FROM OLD.payout_id THEN
    RETURN NEW;
  END IF;
  IF OLD.payout_id IS NOT NULL AND NEW.payout_id IS NOT NULL THEN
    RAISE EXCEPTION 'a reward entry leaves its payout before it joins another';
  END IF;
  IF NEW.payout_id IS NOT NULL THEN
    SELECT * INTO target FROM "frostbite"."reward_payouts" WHERE id = NEW.payout_id;
    IF target.state IS DISTINCT FROM 'requested'
      OR target.beneficiary_id <> NEW.beneficiary_id
      OR target.program_key <> NEW.program_key
      OR target.asset_key <> NEW.asset_key THEN
      RAISE EXCEPTION 'a reward entry joins only a requested payout for the same person, program and asset';
    END IF;
  ELSE
    SELECT * INTO target FROM "frostbite"."reward_payouts" WHERE id = OLD.payout_id;
    IF target.state NOT IN ('requested', 'in_progress') THEN
      RAISE EXCEPTION 'a reward entry leaves only a payout that is not over';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "reward_entries_guard_insert_update"
  BEFORE INSERT OR UPDATE ON "frostbite"."reward_entries"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."reward_entries_guard"();
--> statement-breakpoint
CREATE TRIGGER "reward_entries_guard_delete"
  BEFORE DELETE ON "frostbite"."reward_entries"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."reward_entries_guard"();
--> statement-breakpoint

-- Balances follow the entries: a new entry is unpaid, one put in a payout is in flight, one taken out is unpaid again.
CREATE FUNCTION "frostbite"."reward_balances_follow_entries"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "frostbite"."reward_balances" ("beneficiary_id", "program_key", "asset_key", "unpaid")
      VALUES (NEW.beneficiary_id, NEW.program_key, NEW.asset_key, NEW.amount)
      ON CONFLICT ("beneficiary_id", "program_key", "asset_key") DO UPDATE
        SET "unpaid" = "frostbite"."reward_balances"."unpaid" + NEW.amount;
    RETURN NEW;
  END IF;
  IF OLD.payout_id IS NULL AND NEW.payout_id IS NOT NULL THEN
    UPDATE "frostbite"."reward_balances"
      SET "unpaid" = "unpaid" - NEW.amount, "in_flight" = "in_flight" + NEW.amount
      WHERE "beneficiary_id" = NEW.beneficiary_id AND "program_key" = NEW.program_key AND "asset_key" = NEW.asset_key;
  ELSIF OLD.payout_id IS NOT NULL AND NEW.payout_id IS NULL THEN
    UPDATE "frostbite"."reward_balances"
      SET "unpaid" = "unpaid" + NEW.amount, "in_flight" = "in_flight" - NEW.amount
      WHERE "beneficiary_id" = NEW.beneficiary_id AND "program_key" = NEW.program_key AND "asset_key" = NEW.asset_key;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "reward_balances_entry_insert"
  AFTER INSERT ON "frostbite"."reward_entries"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."reward_balances_follow_entries"();
--> statement-breakpoint
CREATE TRIGGER "reward_balances_entry_update"
  AFTER UPDATE OF "payout_id" ON "frostbite"."reward_entries"
  FOR EACH ROW WHEN (OLD.payout_id IS DISTINCT FROM NEW.payout_id)
  EXECUTE FUNCTION "frostbite"."reward_balances_follow_entries"();
--> statement-breakpoint

-- A payout moves only along the allowed ways (requested to in progress, failed or cancelled; in progress to complete or failed), a payout
-- that is over never moves again, what it is for never changes, and a payout does not end while entries are still in it, except by completing
-- with exactly the entries it was asked for adding up to its amount. Completing moves the amount from in flight to paid.
CREATE FUNCTION "frostbite"."reward_payouts_guard"() RETURNS trigger AS $$
DECLARE
  total numeric;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id
    OR NEW.program_key IS DISTINCT FROM OLD.program_key
    OR NEW.asset_key IS DISTINCT FROM OLD.asset_key
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.destination IS DISTINCT FROM OLD.destination
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'what a payout is for never changes';
  END IF;
  IF NEW.state = OLD.state THEN
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'requested' AND NEW.state IN ('in_progress', 'failed', 'cancelled'))
    OR (OLD.state = 'in_progress' AND NEW.state IN ('complete', 'failed'))
  ) THEN
    RAISE EXCEPTION 'a payout cannot move from % to %', OLD.state, NEW.state;
  END IF;
  SELECT coalesce(sum(amount), 0) INTO total FROM "frostbite"."reward_entries" WHERE payout_id = NEW.id;
  IF NEW.state = 'complete' THEN
    IF total <> NEW.amount THEN
      RAISE EXCEPTION 'a payout completes only with its entries adding up to its amount';
    END IF;
    UPDATE "frostbite"."reward_balances"
      SET "in_flight" = "in_flight" - NEW.amount, "paid" = "paid" + NEW.amount
      WHERE "beneficiary_id" = NEW.beneficiary_id AND "program_key" = NEW.program_key AND "asset_key" = NEW.asset_key;
  ELSIF NEW.state IN ('failed', 'cancelled') THEN
    IF EXISTS (SELECT 1 FROM "frostbite"."reward_entries" WHERE payout_id = NEW.id) THEN
      RAISE EXCEPTION 'a payout that ends without paying lets its entries go first';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "reward_payouts_guard_update"
  BEFORE UPDATE ON "frostbite"."reward_payouts"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."reward_payouts_guard"();
--> statement-breakpoint
CREATE FUNCTION "frostbite"."reward_payouts_guard_delete"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'a payout is never deleted';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "reward_payouts_guard_delete"
  BEFORE DELETE ON "frostbite"."reward_payouts"
  FOR EACH ROW EXECUTE FUNCTION "frostbite"."reward_payouts_guard_delete"();
