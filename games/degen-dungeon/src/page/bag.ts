import { heroes } from "../rules/heroes.ts";
import type { DayState } from "../rules/types.ts";
import { letters } from "../script/letters.ts";
import { element } from "./elements.ts";
import { goalFor } from "./words.ts";

// The backpack, which slides out from the side: the quest, what the hero carries (DUN, loot, the freezer), the tools and fits they have,
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

// The backpack's sections, each a title and its lines.
export function packOf(
  day: DayState,
): readonly (readonly [string, readonly string[]])[] {
  const has = (id: string): boolean => day.done.includes(id);
  const read = letters.flatMap(([text], index) =>
    has(`letter-${String(index + 1)}`) ? [`"${text}"`] : [],
  );
  return [
    ["Quest", [goalFor(day)]],
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
