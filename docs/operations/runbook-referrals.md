# Runbook: the referral program

How the referral program is switched on and run, and how referrers are paid. The decision is `docs/decisions/ADR-026`; the code is
`packages/rewards` (the ledger), `packages/referrals` (codes, links, the cut, the payout batch) and `features/referrals` (the pages). Staff work
in the console under **Referrals** (`/admin/referrals`); everything below is done from there unless it says otherwise.

**Before paying anyone for real:** legal and tax review of paying referral commissions is still open (ADR-026), as are the first values for
the minimum payout, the maturity delay and the ceilings (`configs/referrals.ts` holds proposals: 30 days and 0.1 BTC). Do not switch the program on
for the public until the owner has named them.

## Who can do what

| Action                                                   | Needs                                  | Held by      |
| -------------------------------------------------------- | -------------------------------------- | ------------ |
| Look at the overview, referrers, one referrer            | `referral:view`                        | staff, admin |
| Build, sign and send a payout batch                      | `referral:pay` (and a wallet, ADR-021) | staff, admin |
| Switch the program on or off, change the rate or minimum | `referral:administer`                  | admin        |
| Pause or resume a referrer                               | `referral:administer`                  | admin        |

Every change to the program and every pause is a new row with who made it and when; nothing is edited in place.

## Switch the program on

1. Sign in as an administrator (a wallet is required for the role). Open **Referrals → Program**.
2. Set the share of the platform fee (hundredths of a percent: 300 is 3%), the minimum payout (satoshis), the maturity delay (seconds an earning
   waits before it can be paid) and tick **Earning is on**. The form refuses a value past the ceilings in `configs/referrals.ts`.
3. Save. The public page `/referrals` shows the new terms at once. An earning is made when a referred person's milestone claim **completes** and the program is on at that look at the claim.
4. Check: open **Referrals → Overview**; the change is in the log on the Program page with your name.

Switching it **off** stops new earnings only. What was earned stays in the pots and can still be asked for and paid.

## Pay a batch

A referrer asks to be paid from `/referrals` (the whole payable pot, to a wallet on their account, once it reaches the minimum and what the network
relays). Their payout then waits in the queue until a batch is paid.

1. Open **Referrals → Payouts**. The queue shows each payout waiting, who for and to which address.
2. Connect the wallet that will pay (the header widget), or type its address. It must be a wallet the deployment allows for staff signing
   (`signingWallets` in `configs/rewards-policy.ts`); otherwise the page shows the transaction to sign elsewhere.
3. Press **Check the wallet covers it**. It says what the wallet can spend, what is still unconfirmed, and what the waiting payouts add up to. The
   network fee comes on top when the batch is built, so a wallet that only just covers the payments will still be refused if it cannot pay the fee.
   This is a look; it changes nothing.
4. Press **Build the batch**. The platform builds one transaction that pays everyone waiting in that asset, each to their own address (a payout under
   what the network relays, or to an address it does not accept, is left out and said so; it stays waiting). A batch whose network fee would be more
   than it pays out is refused. Nothing in the ledger changes yet.
5. **Review** what it shows: each payment and address, the total, the network fee, and until when it is valid. This is exactly what the wallet signs.
6. Sign with the wallet (**Sign with your wallet**), or sign elsewhere and paste the signed transaction. The platform checks that what came back
   pays exactly what was shown and refuses anything else; it then sends it once and the payouts become _in progress_.
7. Leave the page open or come back: it looks at the network every few seconds and says **Sent**, **Waiting for confirmations**, **Confirmed**, then
   **Paid**. A payout is marked paid only when the network confirms the transaction (the confirmations are the chain's policy in
   `configs/rewards-chain.ts`).

If something goes wrong:

