# Degen Dungeon: handoff

This is the scaffold of Degen Dungeon with its hard parts built: the rules engine, the replay verifier, the day session, the 3D stage, the
camera with its close-ups, the skippable cinematic, the hero select and the page wiring. What is left is mostly content and art. The design
is the owner's plan doc, "Degen Dungeon: game plan" (three tabs: Plan, Stories, Lore); ask the owner for it and read it first. Follow
`skills/build-a-game/SKILL.md` and its `references/` for everything the platform asks of a game.

## What a player can do now

Pick a hero on the first screen (left and right turn the ring; the card shows the five stats). Enter or a tap wakes them up in their
borough. The first day opens on a cinematic that Space, Enter or a tap skips. Then: walk the nine boroughs, take first DUN from the Faucet,
carry three parcels, answer three offers (one always a scam, one always honest, one decided by the day's seed), recruit a crew of two,
ride the Green Line loop, steal and fence loot, borrow a scooter, car, boat or helicopter, get chased and frozen by a tux at three stars,
cool off at the Rebrand booth, stash DUN in the freezer, find three seed words, catch the Great Airdrop on story day 3 (with a magnet and a
vacuum), and go home to end the day. Fifteen milestones, all replay-verified.

## How it fits together

| Where                                | What it is                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/rules/`                         | The game, as a pure whole-number state machine. `index.ts` is the verifier (`degenRules`); `day.ts` starts and advances a day (movement, the tux, heat, the airdrop); `acts.ts` is what the act button, a yes or no, and a helicopter's lift do; `world.ts` is the island and every spot; `heroes.ts` the cast and stats; `milestones.ts`, `status.ts`, `heat.ts`, `move.ts`, `constants.ts`. |
| `src/session.ts`                     | One day as played: ticks, the player's choices, and the run record.                                                                                                                                                                                                                                                                                                                           |
| `src/view/`                          | three.js. `stage.ts` (renderer, or null without WebGL 2), `city.ts` (island from the rules' numbers), `actor.ts` (stand-in bodies), `camera.ts` (intents: follow, ride, sky, talk, hands), `cine.ts` (shot lists; the opening), `world-view.ts` (day, opening, turntable).                                                                                                                    |
| `src/screen/`                        | The 2D screen: the flat map (whole game without WebGL, corner map with it) and the result card.                                                                                                                                                                                                                                                                                               |
| `src/page/`, `src/main.ts`           | Keys and touch zones, the note and readouts, and the glue to the SDK.                                                                                                                                                                                                                                                                                                                         |
| `src/script/cast.ts`, `src/guide.ts` | Every line of words, once. The first-screen card is the hero select.                                                                                                                                                                                                                                                                                                                          |
| `test/support/bot.ts`                | A bot that walks the streets and uses spots by name. `fairness.unit.test.ts` proves every milestone can be earned.                                                                                                                                                                                                                                                                            |

Rules of the house, already true and to be kept:

- A run is one day of one hero: settings `{ day, hero }`; inputs `move`, `act`, `pick`, `lift`, `end`, each with its tick. Between inputs
  the day runs by `advance`. Only choices are recorded, at most 1,200 a day (the platform caps a record at 64 KB and 5,000 inputs).
- Places are centimetres on the floor, x east and z south; headings are sixteen whole-number vectors; the airdrop counts by patch of ground.
- Nothing in `src/view`, `src/screen` or `src/page` feeds the rules.
- A new place is a row in `world.ts`; a new kind of place is a case in `acts.ts` `useSpot`; a new shot is an intent in `camera.ts` or a
  list in `cine.ts`; a new status is a row in `status.ts`; a new milestone is a row in `milestones.ts` and in the manifest.
- Any change under `src/rules/`, `src/replay.ts` or `src/sample-run.ts` changes the verifier: re-pin its digest (below).

## Decisions made here (drafts for the owner)

1. **The hero select is the first screen, and the opening plays after it.** The platform's browser contract needs one Enter or one tap to
   start a run, so the cinematic cannot stand in front of the first screen. It plays at the start of the first day, the day does not tick
   while it plays, and it is skipped by any act. The plan doc says opening first; this is the nearest thing the platform allows.
2. **The select card is the SDK's first-screen card** (sharp text: name, kind, five stats). Stat bars as page elements are still to do.
3. **Offers are a yes or a no**, not a conversation tree. `DayState.talk` holds the waiting spot. Dialogue graphs are the next step.
4. **Recruiting is one yes** at a hero's spot. The plan's "finish a job in their borough" is content to add.
5. **The tux walks through walls**, a little faster per star, and cannot reach a helicopter in the air. Being caught ends the day.
6. **Story days start from fixed pockets** (`dayPockets`), so each day replays alone. Free days from a saved career are not built.
7. **Stand-in art.** Bodies are primitives in the right colours; the city is one tower per lot. Frost Run's packed hero models
   (`games/frost-run/src/screen/models` on the fork's `game/frost-run` branch) are not copied in yet.
8. Every name, number, line and milestone is a draft: heroes, stats, DUN amounts, heat numbers, FUD, Kiki, Scruff, MAXX.
9. No real people, projects or brands appear, and nobody is hurt: this is the owner's rule for the game and the arcade's.

## What is left, in the order I would do it

1. **Art pass on the cast.** Bring in Frost Run's four packed models and its turntable; build Omen, Chip, Mint, Rally, Dip and Slip the
   same way (Blender scripts, packed). Replace `looks` in `view/actor.ts`. Watch the bundle size and tell the owners what it comes to.
2. **City kit.** Buildings per borough (New York stoops, Los Angeles palms, Philly rowhouses), streets, the Green Line track and train,
   Moon Tower, the mirror statue, the ice runner, SHA Beach signs. Billboards as `CanvasTexture` (words from the plan's Lore tab).
3. **Close-up polish.** The wake-up shot per hero (eyes open, pull back), the hands shot per kind of spot, the tell (a push-in on what is
   off), train-ride cuts. All are shot lists in `cine.ts` played by `world-view.ts`.
4. **Conversations.** A dialogue graph per offer and recruit, the frost-vision red flags, Street Smarts.
5. **The rest of the economy.** The MAXX account and its pause, the seed paper and the drain morning, shops (fits, homes, ride
   upgrades), FOMO and touching grass, the market chart and coin launches, Rep doors.
6. **Heat.** Witnesses, beat cops, freeze trucks, the FUD helicopter and patrol boats, lying low in the hideout.
7. **Days two to five for each hero** (the Stories tab), the eras (mania, winter, Launch Day, Moon Night), Bit, the Genesis Room, SHA Beach.
8. **The airdrop on screen.** Instanced flakes (tens of thousands), the magnet and vacuum effects, the Swap Meet, Slip's reveal. The rules
   are done (`day.ts` `stormed`, `gust`).
9. **Rides on screen and under the thumb.** Models, a touch control for the helicopter's lift (keys R and F work now), boat wake, fishing
   with Dip as a boat gig.
10. **Statuses** that need the market or earlier days (see `status.ts`), and the share card.
11. **Sound.** `src/audio.ts` is still the template's track and effects.

## Checks, from the repo root unless noted

```
npx prettier --write games/degen-dungeon configs/games/degen-dungeon.ts
cd games/degen-dungeon && npx tsc --noEmit -p . && npx eslint . --max-warnings 0 && pnpm env:check
npx vitest run --config vitest.config.ts --coverage
cd ../../apps/web && npx vitest run --config vitest.config.ts test/games-config.unit.test.ts test/games-verifiers.unit.test.ts test/verifiers.unit.test.ts test/games-conformance.unit.test.ts test/games-layout.unit.test.ts test/verification-levels.unit.test.ts
cd ../.. && pnpm repository:check
```

Re-pin the verifier after any rules change, from `games/degen-dungeon`:

```
cat > digest.tmp.mts <<'END'
import { bundleVerifier } from "@frostbite/game-sdk/build";
const built = await bundleVerifier(process.argv[2] ?? ".");
console.log(JSON.stringify({ id: built?.id, sha256: built?.sha256, version: built?.version }));
END
node --experimental-strip-types ./digest.tmp.mts "$PWD"; rm digest.tmp.mts
```

Put the `sha256` in `configs/games/degen-dungeon.ts`. If `src/sample-run.ts` stops replaying to its claims, play it again with the bot.

## Not verified

See the pull request text or the last report for what ran. Nobody has played this with their hands. It has not been run on a real phone,
in other browsers, or through the Docker contract tests (`pnpm test:e2e`). Frame rate, sound and how the stick feels are unknown.
