# `@frostbite/rewards`

What the platform owes people for taking part: one **ledger**, **programs** that say how events earn into it, and **payouts** that settle it. The
referral program is the first; leaderboard prizes and other launchpad rewards are meant to be further programs on the same ledger, not new
plumbing. The decision and the reasons are in ADR-026 and `docs/referral-plan.md` (outside the repository). This package is REF-1a: the
machinery, with **no referral rules in it yet**; the tests run it with a stand-in kind and stand-in executors.

## Public API

`createRewards({ clock, database, executors, kinds, newId, policy })` returns:

- `programs`: `setProgram(actorId, programKey, input)`, `inForce(key)`, `allInForce()`, `history(key, limit?)`. A program is a **setting**: kind,
  the kind's own settings (checked against the kind's schema), on or off, the minimum payout and the maturity delay. Every setting is a row that
  is only ever added, so the newest is in force and the rows are the history. Refused: a bad key, an unknown kind, a **different kind than the
  program already is**, settings the kind does not accept, negative numbers, and numbers past `RewardsPolicy` (the ceilings an admin cannot pass).
- `accrual`: `accrue(event)` tells an event to every enabled program whose kind reads its type and writes what it earns, **once** (the program and
  the earning's `sourceKey` are unique), all together or not at all. `reverse({ programKey, sourceKey })` adds an entry of the opposite amount
  (never edits the earning); it matures with the earning, or now if that has passed, and is done once.
- `balances`: `balance({ beneficiaryId, programKey, assetKey })` returns `payable`, `maturing`, `inFlight` and `paid` (a reversal after payment
  is a debt: `payable` below zero until later earnings pay it off); `entries(beneficiaryId, programKey, { after?, limit? })` is the history, newest
  first, a page at a time.
- `payouts`: `request({ beneficiaryId, programKey, assetKey, destination })` takes **everything payable** (net of reversals), at once, if it reaches
  the program's minimum, under a lock; refused as `below-minimum`, `unknown-program`, `invalid-destination`, or answered `already-open`.
  `begin`, `complete`, `fail` and `cancel` move a payout along; each is idempotent where repeating it can be, and every move is written to its
  audit (`transitions`). `payout(id)` and `open()` read.
- `dispatcher.dispatch(payoutId)` hands a requested payout to the executor for its asset. The payout is marked in progress **before** the
  executor is asked; an executor that throws leaves it in progress (it may have started) and never fails it.

Extension points, all **explicit and registered in code** (nothing is found by looking in folders): `defineRewardKind` and `createKindRegistry`
for how an event earns (a kind names its event type, the schema of its own settings and of the event's payload, and a function to earnings), and
`createExecutorRegistry` for how an asset is paid (`PayoutExecutor`). Adding a reward is writing one kind and listing it; adding a way of paying is
writing one executor and listing it.

## Invariants

The database holds the rules (see the migration `rewards_ledger`), so a second writer or a bug cannot break them:

- An entry is a fact: never changed, never deleted, except the one pointer saying which payout it is in (set only while that payout is `requested`,
  for the same person, program and asset; cleared if the payout fails or is cancelled). Accruals are above zero; a reversal is below zero and names
  what it undoes, once.
- A payout moves only requested → in progress, failed or cancelled, and in progress → complete or failed; one that is over never moves again; what it
  is for never changes; it is never deleted; it does not end without paying while entries are still in it, and completes only with its entries adding
  up to its amount. One payout is open at a time per person, program and asset.
- The three totals of a pot (`unpaid`, `in flight`, `paid`) are kept by triggers, and a test recomputes them from the entries after every kind of move.
  What is still maturing is a range read of recent entries by their index, so **nothing a page reads adds up the whole history**; a test asks the
  database for each query's plan.
- A kind that asks for something no entry may be (zero or negative, an unknown asset, no source, two earnings of one event with one source) is a bug in
  the kind: loud (`RewardKindError`), and the whole event is rolled back.

## Dependencies and configuration

`@frostbite/database` (schema `reward_*`, migration `rewards_ledger`), `@frostbite/shared` (asset references), `drizzle-orm`, `zod`. No environment
configuration: the ceilings of `RewardsPolicy`, the kinds and the executors are given by whoever builds the service (REF-1b onward wires them).
Accounts are referenced with `ON DELETE RESTRICT`: a money record never disappears because an account was deleted, so deleting an account with a
ledger has to be handled by the deletion flow. A person's payout takes all their payable entries in one go, so a very long unpaid history makes one
large payout transaction (fine at the scale in view; compaction is the answer if it ever is not).

## Tests

`pnpm --filter @frostbite/rewards test:unit` (the pure parts), `test:integration` (a real PostgreSQL in a container, every migration applied) and
`test:coverage` (both, with the thresholds). `typecheck` and `lint` as everywhere.

## Ownership

Platform engineering owns this package; the product owner owns the programs' settings.
