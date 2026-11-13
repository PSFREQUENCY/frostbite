# Degen Dungeon

Wake up broke in Nakasato (Na'ka Sa'ta), an island city of nine boroughs that is New York, Los Angeles and Philadelphia folded together,
and climb from Newbie to Whale over five story days. A run is one day of one hero. DUN is in-game credit only.

## Play

- **Pick a hero** on the 3D ring: ten of them, each with five stats and a story of their own. Volt, Nib, Lumen and Hrimm are Frost Run's
  own models; Omen, Chip, Mint, Rally, Dip and Slip (hidden until the Great Airdrop) are built in code.
- **The five days.** The FREE FROST riot morning, the mania, the winter (it opens on the morning of the drain and ends in the Great
  Airdrop), Launch Day, and Moon Night. Billboards, light, snow and crowds change with each.
- **The first morning** is the same for everyone: cross the riot, hear Frost's speech, take your first DUN at the Faucet and decide where
  your seed paper lives, finish a gig, sleep. A paper in a pocket or on a phone gets found, and the pocket drains live until the hideout
  terminal stops it.
- **Days two to five** follow the hero's own story, three beats a day, marked by a gold beacon and named by Pip on the phone. Some beats
  need the right crewmate, frost vision, DUN or a trade; some ask a question with two answers. Moon Night opens on the hero's dream, then
  the party under Moon Tower, the Genesis Room (it needs a crew of three) and a run through the oldest tunnel to SHA Beach, with Max's
  Vests behind.
- **The city:** honest gigs, a crew of three, the Green Line Express, the Exchange floor's coin, MAXX (twenty a day, until the winter),
  the fit shop, the realtor and the garage, a scooter, a car, a yacht and a helicopter, and the scams: Kiki, the famous face, the
  recovery expert, the dream job, the fake Fed, the permission slip, the sticker on the meter and the honeypot coin.
- **Heat:** stealing earns stars. Two bring a beat cop who fines you; three bring a tux who freezes what he touches; at four even the
  sky is not safe and the wallet locks. Lie low in the hideout under your home, or pay the rebrand booth. Nobody is ever hurt.
- **Frost vision** (V, or its button) shows hidden words, the watcher's footprints and the tells of a scam, for fifteen seconds a day
  (thirty by Lumen's lamp).
- **The mystery:** twenty-one letters signed S lie on the avenues, a few each day; three street words open a dead locker; the watcher
  leaves footprints at one corner a day. The game never says who S is.
- **Status** over your head: GM, SAFU, GRINDER, WAGMI, TOUCHING GRASS, BASED, DIAMOND HANDS, DOWN BAD, PAPER HANDS, DEGEN, BAGHOLDER,
  EXIT LIQUIDITY, RUGGED, REKT or FUDDED.
- **The Time Machine:** reach a worth of 100,000 DUN (or finish Moon Night on SHA Beach) and the Ice Runner statue in The Old Floe
  rises. Step up to it and the next day is a trip back to day one, where your newbie self can be met three times; each answer bends the
  timeline for better or worse, and the timeline carries into the next playthrough.

Keys: arrows or WASD walk, Space or E acts and gives the first answer, 1 to 4 pick an answer, X walks away, V is frost vision, R and F fly
a helicopter, Enter starts, P pauses. On a phone the left thumb steers, a tap on the right acts, and every answer is a button.

## How a day is checked

`src/rules/` is a pure, seeded, whole-number state machine (`degenRules`). Settings are `{ day, hero }`, with `loop` on a trip back or
`fate` for the timeline a story day carries. Inputs are `move`, `act`, `pick`, `lift`, `look` and `end`, each with its tick; the day
runs itself between them. The platform replays the record to the same end and decides the 37 milestones from it. `src/replay.ts`
publishes the rules; `src/sample-run.ts` is a legal day the verifier is shown with.

## Tests

`npx vitest run --config vitest.config.ts --coverage` from this folder. Bots (`test/support/`) play every hero's every story day to the
end, and between them earn every milestone; an idle day earns none.

## Ownership

The game's author owns it; the platform games team reviews every game before it is merged.
