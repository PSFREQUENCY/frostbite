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
- **Living streets:** low buildings with rounded corners and little shops on the ground floor ring every block, with round and
  soft-cornered towers set back behind them; lamps, hydrants, benches, bins, newspaper boxes, traffic lights, posters, flyers and a
  billboard over every crossroads; people strolling and stopping to talk; traffic that thickens at rush hour and thins at night; a sun
  that crosses the sky, then the moon and the stars. Walk into seventeen shops (sliding doors, a counter, a clerk): coffee and noodles
  calm FOMO, food and glow sticks give frost vision back, a cut or a wash loses heat, the gym and the bait shop are good for standing,
  the pawn shop buys loot, and the arcade has four cabinets, one go each a day.
- **Landmarks, all open:** walk into round halls with a doorway and an arched canopy, each with one thing to do once a day: dance in
  three clubs (The Mempool, Club Halving, Block Party), catch the late show at Starlight Cinema, plug into a pod at The Dome VR, play
  the Mega Arcade's cabinets, read the whitepaper at Whitepaper Library, see the exhibits at the Museum of Genesis, collect a print at
  Pixel Vault Gallery, cut a track at Bassline Records, go live at Clipstream Studios, and freeze or thaw DUN at First Block Bank's
  teller. The Meme Market Skate Park and Gig Street Green are open to the sky. Lookout posts, NFT vending machines and company names on
  the tallest towers finish it. Every name is an original gag.
- **Rides on the street:** about a hundred cars, fifty scooters and fifty bikes are parked along the kerbs. Breaking into a car brings a
  star of heat; a scooter or a bike is free. Park beside another to step off.
- **The lantern night:** after dark the lantern ground in The Old Floe opens. Write a message, pick a wish (clear sight, respect, a
  cold freezer or a full pocket) and send it up among thousands; the next story day, the crypto gods may answer.
- **The moonshot and the moon:** stake 1,000, 5,000 or 10,000 DUN at the Moonshot Launchpad under Moon Tower; it rides the next launch
  (every thirty seconds), where about one in thirty goes a hundred times up and the rest go to nothing. A lucky shot pays for a seat on
  the shuttle (500,000 DUN, pocket first, then the freezer, on foot and with no heat). Up there, in a helmet, walk the moon's ground,
  meet the colony, take a rock from a crater rim, and fly home from the pad.
- **Cinematic clips:** walking into a shop or landmark for the first time today, finishing an activity or a story beat, a letter, a
  ride, a lantern, a moonshot landing or rugging, and the shuttle each play a short letterboxed clip with a title. The day waits while
  it plays, and any key or tap skips it.
- **The Time Machine:** reach a worth of 100,000 DUN (or finish Moon Night on SHA Beach) and the Ice Runner statue in The Old Floe
  rises. Step up to it and the next day is a trip back to day one, where your newbie self can be met three times; each answer bends the
  timeline for better or worse, and the timeline carries into the next playthrough.

Keys: arrows or WASD walk (up is the way the camera looks), Shift held runs, C crouches, Z crawls, Space jumps, E acts and gives the first
answer, 1 to 5 pick an answer, X walks away, B or I opens the backpack, V is frost vision, R and F fly a helicopter, Enter starts, P
pauses. On a phone the left thumb steers, a tap on the right acts, and the buttons under the screen jump, run, duck, crawl and open the
backpack. The camera rides behind your shoulder and swings round as you turn, comes in close in a narrow street or a shop, pulls back
over a square or on a ride, and cuts in close when you use something. The next place to go glows on the corner map and stands in the
city as a column of light.

## How a day is checked

`src/rules/` is a pure, seeded, whole-number state machine (`degenRules`). Settings are `{ day, hero }`, with `loop` on a trip back,
and on a story day `fate` for the timeline it carries and `boon` for last night's lantern wish. Inputs are `move`, `gait`, `act`,
`pick`, `lift`, `look` and `end`, each with its tick; the day runs itself between them. A jump is only on the screen. The platform
replays the record to the same end and decides the 40 milestones from it. `src/replay.ts` publishes the rules; `src/sample-run.ts` is
a legal day the verifier is shown with. The settings come from the page, so `fate` and `boon` are the page's word, as before.

## Tests

`npx vitest run --config vitest.config.ts --coverage` from this folder. Bots (`test/support/`) play every hero's every story day to the
end, and between them earn every milestone; an idle day earns none.

## Ownership

The game's author owns it; the platform games team reviews every game before it is merged.
