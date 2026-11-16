import { lastDay } from "../rules/calendar.ts";
import { stages } from "../rules/course.ts";
import { clockOf, dashPar } from "../rules/dash.ts";
import { heroes } from "../rules/heroes.ts";
import {
  beamupsToday,
  saucerBeamups,
  saucerOpen,
  visiting,
} from "../rules/invasion.ts";
import { questDone, questOf, questsOn } from "../rules/story.ts";
import type { DayState } from "../rules/types.ts";
import { dashPack } from "../script/dash.ts";
import { letters } from "../script/letters.ts";
import { element } from "./elements.ts";
import { sidesOf } from "../sides.ts";
import { clockText, goalFor, questLineOf } from "./words.ts";

// The backpack, which slides out from the side: today's quests and side quests, what the hero carries (DUN, loot, the freezer), the tools and fits they have,
// the crew, where the seed paper is, the clues found (S's words and every letter picked up today, to read in full), tonight's lantern, and
// a moon rock if they brought one home. It reads the day; it changes nothing.
const papers = [
  "not written yet",
  "in your pocket",
  "under the mattress",
  "on your phone",
  "in the freezer",
] as const;
const wishes = [
  "",
  "clear sight",
  "respect",
  "a cold freezer",
  "a full pocket",
] as const;
const fits = [
  ["fit-gloves", "Frost gloves"],
  ["fit-shades", "Night shades"],
  ["fit-parka", "Storm parka"],
] as const;

// How far the hero is with the visitors: beam-ups toward a saucer of their own, or where it waits once it is theirs.
function visitorsLog(
  day: DayState,
): readonly (readonly [string, readonly string[]])[] {
  const total = day.beamups + beamupsToday(day);
  if (total === 0 && !visiting(day)) return [];
  return [
    [
      "The visitors",
      [
        saucerOpen(day)
          ? "Your saucer waits on the Old Floe lawn: act on it to fly."
          : `Beam-ups: ${String(total)} of ${String(saucerBeamups)} (peace or a trade aboard a saucer, once a saucer a day)`,
      ],
    ],
  ];
}

// The Degen Dash today: a ticket held, a run on (its stage and clock), and what a finish brought (the trophy and the champion's print for
// a win, a medal for a finish), with the last time over the line.
function dashLog(
  day: DayState,
): readonly (readonly [string, readonly string[]])[] {
  const won = day.done.includes("dash-won");
  const lines = [
    ...(day.tickets > 0 ? [dashPack.ticket] : []),
    ...(day.dash > 0
      ? [
          `Stage ${String(day.dash)} of ${String(stages.length)}, ${clockText(clockOf(day))} on the clock (par ${clockText(dashPar)})`,
        ]
      : []),
    ...(won ? [dashPack.trophy, dashPack.print] : []),
    ...(!won && day.done.includes("dash-finished") ? [dashPack.medal] : []),
    ...(day.dashTime > 0
      ? [`Last time over the line: ${clockText(day.dashTime)}`]
      : []),
  ];
  return lines.length === 0 ? [] : [["The Degen Dash", lines]];
}

// Today's three quests, ticked off, with the one the hero is on marked; then the side quests, with how far along the counted ones are.
// On a trip back to day one there is only the trip's line.
function questLog(
  day: DayState,
): readonly (readonly [string, readonly string[]])[] {
  if (day.loop > 0) return [["Quest", [goalFor(day)]]];
  const on = questOf(day);
  const sides = sidesOf(day);
  const sidesDone = sides.filter((side) => side.done).length;
  return [
    [
      `Day ${String(day.day)} of ${String(lastDay)}: quests`,
      questsOn(day.day).map(
        (quest) =>
          `${questDone(day, quest) ? "✓" : quest === on ? "→" : "○"} ${questLineOf(day, quest)}`,
      ),
    ],
    ...visitorsLog(day),
    ...dashLog(day),
    [
      `Side quests: ${String(sidesDone)} of ${String(sides.length)}`,
      sides.map(
        ({ count, done, label }) =>
          `${done ? "✓" : "○"} ${label}${count === undefined ? "" : ` (${String(count[0])}/${String(count[1])})`}`,
      ),
    ],
  ];
}

// The backpack's sections, each a title and its lines.
export function packOf(
  day: DayState,
): readonly (readonly [string, readonly string[]])[] {
  const has = (id: string): boolean => day.done.includes(id);
  const read = letters.flatMap(([text], index) =>
    has(`letter-${String(index + 1)}`) ? [`"${text}"`] : [],
  );
  return [
    ...questLog(day),
    [
      "Carrying",
      [
        `${String(day.pocket)} DUN in your pocket`,
        `${String(day.freezer)} DUN in the freezer`,
        ...(day.hot > 0 ? [`${String(day.hot)} DUN of hot loot`] : []),
        `${String(day.rep)} standing on the street`,
      ],
    ],
    [
      "Tools and fits",
      [
        ...((day.tools & 1) === 1 ? ["The magnet"] : []),
        ...((day.tools & 2) === 2 ? ["The vacuum"] : []),
        ...fits.flatMap(([id, name]) => (has(id) ? [name] : [])),
        ...(has("moon") ? ["A space helmet"] : []),
        ...(has("moon-rock") ? ["A moon rock"] : []),
      ],
    ],
    ["Crew", day.crew.map((hero) => heroes[hero]?.name ?? "")],
    ["Seed paper", [papers[day.paper] ?? papers[0]]],
    ["Clues", [`${String(day.words)} of S's three words`, ...read]],
    [
      "Tonight",
      [
        day.wish > 0
          ? `Your lantern is up, wishing for ${wishes[day.wish] ?? ""}`
          : "No lantern sent yet",
      ],
    ],
  ];
}

export function createBag() {
  const panel = element("bag", "aside");
  const items = element("bag-items", "div");
  let open = false;
  let shown = "";
  return {
    isOpen: (): boolean => open,
    render(day: DayState | null): void {
      if (!open || day === null) return;
      const pack = packOf(day);
      const key = JSON.stringify(pack);
      if (key === shown) return;
      shown = key;
      const document = items.ownerDocument;
      items.replaceChildren(
        ...pack.map(([title, lines]) => {
          const section = document.createElement("section");
          const heading = document.createElement("h3");
          heading.textContent = title;
          const list = document.createElement("ul");
          // A quest log's lines carry their own marks (done, on it, still to do) instead of bullets.
          if (lines.length > 0 && lines.every((line) => /^[✓→○] /u.test(line)))
            list.className = "log";
          for (const line of lines.length === 0 ? ["Nothing yet"] : lines) {
            const item = document.createElement("li");
            item.textContent = line;
            list.append(item);
          }
          section.append(heading, list);
          return section;
        }),
      );
    },
    toggle(): void {
      open = !open;
      panel.classList.toggle("open", open);
      panel.setAttribute("aria-hidden", String(!open));
      shown = "";
    },
  };
}
