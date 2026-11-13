import { byInput } from "@frostbite/game-sdk/touch";

import { starsOf } from "../rules/heat.ts";
import { echoAt, inReach, risen, statue } from "../rules/machine.ts";
import { sighted, watcherAt } from "../rules/mystery.ts";
import { beatOf } from "../rules/story.ts";
import type { DayState } from "../rules/types.ts";
import { nearest, spotNamed } from "../rules/places.ts";
import { machineLines } from "../script/cast.ts";
import { goalFor } from "./words.ts";

// The words beside the picture: the heat as stars, and the one line under the screen that says what can be done right here.
export const starsText = (heat: number): string =>
  "★".repeat(starsOf(heat)) + "☆".repeat(5 - starsOf(heat));

export function noteFor(day: DayState): string {
  if (day.talk !== null)
    return byInput("E or 1 to 5 answers, X walks away.", "Tap an answer.");
  const here = (what: string): string =>
    byInput(`E: ${what}`, `Tap right: ${what}`);
  if (inReach(day, statue)) {
    if (day.loop > 0) return machineLines.cooling;
    return risen(day)
      ? here("step into the Time Machine")
      : machineLines.asleep;
  }
  const echo = echoAt(day);
  const past = echo !== null && !day.done.includes(echo.id) ? echo : null;
  if (past !== null && inReach(day, past))
    return here("talk to your newbie self");
  if (
    day.looking &&
    !sighted(day) &&
    inReach(day, watcherAt(day.seed, day.day))
  )
    return here("the watcher's footprints");
  const beat = beatOf(day);
  if (beat !== null && inReach(day, beat.at)) return here(goalFor(day));
  const spot = nearest(day);
  if (spot !== null) return here(spot.label);
  if (day.parcel !== null)
    return `Carry the parcel to: ${spotNamed(day.parcel)?.label ?? "its door"}`;
  if (day.loop === 0 && risen(day)) return machineLines.risen;
  return byInput(
    "Arrows walk, Shift runs, Space jumps, E uses what is near, B opens the backpack. Sleep at home ends the day.",
    "The left thumb steers and a tap on the right uses what is near.",
  );
}

// The milestones earned today, by their titles, in the list under the screen.
export function listEarned(
  list: HTMLElement,
  ids: readonly string[],
  titles: ReadonlyMap<string, string>,
): void {
  list.replaceChildren(
    ...ids.map((id) => {
      const item = list.ownerDocument.createElement("li");
      item.dataset.milestone = id;
      item.textContent = titles.get(id) ?? id;
      return item;
    }),
  );
}
