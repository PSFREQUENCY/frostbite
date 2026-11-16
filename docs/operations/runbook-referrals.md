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

## Take an earning back

Use this when an earning should not have been paid: abuse found afterwards, a referral attributed to the wrong person, a mistake in the program's
settings, or a claim that did not stick. Only an administrator can. **Freezing** (below) stops _new_ earning; taking back undoes one that already
happened.

1. **Referrals → Referrers**, open the person. Each earning in the list has a **Take back** button.
2. Press it. The page opens a form under that earning, which says in plain words what will happen to the money **before** you confirm. It depends on
   where the earning has got to:

   | The earning is…                         | What taking it back does                                                                                                                                                        |
   | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **Waiting** or **Ready** (in no payout) | The amount leaves their pot. Nothing was paid, so nothing is owed back.                                                                                                         |
   | **In a payout** that has not finished   | That payout still goes out as it is. The same amount is then held back from what they earn next. If the payout fails, the earning returns to the pot and this removes it there. |
   | **Paid**                                | It cannot be taken from their wallet. The same amount is held back from what they earn next, until it is paid off.                                                              |

3. Write the reason (required, up to 500 characters). It is kept with your name and the time and is **not** shown to the referrer.
4. Press **Take back** (the button names the amount). The page then says, in the past tense, what happened. **Show the updated list** reloads it.

What you will see afterwards: the earning stays in the list with a **Taken back** badge and a line saying who did it, when and why, and a new line
beside it (also **Taken back**, a negative amount) that undoes it. Nothing is deleted or edited, and it cannot be undone or done twice. A
referrer's own history shows the line as **Taken back**, without the reason.

If the amount is being held back, their pot can show a minus figure on this page until later earnings pay it off; they cannot ask to be paid
while it is below the minimum. Say so to anyone who asks why a payout is not offered.

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