| What you see                                         | What it means and what to do                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| _The paying wallet cannot afford this batch_         | Fund the wallet (confirmed coins only are spent) or use another. Nothing was built.                                            |
| _Costs more than it pays_                            | Wait for more payouts or for fees to fall. Nothing was built.                                                                  |
| _What the wallet signed is not what was shown_       | Nothing was sent. Build again and sign what is shown.                                                                          |
| **Expired**                                          | It was not signed in time (its validity is shown). The payouts are waiting again; build a new batch.                           |
| **Refused by the network**                           | Nothing was spent. The payouts are waiting for the next batch.                                                                 |
| **Sent, not yet seen**                               | The network has not been seen to hold it; the platform sends the same signed bytes again and looks again. Do not sign twice.   |
| **Failed** (included, did not take effect)           | Nothing was paid; the payouts are back in the referrers' pots, to be asked for again. Look at the transaction on the explorer. |
| _There is no such batch_, or the page did not answer | Nothing is known to have changed: look at the batches list below, and try again.                                               |

One batch per asset is in progress at a time; asking again returns it. A second staff member opening the page sees the batch in progress.

## Reverse an earning

There is **no console action to reverse an earning yet** (filed as a follow-up). The ledger can undo one (`rewards.accrual.reverse`: a new entry of the
opposite amount, once per earning; a reversal after the money was paid becomes a debt that later earnings pay off first), but nothing calls it from
a page or a command. Until there is, an engineer does it on a request from an administrator, with the earning's entry id from the referrer's page.

What an administrator can do from the console today is stop **new** earning for a person (below).

## Freeze or resume a referrer

1. **Referrals → Referrers**, open the person (search by address; filter by those waiting to be paid).
2. Use the pause form, give a reason (required, kept in the log) and confirm. While paused they earn nothing new and nothing is back-filled when
   they are resumed; what they already earned is untouched and can still be paid. They keep their code and links.
3. Resume the same way. The log of pauses on the page shows who paused or resumed, when and why.

## Check the books

- **Referrals → Overview** shows, by asset, what is owed, what is payable now, maturing, in a payout and paid, from the ledger's own balances.
- What the paying wallet holds is checked against what is waiting on the Payouts page, before a batch is built. There is no separate treasury figure:
  the platform's fee treasury (set on the Game rewards page) and the wallet staff pay from may be different wallets, which is why the check is of the
  wallet you name (open question for the owner in ADR-026).
- Each paid payout carries the transaction id; **Payouts → Batches** lists every batch with its state and transaction.

## Trying it on a test network

1. `REWARDS_CHAIN_RPC_URL` set and working (see `runbook-rewards-chain.md`), and the paying wallet funded with test coins.
2. Switch the program on at a small rate with a minimum of a few thousand satoshis and a maturity delay of 0 (the ceilings permit it).
3. With two accounts, bring one with the other's `/r/<code>` link, let the second complete a milestone claim, and wait for it to complete.
4. As the first account, ask to be paid from `/referrals` to a wallet you hold; as staff, follow **Pay a batch** above with a different wallet.
5. Confirm the payment arrives at the referrer's wallet, the batch reaches **Paid**, and the referrer's pot is empty.

This by-hand run on a real test network has **not** been done yet; the automated tests use the simulated chain and the transaction builder is
tested against fixtures. Record the outcome in `docs/session-findings.md` when it is done.

## Where things are

| Thing                                 | Where                                                              |
| ------------------------------------- | ------------------------------------------------------------------ |
| Program settings (log)                | `frostbite.reward_program_settings`                                |
| Earnings, reversals, balances         | `frostbite.reward_entries`, `reward_balances` (never edited)       |
| Payouts and their states              | `frostbite.reward_payouts`, `reward_payout_transitions`            |
| Batches and which payouts are in them | `frostbite.referral_payout_batches`, `referral_payout_batch_items` |
| Codes, links, pauses                  | `frostbite.referral_codes`, `referral_links`, `referral_freezes`   |
| Ceilings                              | `configs/referrals.ts`                                             |
