import { byInput } from "@frostbite/game-sdk/touch";

import { starsOf } from "../rules/heat.ts";
import {
  echoAt,
  inReach,
  recklessOn,
  risen,
  statue,
} from "../rules/machine.ts";
import type { DayState } from "../rules/types.ts";
import { nearest, spotNamed } from "../rules/places.ts";
import {
  echoPlaces,
  echoTells,
  machineLines,
  offers,
  recruitLine,
} from "../script/cast.ts";

// The words beside the picture: the heat as stars, and the one line under the screen that says what can be done right here.
export const starsText = (heat: number): string =>
  "★".repeat(starsOf(heat)) + "☆".repeat(5 - starsOf(heat));

export function noteFor(day: DayState): string {
  if (day.talk !== null) {
    const spot = spotNamed(day.talk);
    const line = offers[day.talk] ?? recruitLine(spot?.label ?? "Someone");
    const tell =
      day.talk === "echo-wake"
        ? `${echoTells[recklessOn(day) ? "reckless" : "careful"]} `
        : "";
    return `${tell}${line} ${byInput("Space says yes, X walks away.", "Tap the right side for yes, the left to walk away.")}`;
  }
  if (inReach(day, statue)) {
    if (day.loop > 0) return machineLines.cooling;
    const step = "step into the Time Machine";
    return risen(day)
      ? byInput(`Space: ${step}`, `Tap right: ${step}`)
      : machineLines.asleep;
  }
  const echo = echoAt(day);
  const past = echo !== null && !day.done.includes(echo.id) ? echo : null;
  if (past !== null && inReach(day, past)) {
    const talk = "talk to your newbie self";
    return byInput(`Space: ${talk}`, `Tap right: ${talk}`);
  }
  const spot = nearest(day.x, day.z);
  if (spot !== null)
    return byInput(`Space: ${spot.label}`, `Tap right: ${spot.label}`);
  if (day.parcel !== null)
    return `Carry the parcel to: ${spotNamed(day.parcel)?.label ?? "its door"}`;
  if (past !== null)
    return `Your newbie self is ${echoPlaces[past.id] ?? "somewhere in town"}.`;
  if (day.loop === 0 && risen(day)) return machineLines.risen;
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
