# `@frostbite/referrals`

Who brought whom, and what a claim earns the one who brought them (ADR-026, task #200, phase REF-1b). Referral is the first **program** on the
reward ledger of `@frostbite/rewards`: this package owns the codes, the link made when an account is made, the freeze of a referrer, and the one
reward kind (`referral-cut`) that turns a completed claim into a share of the platform fee. It holds no money rules of its own: the ledger, the
maturity, the pot and the payouts are `@frostbite/rewards`.

## Public API

`createReferrals({ clock, database, feeAssetKey, newId, policy, randomCode? })` returns:

- `codes`: `ensure(userId)` is a person's code, made the first time it is asked for and the same every time after (two requests at once get the
  same code; a drawn code that is taken is drawn again); `ownerOf(text)` is whose code a text is (any case and spacing; nothing is looked up for a
  text that is not the shape of a code). A code is opaque, 8 characters of an alphabet with no look-alikes and no vowels, whose shape is stated
  once in `@frostbite/shared/referrals` (with the `/r/<code>` and `/sign-in?ref=` addresses).
- `linkNewAccount(transaction, { code, identity, referredUserId })`: makes the **one** link of a new account to its referrer, inside the
  transaction that makes the account (sign-in calls it through the `AccountCreatedHook` of `@frostbite/auth`; nothing else may, so an account that
  already exists is never given a referrer). It answers `linked` or `not-linked` with a reason, and **never fails the account**. It refuses a code
  nobody holds, a person's own code, and a wallet the referrer's own account gave up (a referrer cannot bring themselves back under another account
  with their old wallet). A frozen referrer still gets the link.
- `freezes`: `set(actorId, referrerId, frozen, reason)` (a reason is required, at most 500 characters), `isFrozen(referrerId)` and `history`. A
  freeze is a row of a log and the newest is in force; nothing earned is taken back by a freeze, and nothing is earned during one.
- `accrual.claimCompleted(claim)`: tells the programs that a claim took effect. For a claim of someone referred, the referrer earns `rateBasisPoints`
  hundredths of a percent of the platform fee the claim carried (rounded down), in the fee's asset, **once for that claim** whatever the number of
  times it is told, so it may be told again after a failure. A person nobody referred, a frozen referrer, a program that is off, a fee of nothing and
  a cut that rounds to nothing earn nothing.
- `rewards`: the `@frostbite/rewards` service with this package's kind registered (programs, balances, payouts; no executor yet, that is REF-1d).

`referralCut` is the kind (`defineRewardKind`): event `claim.completed`, settings `{ rateBasisPoints }` (1 to 9,999, so a cut is always below the
whole fee), payload checked on the way in. The program key is `referral`; **the program is off until an admin turns it on** (REF-1c gives them the
page; until then it is a call of `rewards.programs.setProgram`).

## How it is wired

- Sign-in (`features/accounts`): `?ref=<code>` on the sign-in page (made by `/r/<code>`, `apps/web/src/app/r/[code]/route.ts`) is carried in the
  sign-in request itself (`referralCode` of the wallet and email verify requests), never in a cookie or storage. `linkReferralOnNewAccount` is the
  hook given to the wallet and the email repositories. Passkeys only sign in an existing account, so they carry no code.
- Claims (`features/games`): the claims service tells `completed` at every look at a complete claim; `claims-runtime.ts` passes it to
  `accrual.claimCompleted`. Configuration for both is `configs/referrals.ts` (the asset a fee is an amount of, and the ceilings an admin may not
  set the program past).

## Invariants

The database holds them (migration `referrals`): a person has one code and codes are unique and of the shape of a code; an account has one
referrer, never itself, and a code, a link and a freeze are never changed (a trigger refuses it; an account being deleted still takes its rows).

## Why farming is not worth guarding against

A cut is a share of the platform fee of a claim that completed, below the whole of it (the settings refuse a rate of 100%), and the person who
mints has paid that fee and the network's too. Whoever brings themselves back under a second account therefore always loses money, and the
platform keeps most of each fee. So the rules above refuse what is cheap to refuse (a person's own code, a wallet the referrer gave up) and
nothing more: an address a referrer removed is not tracked, and there is no cap on mints per referred person.

## Known limit

A claim that is complete but whose accrual failed is made good the next time anyone looks at the claim; one nobody looks at again is not. A sweep
of complete claims belongs to the durable follow-up of chain transactions (#126).

## Tests

`pnpm --filter @frostbite/referrals test:unit` (the kind), `test:integration` (a real PostgreSQL: codes, the link and each rule, freezes, and the
earning of a claim) and `test:coverage`. The whole path (a code, a sign-in, a claim to complete, the cut in the pot, once) is
`apps/web/test/referral-earning.integration.test.ts`.

## Ownership

Platform engineering owns this package; the product owner owns the program's settings.
