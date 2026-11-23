# Degen Dungeon 1: handoff

The game is playable end to end: ten heroes, five story days each, the city's systems, the mystery, Moon Night to SHA Beach, and the
Time Machine. Round three added living streets, walk-in shops, parked rides, run, crouch, crawl and jump, a shoulder camera, the
backpack, the quest beacon, landmarks, day and night with the lantern night, and the moon colony. Round four opened every landmark,
rounded the city, added the moonshot and the cinematic clips. Round five fixed riding (seats, pedalling, a deck to stand on, doors,
the crew aboard or running alongside), added minivans, motorbikes, pickups and semi cabs and rides that stay where they are left,
the saucers on day two, weather, money pop-ups with receipts, and frost vision that tops back up. Round six put the credits before the hero ring, laid the game out for phones, carved nine masked
statues the hero can play as, opened the landmarks' plazas to feet and wheels, and swapped seven easy milestones for new ones. Later
rounds added the Degen Dash, and then corner stores, gas stations, the freeze ray, Mount WAGMI with its sign, and the badge reveal. What
follows is how it fits together, what was decided along the way (all drafts for the owner), and what is left to
polish. The plan it follows is the "Degen Dungeon: game plan" doc (Plan, Stories and Lore tabs).

## How it fits together

| Where           | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/rules/`    | The pure rules. `index.ts` (settings, inputs, score), `day.ts` (start and advance), `tick.ts` (riot, heat fade, FOMO, drain, paper test, MAXX interest, vision, diamond hands, beach), `chase.ts` (cop, tux, Vests), `acts.ts` (the act button, answers, lift, look), `talk.ts` (home, hideout, paper, speech, Frost, floor, MAXX, shops), `market.ts` (the coin), `story.ts` + `chapters.ts` (day-one goals, each hero's beats, the dream, party, Genesis Room), `mystery.ts` (the watcher), `machine.ts` (statue and trip back), `places.ts` + `sites.ts` + `spot.ts` (every place, by day), `world.ts` (geometry and zones), `rooms.ts` (the walk-in shops), `venues.ts` (the landmarks and their activities), `moonshot.ts`, `parked.ts` (rides on the kerbs), `counters.ts` (shop counters, arcade cabinets, the moon trip), `status.ts`, `milestones.ts` (40).                                                                                   |
| `src/script/`   | Every word, once: `cast.ts` (wake-ups, offers, tells, endings), `lines.ts` (talks, Frost on S, day-one goals), `stories.ts` and `dreams.ts` (beats and endings), `letters.ts` (S's 21 letters).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/page/`     | `words.ts` (Pip's line and the talk words), `panel.ts` (readouts, answer buttons, the lantern's message box), `hud.ts` (the note line), `controls.ts` (keys and touch), `hands.ts` (what each key and button does), `steer.ts` (camera-relative steering), `bag.ts` (the backpack). `src/quest.ts` says where to go next.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/view/`     | three.js: `world-view.ts` assembles the city (`city.ts`, `blocks.ts`, `boards.ts`, `line.ts`, `north.ts`, `era.ts`), people (`actor.ts`, `body.ts`, `faces-*.ts`, `looks.ts`, `npcs.ts`, `newbie.ts`), `crowd.ts`, `airdrop.ts`, `rides.ts` + `kits.ts`, `statue.ts`, and the camera (`camera.ts`, `shot.ts`, `cine.ts`). `town.ts` holds the street level: `blocks.ts` + `lots.ts` + `shell.ts` (low buildings and set-back towers, tiled with `textures.ts`), `street.ts` + `kerbs.ts` + `notices.ts` + `prints.ts` (furniture, posters, murals), `shops.ts` + `shop-props.ts`, `parked.ts`, `walkers.ts`, `traffic.ts`, `venues.ts` + `venue-kits.ts` + `props.ts` + `venue-lots.ts` + `frame.ts` (landmarks), `clips.ts` (clip camera moves), `lanterns.ts`, `beacon.ts`; `moon.ts` is the colony; `era.ts` the sun, moon and stars; `lead.ts` the stances and the jump. `models/` holds Frost Run's four packed hero models and its shader looks. |
| `test/support/` | `bot.ts` (legal inputs only), `story.ts` (`tellStory` plays any hero's day), `days.ts` and `trips.ts` (the milestone days).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

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

- **Round three's rules** (the verifier was re-pinned): `gait` (walk, run, crouch, crawl) changes the pace on foot, and crouching or
  crawling hides loot better and cools heat twice as fast. Rooms are walkable on foot only. Parked rides are once a day each. The
  lantern opens at `nightTick` (tick 12,000); a wish is carried by the page as `boon`, and the seed decides whether it is answered. The
  arcade's four cabinets pay on their own candles, one go each a day. Answers go up to five.
- **The moon costs 500,000 DUN**, and the way there is the moonshot (`moonshot.ts`): a stake of 1,000, 5,000 or 10,000 rides the next
  launch (every 900 ticks), where the seed decides a hit about one time in thirty; a hit pays a hundred times and the profit counts as
  made. One stake flies at a time. The bot day for the To the moon milestone stakes 10,000 on a seed whose first launch hits.
- **Landmarks** (`rules/venues.ts`) are a square floor inside each round hall (26 metres a side, so the round wall in the city always
  stands outside it) behind a doorway, or the whole lot for the skate park and the green; feet only. Each has one activity, once a
  day. The arcade hall shares the arcade shop's cabinets.
- **Clips** (`page/clips.ts`) are decided by the page from the day before and after each step; while one plays the session does not
  tick (like the opening), and anything but a step skips it.
- **Real brands** asked for (a famous record label's tower, a video site's studio) became original stand-ins with original names and
  shapes: Bassline Records (a dark tower with a dancing equaliser) and Clipstream Studios (a camera lens and an on-air light).

- **Round five's rules** (the verifier was re-pinned): `Ride` adds `moto`, `van`, `truck` and `semi` (anything with an engine brings
  `borrowHeat`). `rideId` names the kerb ride under the hero and `left` keeps the last six stepped off (where the hero stood); acting
  near one takes it again, unless a fresh kerb ride is nearer to hand. Hired rides (the scooter, boat and helicopter sites) are never
  left. The saucers (`invasion.ts`): story day 2 from tick 4,500, four beams (`beams`), taken after `beamWait` ticks standing still on
  foot in one; "item-glow" and "item-pizza" mark the hardware and pizza buys; peace adds 100 standing and frost vision, a trade pays
  `tradeTimes` the market; the new cause `abducted` ends the day on the moon pad and `afterDay` sends the story back to day one. The
  weather (`weather.ts`) turns at ticks 1,500, 7,500 and 13,500 for 5,400 ticks; it changes the heat fade and FOMO, never the pace, so
  every bot day still fits. Frost vision is topped up to `visionTicks` every 900 ticks. No milestone was added (the cap of 40 is
  reached).
- **Riding on the screen** (`view/seats.ts`, `riding.ts`, `body.ts`): each ride has seats in its own frame; a code-built body takes a
  seat pose joint by joint, and Frost Run's models bend their leg and arm bones the same way. Cabins have tinted glass so whoever sits
  inside shows through.

- **Round six's rules** (the verifier was re-pinned): `statues.ts` holds the nine statues (one per borough, on the middle street, clear of
  every other spot); acting at one sets `form` (−1 for none) and marks "statue-N" done; a masked hero gets `strideTenths` more on foot.
  The Ice Runner is statue 2 and takes the hero to the Time Machine only once it has risen. Landmark halls have round floors
  (`floorRadius`) and the plaza round them (`outdoors`, past `plazaRadius`) counts as street, as do the open lots. Milestones "faucet",
  "first-gig", "first-crew", "the-speech", "storm-catch", "payday" and "joyride" became "first-contact", "intergalactic-otc",
  "taken-up", "masked", "nine-masks", "road-trip" and "big-rig" (the road trip does not count a semi's cab, so it never shares an event
  with the big rig). The sample day claims "home-safe" and "seed-paper".
- **The page** (`page/credits.ts`, `page/pick.ts`, `touch.css`): the first screen is the title card; one tap or Enter starts the
  platform run at once, as the contract asks, and the run opens on the cinematic and then the hero ring (`#pick`, page words over the
  picture). The day's session is made only when the hero wakes, with the run's seed, so the record's config names the hero played;
  nothing ticks before that. On a phone only the act button shows until a hero wakes; the rest keep their places, unseen. On a touch screen
  the 3D picture fills the frame (`stage.ts` opens the field of view on a tall screen), the game screen keeps only its map at the top,
  and every button is fixed in place.
