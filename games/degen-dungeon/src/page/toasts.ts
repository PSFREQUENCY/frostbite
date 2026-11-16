import { questDone, questsOn } from "../rules/story.ts";
import type { DayState } from "../rules/types.ts";
import { sidesOf } from "../sides.ts";
import { questLineOf } from "./words.ts";

// A cheer over the picture when a quest or a side quest is done: which one, and how many of today's are done, for a few seconds. The
// first look at a day only notes what is already done, so waking up cheers nothing, and a new day starts the count again.
const shown = 3_500;

// Today's finished quests and side quests by key, with what the cheer says for each.
type Cheer = readonly [key: string, words: readonly [string, string]];
function finished(
  day: DayState,
): ReadonlyMap<string, readonly [string, string]> {
  const quests = day.loop > 0 ? [] : questsOn(day.day);
  const sides = sidesOf(day);
  const questsDone = quests.filter((quest) => questDone(day, quest)).length;
  const sidesDone = sides.filter((side) => side.done).length;
  const cheers: Cheer[] = [
    ...quests
      .filter((quest) => questDone(day, quest))
      .map((quest): Cheer => [
        quest,
        [
          `QUEST ${String(questsDone)} OF ${String(quests.length)} DONE`,
          questLineOf(day, quest),
        ],
      ]),
    ...sides.flatMap((side, index): Cheer[] =>
      side.done
        ? [
            [
              `side-${String(index)}`,
              [
                `SIDE QUEST ${String(sidesDone)} OF ${String(sides.length)} DONE`,
                side.label,
              ],
            ],
          ]
        : [],
    ),
  ];
  return new Map(cheers);
}

export function createToasts(card: HTMLElement) {
  let seen: ReadonlySet<string> | null = null;
  let last = { day: 0, tick: 0 };
  let since = -Infinity;
  return {
    show(day: DayState | null, now: number): void {
      card.hidden = now - since > shown;
      if (day === null) {
        seen = null;
        return;
      }
      const done = finished(day);
      const fresh =
        seen === null || day.day !== last.day || day.tick < last.tick;
      const known = seen ?? new Set<string>();
      seen = new Set(done.keys());
      last = { day: day.day, tick: day.tick };
      if (fresh) return;
      const news = [...done].filter(([key]) => !known.has(key));
      const [, words] = news.at(-1) ?? [];
      if (words === undefined) return;
      card.replaceChildren(
        ...words.map((text, index) => {
          const line = card.ownerDocument.createElement("p");
          line.textContent = text;
          if (index === 0) line.className = "head";
          return line;
        }),
      );
      card.hidden = false;
      since = now;
    },
  };
}
