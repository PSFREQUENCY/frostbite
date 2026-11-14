# `@frostbite/feature-referrals`

The pages of the referral program (ADR-026, task #200, phase REF-1c): a person's own referral page and history, and the admin section where the
program is run. The earning itself, the ledger and the rules live in `@frostbite/referrals` and `@frostbite/rewards`; this feature only shows
them and changes the two things an administrator may change. Both the public page and the admin pages read the **same program record and
ledger** as the earning does, so what the page says is what is paid.

## Public API

`createReferralsFeature(config)` returns the feature registration (`config` is `configs/referrals.ts`: the ceilings shown as hints on the program
form, the chain a payout is paid on and how long a wait is called delayed, the block explorer and the wallets staff may sign with). Register it once in `configs/features.ts`; removing that line removes every page, route and navigation entry, and the
earning (in the claims) does not depend on it.

| Page                                      | Who                            | What                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/referrals`                              | anyone                         | The terms, read from the program in force. Signed in: the link and code (copy, share), who came, the pot and the way to the minimum                                                                    |
| `/referrals/history`                      | signed in                      | The earnings newest first, a page at a time (`?after=`), and the payouts asked for. Never who minted or what                                                                                           |
| `/admin/referrals`                        | `referral:view` (staff, admin) | Overview: referrers, referred, those who minted, those frozen; what is owed by asset (payable, maturing, in a payout, paid)                                                                            |
| `/admin/referrals/program`                | `referral:administer` (admin)  | The program in force, the form that changes it, and who changed what                                                                                                                                   |
| `/admin/referrals/referrers`              | `referral:view`                | The referrers, filtered (`?filter=`) and sorted (`?sort=`) by address, a page at a time (`?page=`); the pot is in one asset                                                                            |
| `/admin/referrals/payouts`                | `referral:pay` (staff, admin)  | What waits to be paid, the batch (build, review, sign with a wallet or elsewhere, send, follow to the chain) and the batches there have been                                                           |
| `/admin/referrals/referrers/[referrerId]` | `referral:view`                | One referrer: counts, pot, each earning followed to its claim (an administrator can take one back, and sees who took back what and why), payouts, the log of pauses; the pause form for administrators |

| Operation                                                             | Route                                                   | Notes                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setReferralProgram`                                                  | `POST /api/v1/referrals/admin/program`                  | Every setting together, as the signed-in administrator; refusals say which ceiling or range                                                           |
| `setReferrerFrozen`                                                   | `POST /api/v1/referrals/admin/freeze`                   | Pauses or resumes earning for a referrer, with the reason kept; `not-found`, `invalid-reason`                                                         |
| `takeBackReferralEarning`                                             | `POST /api/v1/referrals/admin/take-back`                | Administrator: undoes one earning with a reason kept; answers what happened to the money (`pot`, `pending-payout`, `paid`)                            |
| `requestReferralPayout`                                               | `POST /api/v1/referrals/payouts/request`                | A referrer asks to be paid the pot, to a wallet on their account                                                                                      |
| `getReferralCover`                                                    | `GET /api/v1/referrals/payouts/cover`                   | Staff (`referral:pay`): what the paying wallet holds against what waits in the asset, before a batch is built (a read; the fee comes on top at build) |
| `startReferralBatch` / `submitReferralBatch` / `refreshReferralBatch` | `POST /api/v1/referrals/payouts/{start,submit,refresh}` | Staff (`referral:pay`): build the batch, send what the wallet signed, look at the chain                                                               |

## Who may do what

Looking is for staff (`referral:view`); paying referrers, which moves the platform's money and is signed by the staff member with their own wallet, is `referral:pay` (staff and admin); changing the program and pausing a referrer are for administrators (`referral:administer`). Both
capabilities are granted by `configs`' authorization policy (`@repo/config/authorization`), nowhere else. The pages are not linked from the bar every visitor sees (the navigation spec lists it exactly); the wallet menu of a signed-in person has Referrals (beside My milestones and My profile), and the admin sidebar has Referrals and, for administrators, Referral program. The Program section and the pause form
are shown only to someone who has the Program entry in their navigation (the server refuses everyone else whatever the page shows).

## Dependencies and configuration

`@frostbite/referrals` (reads and the freeze log), `@frostbite/rewards` (the ledger), `@frostbite/database` (one pool, made on first use),
`@repo/ui` (the console frame, cards and rows; styles in `packages/ui/src/styles/referrals.css`). The only configuration is the ceilings
(`configs/referrals.ts`). Every sentence is in `src/domain/copy.ts` and `src/domain/admin-copy.ts`; the terms are written from the program record.

## Invariants

- A page never shows a figure that is not from the program record or the ledger; a referrer's pages never show a name, wallet or what a referred
  person minted.
- An address that is not a referrer (a bad id) is "nothing here", never an error; a view of the list that is not one is the plain list.
- A batch is never told as paid before the network's records show it; a payout is paid, or back in the pot, only by the platform following the transaction. Where the platform serves no network the Payouts page says paying is not available and builds nothing.
- What staff sign is exactly what the platform built and showed; the platform refuses anything else.

## Tests

`pnpm --filter @frostbite/feature-referrals test:unit` (formatting, wording, address reading, DOM tests of every page, state and form),
`test:integration` (the operations and the pages as rendered over real PostgreSQL), `test:coverage`.

## Ownership

Product + engineering. Plan: `docs/referral-plan.md`; runbook: `docs/operations/runbook-referrals.md`. Decision: `docs/decisions/ADR-026-reward-programs-ledger-and-payouts.md`.