- **Round 7** (the stick, bodies, climbing, one hero, open ground):
  - The stick (`page/stick.ts`) is a floating one: a thumb anywhere on the left half takes it (the screen's zones never hear of that
    thumb), the ring is put under it, and the slide from there steers (a 9 px dead zone, the knob following out to 40 px). The old fixed
    stick ignored a thumb within 45 px of its middle, most of the drawn ring, so it seemed not to work.
  - Poses (`view/poses.ts`): standing, walking, running, crouching, crawling, climbing, hanging and a jump's tuck as joint angles; a built
    body (`body.ts`) sets its hips down on its lowest leg; Frost Run's models play Duck and Hop and bend their bones by the same poses
    (`models/bend.ts`, a four-legged model crawls low on all fours and tips nose up on a wall). The old crouch squashed the body and the
    old crawl tipped it over.
  - Climbing (`rules/climb.ts`, `rules/world.ts` `wallBeside`): on foot `lift` climbs a building's wall from within 150 cm of it, up to
    three storeys; up a wall the hero cannot walk, act or ride, the cop cannot catch them, a tux at four stars can, and the saucers'
    beams ignore them. The view (`view/climbing.ts`) eases the height at 1.6 m a second, faces the wall and closes in on it. Climb and
    Drop are always in the bar on a desktop and show on a phone only when usable.
  - One hero a game: the ring is offered only before a hero is chosen and once the story is won (`progress.ts` `choosing`, with a new
    `won` field). Days carry the setting `won: 1` once the story is won, and only then do the statues' masks go on (so "masked" and
    "nine-masks" come after the win).
  - Open ground (`rules/venues.ts`): a lot's edge keeps a body's width clear only where a building stands, so the skate park, the green,
    the plazas round the halls and the Old Floe's three lawns (now walkable, and part of the park) open straight from the pavement.
    Before, a 40 cm band round each open lot shut them off. The drawn pavements are 3 m wide (they were 1.6), with the lamps and
    hydrants at the kerb and parked cars just past it.

