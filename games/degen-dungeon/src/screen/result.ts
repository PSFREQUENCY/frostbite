import {
  bestLine,
  resultWeight,
  type ResultCard,
} from "@frostbite/game-sdk/guide";
import { byInput } from "@frostbite/game-sdk/touch";

import { statusOf } from "../rules/status.ts";
import type { DayState } from "../rules/types.ts";
import { endings } from "../script/cast.ts";
import { colour } from "./flat.ts";

// The card after a day: how it ended, what it made, the status it ended on, the best day, and how to go again. The SDK draws it over the
// screen at the pixels of the display.
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
            text: `MADE ${String(day.made + day.storm)} DUN   ${statusOf(day)}`,
            weight: resultWeight.detail,
          },
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
