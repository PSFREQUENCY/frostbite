import { clinging, onTheRoof } from "../rules/climb.ts";
import { pauseCopy, type Pause } from "@frostbite/game-sdk/pause";
import { byInput } from "@frostbite/game-sdk/touch";

import { zuriNear } from "../rules/dash.ts";
import { onLetterTop } from "../rules/mountain.ts";
import { starsOf } from "../rules/heat.ts";
import { echoAt, inReach, risen, statue } from "../rules/machine.ts";
import { sighted, watcherAt } from "../rules/mystery.ts";
import { beatOf } from "../rules/story.ts";
import { flies, type DayState } from "../rules/types.ts";
import { nearest, spotNamed } from "../rules/places.ts";
import { machineLines } from "../script/cast.ts";
import { questLine } from "./words.ts";

// The words beside the picture: the heat as stars, and the one line under the screen that says what can be done right here.
export const starsText = (heat: number): string =>
  "★".repeat(starsOf(heat)) + "☆".repeat(5 - starsOf(heat));

export function noteFor(day: DayState): string {
  if (day.talk !== null)
    return byInput("E or 1 to 5 answers, X walks away.", "Tap an answer.");
  if (clinging(day))
    return byInput(
      "Up the wall. E climbs in the window, R goes higher (and onto the roof from the top), F climbs down.",
      "Up the wall. Act climbs in the window, Climb goes higher (and onto the roof from the top), Drop climbs down.",
    );
  if (flies(day.ride))
    return byInput(
      "Flying. R rises, F comes down; land on a street, then E steps out.",
      "Flying. Climb rises, Drop comes down; land on a street, then Act steps out.",
    );
  if (onTheRoof(day) && onLetterTop(day.x, day.z))
    return byInput(
      "On top of the WAGMI sign, the whole city below. Take your screenshot; F climbs down.",
      "On top of the WAGMI sign, the whole city below. Take your screenshot; Drop climbs down.",
    );
  if (onTheRoof(day))
    return byInput(
      "On the roof. Walk to an edge over a street, then F climbs down.",
      "On the roof. Walk to an edge over a street, then Drop climbs down.",
    );
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
  if (beat !== null && inReach(day, beat.at)) return here(questLine(day));
  const spot = nearest(day);
  if (spot?.kind === "statue" && !day.won)
    return `${spot.label}: its mask wakes once the story is won.`;
  if (spot !== null) return here(spot.label);
  if (zuriNear(day)) return here("Zuri, with a Degen Dash ticket");
  if (day.thief !== null)
    return byInput(
      "Stop, thief! Run after the grey hoodie (Shift runs) and catch him.",
      "Stop, thief! Run after the grey hoodie (RUN) and catch him.",
    );
  if (day.gun && day.form >= 0)
    return byInput(
      "The freeze ray is in your hands: G fires it the way you last walked.",
      "The freeze ray is in your hands: the Freeze ray button fires it the way you last walked.",
    );
  if (day.parcel !== null)
    return `Carry the parcel to: ${spotNamed(day.parcel)?.label ?? "its door"}`;
  if (day.loop === 0 && risen(day)) return machineLines.risen;
  return byInput(
    "Arrows walk, Shift runs, Space jumps, E uses what is near, B opens the backpack. Sleep at home ends the day.",
    "Hold the stick's edge (or slide a thumb on the left) to walk; tap the right to use what is near.",
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

// While paused the note says so and the pause button offers to go on; going on brings the note back.
export function notePauses(
  pause: Pause,
  note: HTMLElement,
  button: HTMLElement,
): void {
  let held = "";
  pause.subscribe((paused) => {
    button.textContent = paused ? pauseCopy.resume : pauseCopy.pause;
    if (paused) {
      held = note.textContent;
      note.textContent = pauseCopy.paused;
    } else note.textContent = held;
  });
}
