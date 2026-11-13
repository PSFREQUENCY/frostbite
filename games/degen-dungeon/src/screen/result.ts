import {
  bestLine,
  resultWeight,
  type ResultCard,
} from "@frostbite/game-sdk/guide";
import { byInput } from "@frostbite/game-sdk/touch";

import { scoreOf } from "../rules/heat.ts";
import { statusOf } from "../rules/status.ts";
import type { DayState } from "../rules/types.ts";
import { endings, timelineLine } from "../script/cast.ts";
import { dreams } from "../script/dreams.ts";
import { gmLine } from "../script/lines.ts";
import { colour } from "./flat.ts";

// The card after a day: how it ended, what it made, the status it ended on (or how a trip back left the timeline), the dream's ending and
// the text from an unknown number after SHA Beach, the best day, and how to go again. The SDK draws it over the screen at the pixels of
// the display.
const dreamEnding = (day: DayState): string =>
  dreams[day.hero]?.endings[day.dream - 1] ?? "";
export const resultOf = (
  day: DayState,
  view: {
    readonly best: number;
    readonly newBest: boolean;
    readonly phase: string;
  },
): ResultCard | null =>
  view.phase === "over"
    ? {
        rows: [
          {
            colour: day.cause === "frozen" ? colour.tux : colour.spot,
            text: endings[day.cause ?? "closed"],
            weight: resultWeight.heading,
          },
          {
            colour: "#ffffff",
            text: `MADE ${String(scoreOf(day))} DUN   ${day.loop > 0 ? timelineLine(day.fate) : statusOf(day)}`,
            weight: resultWeight.detail,
          },
          ...(day.cause === "beach"
            ? [
                {
                  colour: "#ffffff",
                  text: `${dreamEnding(day)} ${gmLine}`.toUpperCase(),
                  weight: resultWeight.line,
                },
              ]
            : []),
          {
            colour: colour.hero,
            text: bestLine(view.best, view.newBest),
            weight: resultWeight.line,
          },
          {
            colour: colour.spot,
            text: byInput("ENTER FOR ANOTHER DAY", "TAP FOR ANOTHER DAY"),
            weight: resultWeight.prompt,
          },
        ],
      }
    : null;
