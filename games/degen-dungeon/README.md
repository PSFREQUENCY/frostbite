# Degen Dungeon

One open island city, Nakasato, where a broke newbie wakes up to a mess and climbs toward the top by honest gigs, a crew of three and
staying ahead of the tuxes. A run is one day of one hero. This is the scaffold with the hard parts built; `HANDOFF.md` says what exists,
how it fits together and what is left.

## Play

- Left and right choose a hero on the first screen; Enter or a tap wakes them up.
- Arrows or WASD walk. Space or E uses what is near, and says yes to an offer. X or Escape walks away from one.
- R and F take a helicopter up and down a level. P pauses.
- On a phone the left of the screen is the stick and a tap on the right acts.
- Go to your own door to end the day.

## How a day is checked

The rules in `src/rules/` are a pure, seeded, whole-number state machine. The page records only the player's choices; the platform replays
them through the published verifier (`src/replay.ts`) and decides the score and all eighteen milestones itself.

## Tests

`pnpm test` in this folder. Bots prove every milestone can be earned by legal play (`test/fairness.unit.test.ts`).

## Ownership

The game's author owns it; the platform games team reviews every game before it is merged.

## The Time Machine

Reach the top (a worth of 100,000 DUN) and the Ice Runner statue in The Old Floe rises. Step up to it and the day ends inside the Time
Machine; the next day is a trip back to day one, where your newbie self is waking up, queueing at the Faucet and about to be scammed.
Each meeting is a yes or a no, and each answer bends the timeline for better or worse. After the trip the story starts again from day 1.
