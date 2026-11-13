# Degen Dungeon: handoff

The game is playable end to end: ten heroes, five story days each, the city's systems, the mystery, Moon Night to SHA Beach, and the
Time Machine. What follows is how it fits together, what was decided along the way (all drafts for the owner), and what is left to
polish. The plan it follows is the "Degen Dungeon: game plan" doc (Plan, Stories and Lore tabs).

## How it fits together

| Where           | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/rules/`    | The pure rules. `index.ts` (settings, inputs, score), `day.ts` (start and advance), `tick.ts` (riot, heat fade, FOMO, drain, paper test, MAXX interest, vision, diamond hands, beach), `chase.ts` (cop, tux, Vests), `acts.ts` (the act button, answers, lift, look), `talk.ts` (home, hideout, paper, speech, Frost, floor, MAXX, shops), `market.ts` (the coin), `story.ts` + `chapters.ts` (day-one goals, each hero's beats, the dream, party, Genesis Room), `mystery.ts` (the watcher), `machine.ts` (statue and trip back), `places.ts` + `sites.ts` + `spot.ts` (every place, by day), `world.ts` (geometry and zones), `status.ts`, `milestones.ts` (37). |
| `src/script/`   | Every word, once: `cast.ts` (wake-ups, offers, tells, endings), `lines.ts` (talks, Frost on S, day-one goals), `stories.ts` and `dreams.ts` (beats and endings), `letters.ts` (S's 21 letters).                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/page/`     | `words.ts` (Pip's line and the talk words), `panel.ts` (readouts, answer buttons, vision and lift buttons), `hud.ts` (the note line), `controls.ts` (keys and touch).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/view/`     | three.js: `world-view.ts` assembles the city (`city.ts`, `blocks.ts`, `boards.ts`, `line.ts`, `north.ts`, `era.ts`), people (`actor.ts`, `body.ts`, `faces-*.ts`, `looks.ts`, `npcs.ts`, `newbie.ts`), `crowd.ts`, `airdrop.ts`, `rides.ts`, `statue.ts`, and the camera (`camera.ts`, `cine.ts`). `models/` holds Frost Run's four packed hero models and its shader looks.                                                                                                                                                                                                                                                                                       |
| `test/support/` | `bot.ts` (legal inputs only), `story.ts` (`tellStory` plays any hero's day), `days.ts` and `trips.ts` (the milestone days).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

The first screen is the hero select, so one Enter or one tap starts a run as the platform's contract asks; the opening cinematic plays
at the start of the very first day and can be skipped.

## Decisions made here

- **Days replay alone.** Each story day starts from a fixed pocket and freezer (`dayPockets`, `dayFreezers`); the save remembers the day
  reached. The next day opens only when the day's story is told and slept on.
- **The drain morning** is day three's start: the freezer and rank look gone until the hideout terminal shows otherwise; the pocket really
  is empty. On the first morning the seed paper's test is live: a pocket (without diamond-hand gloves) or a phone photo drains at 12 DUN a
  second until the terminal, and a mattress is found only if the heat brought someone to the door.
- **REKT is a status, not a day end.** Story DUN goes to the pocket, never to `made`; a trade's realised profit does count as made.
- **Airdrop DUN is caught only on the move**, so an idle day earns nothing.
- **The timeline carries** into story days as `fate` (-9 to 9, a hundred DUN a step on the starting pocket). A forged `fate` buys at most
  900 DUN, which makes no milestone easier to earn.
- **Real people and projects** appear only as original stand-ins (Frost, the Ice Runner, the mirror statue, Kiki, Max Leverage's MAXX),
  never by name, likeness or quote. Nobody is hurt: the tuxes freeze, the cop fines, the Vests only get there first.
- **Frost Run's models** (Volt, Nib, Lumen, Hrimm) are copied in as packed text (about 490 KB, roughly 170 KB gzipped) and load in the
  background; until they arrive, and for the six new heroes, bodies are built in code.

## What is left to polish

1. Art: a Blender pass for Omen, Chip, Mint, Rally, Dip, Slip and Bit to match Frost Run's four; real building kits per borough; the
   Liquidity Bell, the Chart rollercoaster, the JPEG museum steps and the hill.
2. More scams on the plan's list as offers (the double-your-DUN screen is in; wrong number and the look-alike locker are not).
3. Close-ups per beat (hands for gigs, a push-in on a scam's tell) and a shot for the statue's rise.
4. Sound per era and effects for the drain, the freeze and the airdrop (one loop and four effects today).
5. Balance: pay, prices and the coin's swings are first guesses; play each hero's five days and tune.
6. The Time Machine: more meetings on later loops, and the newbie walking between places.

## Checks, from the repo root unless noted

```
npx prettier --write games/degen-dungeon configs/games/degen-dungeon.ts
cd games/degen-dungeon && npx tsc --noEmit -p . && npx eslint . --max-warnings 0
npx vitest run --config vitest.config.ts --coverage
cd ../../apps/web && npx vitest run --config vitest.config.ts test/games-config.unit.test.ts test/games-verifiers.unit.test.ts test/verifiers.unit.test.ts test/games-conformance.unit.test.ts test/games-layout.unit.test.ts test/verification-levels.unit.test.ts
cd ../.. && pnpm repository:check
```

When the rules change, re-pin the verifier from the game folder (`bundleVerifier` from `@frostbite/game-sdk/build`, then the new
`sha256` into `configs/games/degen-dungeon.ts`) and, if the sample day no longer replays to its claims, regenerate it from a bot run.

## Not verified

Nobody has played it with hands. No phone, no second browser, no sound check, no frame-rate measurement; the browser contract in
`tests/e2e` was not run here; screenshots were taken in headless Chromium with a software renderer.
