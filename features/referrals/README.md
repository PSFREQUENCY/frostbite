# `@frostbite/feature-referrals`

The pages of the referral program (ADR-026, task #200, phase REF-1c): a person's own referral page and history, and the admin section where the
program is run. The earning itself, the ledger and the rules live in `@frostbite/referrals` and `@frostbite/rewards`; this feature only shows
them and changes the two things an administrator may change. Both the public page and the admin pages read the **same program record and
ledger** as the earning does, so what the page says is what is paid.

## Public API

`createReferralsFeature({ policy })` returns the feature registration (`policy` is the ceilings of `configs/referrals.ts`, shown as hints on
the program form). Register it once in `configs/features.ts`; removing that line removes every page, route and navigation entry, and the
earning (in the claims) does not depend on it.

| Page                                      | Who                            | What                                                                                                                                |
| ----------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/referrals`                              | anyone                         | The terms, read from the program in force. Signed in: the link and code (copy, share), who came, the pot and the way to the minimum |
| `/referrals/history`                      | signed in                      | The earnings newest first, a page at a time (`?after=`), and the payouts asked for. Never who minted or what                        |
| `/admin/referrals`                        | `referral:view` (staff, admin) | Overview: referrers, referred, those who minted, those frozen; what is owed by asset (payable, maturing, in a payout, paid)         |
| `/admin/referrals/program`                | `referral:administer` (admin)  | The program in force, the form that changes it, and who changed what                                                                |
| `/admin/referrals/referrers`              | `referral:view`                | The referrers, filtered (`?filter=`) and sorted (`?sort=`) by address, a page at a time (`?page=`); the pot is in one asset         |
| `/admin/referrals/referrers/[referrerId]` | `referral:view`                | One referrer: counts, pot, each earning followed to its claim, payouts, the log of pauses; the pause form for administrators        |

| Operation            | Route                                  | Notes                                                                                         |
| -------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `setReferralProgram` | `POST /api/v1/referrals/admin/program` | Every setting together, as the signed-in administrator; refusals say which ceiling or range   |
| `setReferrerFrozen`  | `POST /api/v1/referrals/admin/freeze`  | Pauses or resumes earning for a referrer, with the reason kept; `not-found`, `invalid-reason` |

## Who may do what

Looking is for staff (`referral:view`); changing the program and pausing a referrer are for administrators (`referral:administer`). Both
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
- No payout is asked for here: asking to be paid and the batch are REF-1d. The pages say so honestly (the minimum reached, and what happens next).

## Tests

`pnpm --filter @frostbite/feature-referrals test:unit` (formatting, wording, address reading, DOM tests of every page, state and form),
`test:integration` (the operations and the pages as rendered over real PostgreSQL), `test:coverage`.

## Ownership

Product + engineering. Plan: `docs/referral-plan.md` (REF-1c). Decision: `docs/decisions/ADR-026-reward-programs-ledger-and-payouts.md`.
