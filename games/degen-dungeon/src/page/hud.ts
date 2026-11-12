import { byInput } from "@frostbite/game-sdk/touch";

import { starsOf } from "../rules/heat.ts";
import type { DayState } from "../rules/types.ts";
import { nearest, spotNamed } from "../rules/world.ts";
import { offers, recruitLine } from "../script/cast.ts";

// The words beside the picture: the heat as stars, and the one line under the screen that says what can be done right here.
export const starsText = (heat: number): string =>
  "★".repeat(starsOf(heat)) + "☆".repeat(5 - starsOf(heat));

export function noteFor(day: DayState): string {
  if (day.talk !== null) {
    const spot = spotNamed(day.talk);
    const line = offers[day.talk] ?? recruitLine(spot?.label ?? "Someone");
    return `${line} ${byInput("Space says yes, X walks away.", "Tap the right side for yes, the left to walk away.")}`;
  }
  const spot = nearest(day.x, day.z);
  if (spot !== null)
    return byInput(`Space: ${spot.label}`, `Tap right: ${spot.label}`);
  if (day.parcel !== null)
    return `Carry the parcel to: ${spotNamed(day.parcel)?.label ?? "its door"}`;
  return byInput(
    "Arrows walk and Space uses what is near. Home ends the day.",
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