- **Round 8** (films, washers, shops at work, roofs and windows):
  - Films (`view/movie.ts`): three original 30-second films (title card first) drawn into a canvas texture at 12 frames a second
    and played on Starlight Cinema's screen while the hero is within 90 m.
  - Washers (`rules/laundry.ts`): the laundromat's counter offers a wash (5 DUN) in the next of its five machines, each once a day;
    the day's seed decides each drum's find: change of 10 to 40 DUN (four in ten), an outfit that cools 60 heat (three in ten), or
    lint. A deed may open its own talk now (`pickNode` keeps it), so the find is a short talk.
  - Shops at work (`view/shop-motion.ts`): the drums turn (fast for six seconds after a wash, then stop until the next day), arcade
    screens cycle, the pizza oven flickers, coffee and noodle steam rises; only within 40 m of the hero.
  - Roofs (`rules/world.ts` `onRoof`, `rules/climb.ts`): level 4 is the roof. From the top storey Climb steps 120 cm past the wall
    onto the ring of buildings round a lot (within 9 m of its edge, never a landmark's lot or the courtyard); there the hero walks
    only on roof, and Drop at an edge over a street steps to that street's wall at the top storey. The view gives each building of a
    lot's ring its height (`view/lots.ts` `ringOf`, `roofAt`), splits a wall's storeys up to just under its roof, stands the hero on
    the roof, and lets the camera over roofs lower than the hero (`view/climbing.ts` `buildingAt`).
  - Windows (`rules/windows.ts`): act while clinging climbs in at the window in front (one for every 4 m of wall at each storey),
    once a window a day: a snack (frost vision), a loft (standing), an empty flat, or a shut window (heat).

- **Round 9** (seven days, quests, side quests, badges):
  - The calendar (`rules/calendar.ts`): seven story days over five eras (`[1, 1, 2, 3, 4, 5, 5]`). What a day is like goes by its era
    (places open by `eras(...)`, the coin's lean, gig pay, FOMO, MAXX, the saucers, the storm, the fake drain, billboards, sky and snow);
    the story, the letters (three a day), the watcher and the weather's seed go by the day itself. Each day's pocket and freezer are in
    `dayPockets`/`dayFreezers` (seven each).
  - Quests (`rules/story.ts`): `questsOn(day)` lists a day's quests (three every day), `questOf` the one the hero
    is on, `storyTold` whether all are done. The street days' quests read the day (speech, paper; gig, ride, trade), days 3 to 5 are the
    hero's beats, Moon Night is the dream, the party and a lantern (after dark; round 11 made it the Degen Dash and the party), the last day a crew of two, the Genesis Room and SHA
    Beach. Moon Night's dream is saved (`progress.dream`) and carried into the last day as the `dream` setting.
  - Side quests (`sides.ts`, words in `script/sides.ts`): six a day, read from the day; two markers were added for them, `wall` and
    `roof` (the first climb and the first roof, `climb.ts`) and `staked` (a moonshot stake). Crossing the riot is a side quest now, and
    needs a step (a hero who wakes inside it has not crossed it standing still).
  - The page: Pip's line counts the quest ("2/3 · ..."), the backpack lists the quests and side quests (`page/bag.ts`), and a cheer shows
    over the picture for each one done (`page/toasts.ts`, `#toast`). The title says "DAY 3 OF 7".
  - Milestones: one per story quest (twenty), ten top skills, nine hidden ones with riddles for words; thirteen of the old ones are side
    quests now. The verifier was re-pinned and the sample day claims the first morning's two quests.

- **Round 10** (walking on phones, the visitors' saucer, bumping into people):
  - Phones: a press on the drawn stick (`page/stick.ts`) steers at once from the ring's middle, so holding its edge walks without a
    slide (a sliding finger can be taken for a scroll and cancelled by some phones and app frames); a touch on the stick's half is kept
    from the page from `touchstart`, and a pen steers like a finger. The preview's own page no longer scrolls on a phone.
  - The visitors (`rules/invasion.ts`): each saucer is a visit of its own (`beamup-N`); the first peace or trade ends the mania's
    alarm; from day 4 on the saucers come back as friends (the `visit` talk, whose third answer sets the hero down). Beam-ups are
    counted in the save (`progress.beamups`) and handed to each run as the `beamups` setting; thirteen open `ride-saucer` on the Old
    Floe lawn (`saucerPad`), a flying ride like the helicopter (`flies`, pace 54). The Saucer pilot badge is the fortieth milestone.
  - Bumps (`view/bumps.ts`): the street's walkers and talking pairs (`view/walkers.ts`) and the riot and party crowds (`view/crowd.ts`)
    stagger, fall and get up, or hop clear of a ride. View only: the street's people are not in the rules.

- **Round 11** (the official name, and the Degen Dash):
  - The official name is Degen Dungeon 1 (the id stays `degen-dungeon`).
  - The Degen Dash (`rules/course.ts` the places, `rules/dash.ts` the rules, words in `script/dash.ts`): from day 2, Miss Mirinda's arch
    (`dash`, a talk spot whose act starts a run or opens her `zuri` talk; a ride is stepped off there first) and, while a run is on
    (`dash` > 0 opens spots marked `dash: true`), her desk (`dash-desk`, node `quiz`) and the Dash car (`ride-dash`, a hired car of
    rank 0, so no heat). These three are listed after the kerbs' parked rides so that the kerbs stay where they were. The day gained
    `dash` (the stage, 1 to 9), `dashFrom` (the clock's start; after a finish, its stop, for the parade), `dashTime`, `tickets` and
    `zuri` (where she waits). Each tick `dashed` clears the stage the hero is on when they are in its reach the right way (gait 1, 2
    and 3, the top storey, the roof, frost vision, any engine, the desk's right answer, then the arch on anything), closes the course
    after `dashMax` (six minutes), and pays at the line: under `dashPar` (3,000 ticks) with no star of heat is a win (`dash-won`,
    50,000 DUN once a day, counted as made), else a finish (`dash-finished`, 1,000 DUN once a day). A wrong answer adds
    `quizPenalty` (300 ticks) and asks again; four questions, one a day by the seed. Miss Mirinda walks up at `zuriTicks` (or as soon after as
    the hero is free: on foot in the street, no ticket, no talk, no drain, not on the moon) and waits until the hero is 9 m off; act
    beside her, with no place in reach, opens her talk (`zuri-N` marks each hour as served). She never stops the hero.
  - Story and badges: Moon Night's plan is the dream, `dash` (finished, won or not) and the party, which now needs the Dash finished.
    The lantern is a Moon Night side quest (in place of painting a ride) and keeps its badge, now earned by a lantern on Moon Night.
    Frost's speech is still day 1's first quest but has no badge; "degen-dash" (the Dash won, on any day) took "heard-frost"'s place,
    so the story's set is still twenty. The sample day claims only "seed-paper". The verifier was re-pinned.
  - The view: Miss Mirinda (`view/zuri.ts`) is the town's jointed body (`body.ts` now names its hips, spine, head and forearms) dressed in a
    turquoise halter crop top and a long high-waisted skirt with a high split, gold hoops, choker, bangles and chain belt, a gold ticket,
    and an Afro-hawk of 520 instanced coils over cropped sides. `view/dash-view.ts` stands her at the arch, at the desk on a run, or
    walks her up from behind the hero; `view/dash-course.ts` draws the arch (sign, neon, chequered line), each gate's obstacle, a ring
    at the next gate, the frost-vision mark, and the Dash car; `view/parade.ts` throws confetti and fireworks and holds the trophy over
    the champion for 30 seconds, and the crowd (`crowd.ts`, a "parade" gathering) lines the avenue with CHAMPION! signs. The page shows
    the stage and clock in Pip's line, points the beacon at the next gate (or the car), lists the ticket, trophy, print or medal in the
    backpack and cheers each step.
  - `rules/boarding.ts` took boarding, the Green Line and stepping off out of `acts.ts`, which had grown past 300 lines.

- **Round 12** (corner stores, gas stations, the freeze ray, Mount WAGMI with its sign, the badge reveal):
  - Places: nine corner stores (two that were already bodegas and seven new rooms) and six Gwei Gas stations, built on the lots' outer
    faces where the middle streets had no room (`rules/rooms.ts`: `shops` and `outers`; `view/lots.ts` leaves a gap in the ring of
    buildings for each). Their spots (freezers, ATMs) and the ID kiosk are `storeSites`, listed after the kerbs so the kerbs' ride ids
    stay put. Prices and what each item does are `rules/stores.ts` (a draft): a Fuzzy, a full tank and the ATM need a Nakasato ID
    (100 DUN at the kiosk, carried in the save as `idCard`, written into a story day's settings as `idcard: 1`).
  - The freeze ray (`rules/freeze.ts`): reading the request ("the max you can freeze is 36 / 63, in a closed space") as Sub-Zero at
    36 frozen at once and 63 the most at once, each thawing after 30 seconds (900 ticks). A shot reaches 12 m along the last heading
    walked (`facing`), a metre either side, nearest first; 15 ticks between shots. Packed places make 36 possible: the crowds now stand
    where the rules put them (`rules/crowd.ts`), so the riot, Moon Night's party and a Dash parade can be caught, and so can parked
    rows. Only a masked hero (a statue come to life) opens the frost and fires. Clerks behind the bulletproof glass, the machines and
    Miss Mirinda cannot be frozen. "Sub-Zero" took "A brighter timeline"'s place, and "Is that me?" became "Butterfly effect" (a trip back
    that leaves the timeline bent), so there are still forty.
  - Mount WAGMI (`rules/mountain.ts`): an ellipse of land east of The Old Floe that the Floe's middle street walks onto; the sign's
    footprint is closed; each letter climbs like a wall from the terrace in front of it, at the seat nearest the climber (a W has
    three, an M two, the rest one), and its top takes a sitter (`done` gets "wagmi"). The rules have no heights: the view's
    `hill.ts` is the ground (a ridge just behind the sign, a flat terrace under it, a shore that slopes under the sea), `trail.ts` the
    switchback trail, `letters.ts` the letters' outlines, tops and the way up each stroke, `wagmi.ts` the letters (white panels, 10.2 m)
    and their plank scaffold. The camera's new "vista" intent sits over the sitter's shoulder looking down at the city, the haze lifts,
    and the page hides its overlays (`data-vista`). The old floating hill sign in `boards.ts` is gone.
  - The look of the ray: `view/ray.ts` (chrome with a painted holographic world to reflect, a nitrogen chamber that sloshes and
    bubbles, ice rings, circling frost motes), `view/beam.ts` (a white core, an ice-blue glow, glass rings that bend what is behind
    them, frost lifting off), `view/ice.ts` (a cracked crystal shell round everything frozen, shrinking in its last two seconds),
    `view/ray-view.ts` (the case in the deli's freezer, the ray in the form's hand, the beam, the ice, the lookout's haze) and
    `view/aura.ts` (the butterfly effect, worn). The frozen hold still: a crowd member, a person at a place, a chaser.
  - The badge reveal (`page/badges.ts`, `page/emblems.ts`, `badges.css`, `medal.css`): a medallion in one of four metals with an
    emblem per badge drops in spinning, glitters and throws confetti, shows the badge's name, then flies to the badge tray in the
    picture's corner, which counts the badges the platform lists as unlocked plus those earned since. Badges earned together queue.
    A browser that asks for less motion gets it still.
  - Controls: G (and a Freeze ray button shown only while the ray is held) fires; the score bar shows how many are frozen.
- The first morning and the lofts (all names and numbers are drafts for the owner):
  - The Global DEX (`view/dex.ts`, the bank landmark relabelled): a granite podium a metre up with quarter-metre steps (`podiumAt`, which
    `hillAt` uses for everyone who walks there), eight columns, a pediment, a gold GLOBAL DEX sign and an open vault door. The riot
    (`rules/crowd.ts`) now packs the street in front of it, 60 m along and 12 across, and Frost speaks from its steps.
  - ADOR (`rules/venues.ts` kind `store`, `view/ador.ts`): a department store across the street with a perfume counter, fashion racks,
    an electronics table, mannequins and the Omi Omy drinks bar. Gwei Gas moved from its lot to Cold Harbor's south-west lot.
  - The errands (`rules/errands.ts`, words in `script/errands.ts`): day one has three quests now: the speech, the wallet (found where the
    riot stood, given back to Pearl at ADOR's perfume counter, +200 DUN), and the seed paper. Stepping back out of ADOR starts the
    snatch: a thief in a grey hoodie runs east and then south at 15 cm a tick (quicker than a walk, slower than a run); a hero on foot
    within 1.5 m catches him, and Rosa's purse back is day one's second side quest (+300 DUN; it replaces the pizza).
  - The lofts (`rules/rooms.ts` `lofts`, `rules/lofts.ts`, `view/lofts.ts`, words in `script/lofts.ts`): a room per hero in their
    borough's north-west lot between its shop and the avenue (Hrimm's in Floe's south-east lot, as the lawns fill the others; Slip's on
    the outer side of Nib's lot). The bed is where the hero wakes. Rent (100, 150, 200, 250, 400, 600 and nothing on the last day) is
    paid to the landlord on the street by the door; unpaid at nightfall, the bed, the freezer and boxes go on the kerb, a seed paper in
    the bed or the freezer is found (the drain), and the bed is refused until the rent and a 100 DUN late fee are paid. Sleeping with
    the rent unpaid is allowed, but the next story day starts on the kerb (`owed`, a new setting, story days from the second on). The
    upgrades (patio 500, balcony 1,500, top floor 5,000) are bought in turn once the rent is paid and carried as `loft` (1 to 3). Pip
    warns a minute before nightfall, and the beacon points at the landlord while rent is owed. The Grinner statue and one of S's
    letters moved a few metres to keep the Meme Market lofts' doorsteps clear. The verifier was re-pinned; the sample day now pays the
    rent and goes to bed in the loft.

- Miss Mirinda and the lit Dash (drafts for the owner):
  - Zuri is now Miss Mirinda in every word (the code keeps `zuri` in its ids, the talk node `zuri` and `view/zuri.ts`).
  - Mastery (`rules/mastery.ts`): from the second day, the first time a top skill's milestone condition holds today, the hero is handed
    a Degen Dash ticket (at most three held) and `mastered-` plus the skill's id is noted; the page cheers it with the teacher's name
    (`script/dash.ts` `masters`). The Dash bot's second run of a day now runs on the ticket its first run's roof earned.
  - The lit route (`view/dash-route.ts`): while a run is on, about 250 tiles of light along the streets from gate to gate (`legOf` picks
    the corner that keeps to the streets; the wall to roof to frost mark hops cut straight), the leg to the next gate pulsing gold, and
    about 300 instanced spectators on both sides, every fourth with a sign, bouncing. Three draw calls for the crowd, one for the ribbon.

- The concert (`rules/concert.ts`, `view/concert.ts`, words in `script/concert.ts`; names, prices and times are drafts): the flyer crew
  (day two, The Exchange's middle street), the stadium gate (a flyer is the pass), the stage door from `showTick` (10,800), Omi Omy in
  ADOR (spirit625, 25 DUN, alcohol free), the show (`concert-show`, +20 rep, a 30-second clip whose camera cuts round the stage, `view/
clips.ts`; the view keeps its own 30-second clock as the day waits), and The Long Game (Block Party renamed; Miss Mirinda's model on
  its floor; `partner-0` to `-2`, right moves 0, 1, 2; `danced-mirinda`, +10 rep). Day two's Green Line and street-words side quests
  gave way to the show and the dance. Lux is an original singer: black hair in two buns, a pink top, a black skirt.

- Food (`rules/food.ts`, `view/food.ts`, words in `script/food.ts`; names and prices are drafts): `ateAt`, `streamFrom` and `gang` on
  the day; hunger is `hungerOf` (full at 9,000 ticks), never blocking anything but the stream, and Pip's line shows it (after the rent
  warning). Spots: three shacks, the Floe Food Court on lawn (2, 2), Biscuit beside it (open between `dog-asked` and `dog-found`), the
  stream pod in The Dome VR, and Ms. Opal at Diamond Hands' counter (an outer room on Clipstream's north-west lot; it has no shop
  counter). The gang walks up once when `made` reaches 50,000 on foot outside a run and leaves if the hero walks 24 m off; refusing adds
  `heatPerStar`. Side quests swapped: day four's window for Biscuit, day five's new home for the drive-through, the last day's five rides
  for the Diamond Plate. Gwei Gas is Silky in every word; the spinning signs are view-only.

- Powers (`rules/powers.ts`, `view/powers.ts`, names in `script/powers.ts`; a draft): a new `power` input (Q and a Power button),
  `powerAt`, `boostUntil` and `senseUntil` on the day, `powerCooldown` and `boostPace` in `constants.ts` (so `move.ts` and `day.ts`
  need not import the powers). Levels come from today's `mastered-` notes. Leaps land only on open street; the breath freezes for ten
  seconds and the bear's hold lasts five seconds a level, both on the freeze ray's list without its heat. The ram's "sense Satoshi" is
  read as S's letters (S signs as Satoshi in the story).

- Underground (`rules/caves.ts`, `view/caves.ts`, words in `script/caves.ts`; a draft): like the moon, far off the map (x 1,200 m and
  up): the way is four boxes (`caveWay`) and the bazaar's hall, walkable by `move.ts` while the hero is in them; `hillAt` steps the view
  down to -8 m. Spots: the cave mouth (34,800, 35,400), the climb out, the bazaar's stairs on The Shaft's street (9,800, 30,300), the
  stairs up, three traders, and the Light Re-emitter (31,800, 6,000). The guard's talk opens by itself (`caveTick`) the first time the
  hero walks into the hall without `bazaar-main`, and either answer walks them up. The re-emitter's five places are `beams(hero)`. In the
  words the Time Machine is the Light Re-emitter; the code and the milestone ids keep `machine`.

- The shop, the train and the board (`rules/business.ts`, `view/train.ts`, `view/lift.ts`, `view/clues.ts`; numbers are drafts):
  `tillAt`, `line` and `skated` on the day, and a new ride, `board`. The till is `tillOf` (day × a DUN a second, capped at `tillCap`,
  3,000), emptied at `till-<hero>` in the loft (talk `till`, deed `biz-till`, which adds `till` to the day's notes). A stop now starts
  `line` (from the stop, to the next borough) and `lineTick` carries the hero along over `lineTicks` (150), the lifts `lineLift` (15)
  each end; aboard, `act` and powers are refused, the chasers lose the hero and no beam takes them; `rides` counts on arrival. The
  skate park's talk hands a board (`biz-board`); `skateTick` counts ticks rolling inside the park and calls the activity at 150. The
  view lifts the hero (`liftOf`: the lift, the deck at 22.6 m, a beam up to 17 m) through the climber, and the camera goes wide (`sky`).
  `cluesOf` in `quest.ts` lists the clues frost vision lights. The bot's `ride()` and `use("stop-…")` wait out the ride.

- The full halls (view only; numbers and names are drafts): `view/insider-plans.ts` lists every landmark's people by kind in the hall's
  own frame and `view/bazaar.ts` the bazaar's; `view/insiders.ts` draws them as instanced bodies, heads, legs, arms, bags and boards,
  only for the places within 52 m of the hero (the bazaar while underground), with `bumps.ts` for the ground floor's people;
  `view/insider-poses.ts` moves them (rings, lines, escalator rides, standing, trading, sitting, dancing, skating). `view/dex-floor.ts`
  is the DEX's trading floor and security (the bank kit in `venue-kits.ts` is now just the teller's desk and the gold), its tickers made
  up coins on canvas textures; `view/mall.ts` is ADOR's shops, gallery floor (a ring drawn from above only) and escalators. The hero
  stays on ADOR's ground floor: the rules have no upper floor inside a hall. `view/knocks.ts` draws the corner stores' and stations'
  aisle goods (`aisleGoods`, no longer static props) and knocks those within reach of a moving hero; one stock clerk tidies the shop
  the hero is in, and a shop the hero leaves is tidied at once.

- Places as people and things (view only): the city's ground discs are gone (`city.ts` keeps the beacon and the watcher's steps; the
  beacon lost its ground ring). `view/things.ts` draws each pickup kind from small part lists (`pieces`) and the ride stands' kits, with
  a turning star (gold within 50 cm of `questAt`). `view/npcs.ts` now also stands people at `fence` and `gig` places, never at a loft's
  laptop, and gives each a speech bubble or the gold "!". `view/beat-scenes.ts` reads a scene from the beat's words (`sceneOf`, a
  keyword table, "person" when nothing matches) and stands its things and someone at the beat, facing the hero as they first see it.

## What is left to polish

1. Art: a Blender pass for Omen, Chip, Mint, Rally, Dip, Slip and Bit to match Frost Run's four; modelled kits for the landmarks (they
   are boxes, columns and domes today); the Liquidity Bell, the Chart rollercoaster and the hill. Walkers are simple instanced figures.
2. The arcade's cabinets and the landmarks' activities are choices with a clip, not playable mini-games; the clips are camera moves
   round the hero, not authored animation.
3. More scams on the plan's list as offers (the double-your-DUN screen is in; wrong number and the look-alike locker are not).
4. Close-ups per beat (hands for gigs, a push-in on a scam's tell) and a shot for the statue's rise.
5. Sound per era and effects for the drain, the freeze and the airdrop (one loop and four effects today).
6. Balance (including the moon fare): pay, prices and the coin's swings are first guesses; play each hero's five days and tune.
7. The Time Machine: more meetings on later loops, and the newbie walking between places.
   7a. The Degen Dash: the par (1:40) is the bot's best (about a minute) plus room for a person; tune it once people have played it. The
   trophy and the print stay in the backpack for the day they are won, not across days. The parade is confetti, fireworks, the trophy
   and the crowd, not floats or a band.
8. The living statues use the code-built body in their stone and mask, not the carved figure's muscles. Hrimm (the big ice model)
   still towers over a bike; Volt, a four-legged model, stands on a deck rather than sitting. The saucer
   abduction is a cut to the moon and a clip, not an authored beam-up.
9. The next rounds asked for (see PR.md's roadmap): the statues' clues and the clue book, the basketball court, six parks, the ADOR department store and businesses, the Global DEX, three theatres, the hacker and mining lines, car lots, alleys, the
   studio apartment and storage, The Fuzzy Spot, the fashion districts, the jeweler to wizard line, the music career and the art gala.

10. The freeze ray is held at the hip, not in a posed hand; the deli's case is best seen from inside the freezer aisle. Mount WAGMI's
    trail is a guide only (the whole slope can be walked) and the camera only keeps above the ground, it does not look round the hill.

## Checks, from the repo root unless noted

```
npx prettier --write games/degen-dungeon configs/games/degen-dungeon.ts
cd games/degen-dungeon && npx tsc --noEmit -p . && npx eslint . --max-warnings 0
npx vitest run --config vitest.config.ts --coverage
cd ../../apps/web && npx vitest run --config vitest.config.ts test/games-config.unit.test.ts test/games-verifiers.unit.test.ts test/games-milestone-art.unit.test.ts test/games-conformance.unit.test.ts test/games-layout.unit.test.ts test/verification-levels.unit.test.ts
cd ../.. && pnpm repository:check
```

In this sandbox `pnpm repository:check` stops at its licence step (the pnpm store lacks one external package's index); its policy step,
`node --experimental-strip-types tooling/repository-policy/src/check.ts`, passes.

When the rules change, re-pin the verifier from the game folder (`bundleVerifier` from `@frostbite/game-sdk/build`, then the new
`sha256` into `configs/games/degen-dungeon.ts`) and, if the sample day no longer replays to its claims, regenerate it from a bot run.

`src/view/stage.ts` refuses a software renderer (the browser's own `failIfMajorPerformanceCaveat`, then the renderer's name), so
headless Chromium gets the flat page, as CI's e2e browsers do. To screenshot the 3D picture there, hide the name from the page first:
`context.addInitScript(() => { const get = WebGL2RenderingContext.prototype.getExtension; WebGL2RenderingContext.prototype.getExtension = function (name) { return name === "WEBGL_debug_renderer_info" ? null : get.call(this, name); }; })`.

## Not verified

Nobody has played it with hands. No phone, no second browser, no sound check, no frame-rate measurement; the `tests/e2e` suite itself
needs PostgreSQL, SeaweedFS and Inngest and was not run here (its game contract and keyboard checks were repeated against the preview at
its four device sizes, and pass); screenshots were taken in headless Chromium with a software renderer.
