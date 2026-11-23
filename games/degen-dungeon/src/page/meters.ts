import { skateTicks, tillCap, tillOf } from "../rules/business.ts";
import {
  nightTick,
  powerCooldown,
  rankFloors,
  ticksPerSecond,
} from "../rules/constants.ts";
import { stages } from "../rules/course.ts";
import { clockOf } from "../rules/dash.ts";
import { flightTicks, flying, powerLevel } from "../rules/flight.ts";
import { hungerOf, streamTicks } from "../rules/food.ts";
import { rankOf, worthOf } from "../rules/heat.ts";
import { beamWait } from "../rules/invasion.ts";
import { evicted, lateFee, rentDue, rentOf } from "../rules/lofts.ts";
import { skills } from "../rules/milestones.ts";
import { powerOf } from "../rules/powers.ts";
import { questDone, questsOn } from "../rules/story.ts";
import type { DayState } from "../rules/types.ts";
import { powerNames } from "../script/powers.ts";
import { sidesOf } from "../sides.ts";
import { clockText, rankNames } from "./words.ts";

// The neon meters over the picture's top-left corner: how far along everything that counts is, at a glance. A row of lit units for what
// counts in ones (today's quests, the skills mastered, the Degen Dash's stages), and a glowing bar for the rest (the side quests, the rent
// against what is in the pocket, the power charging, how full the hero is, the shop's till, the next rank); and while they last, the
// flight, the board, a live stream and a saucer's beam, at the top. A meter that needs seeing to pulses. The same meters, and one for
// each top skill, light the backpack (`bag.ts`).
export interface Meter {
  readonly have: number;
  readonly hue: string;
  readonly id: string;
  readonly label: string;
  readonly need: number;
  readonly text: string;
  readonly units: boolean;
  readonly warn: boolean;
}

const meter = (
  id: string,
  label: string,
  have: number,
  need: number,
  hue: string,
  text = `${String(have)}/${String(need)}`,
  units = false,
  warn = false,
): Meter => ({
  have: Math.max(0, Math.min(have, need)),
  hue,
  id,
  label,
  need: Math.max(1, need),
  text,
  units,
  warn,
});
const seconds = (ticks: number): string =>
  `${String(Math.max(0, Math.ceil(ticks / ticksPerSecond)))}s`;

// While something lasts: the flight, the board, a stream, a beam, a Degen Dash.
function lasting(day: DayState): readonly Meter[] {
  const now: Meter[] = [];
  if (flying(day)) {
    const left = day.flyUntil - day.tick;
    now.push(
      meter(
        "flight",
        "Flight",
        left,
        flightTicks * powerLevel(day),
        "#7be36b",
        seconds(left),
        false,
        left < 3 * ticksPerSecond,
      ),
    );
  }
  if (day.ride === "board" && !day.done.includes("did-skate"))
    now.push(
      meter(
        "skate",
        "Skate",
        day.skated,
        skateTicks,
        "#ff7a1a",
        seconds(skateTicks - day.skated),
      ),
    );
  if (day.streamFrom >= 0) {
    const live = day.tick - day.streamFrom;
    now.push(
      meter(
        "stream",
        "Live",
        live,
        streamTicks,
        "#ff3df2",
        seconds(streamTicks - live),
      ),
    );
  }
  if (day.beamed > 0)
    now.push(
      meter("beam", "Beam", day.beamed, beamWait, "#b48cff", "going up"),
    );
  if (day.dash > 0)
    now.push(
      meter(
        "dash",
        "Dash",
        day.dash,
        stages.length,
        "#ff9ecf",
        clockText(clockOf(day)),
        true,
      ),
    );
  return now;
}

// The rent while it is owed: the pocket against it, red while short, pulsing in the last two minutes.
function rentMeter(day: DayState): readonly Meter[] {
  if (!rentDue(day) && !evicted(day)) return [];
  const owed = rentOf(day) + (evicted(day) ? lateFee : 0);
  const short = day.pocket < owed;
  const late = day.tick >= nightTick - 120 * ticksPerSecond;
  return [
    meter(
      "rent",
      "Rent",
      day.pocket,
      owed,
      short ? "#ff4d5e" : "#39e27d",
      `${String(Math.min(day.pocket, owed))}/${String(owed)}`,
      false,
      short && late,
    ),
  ];
}

export function metersOf(day: DayState): readonly Meter[] {
  const quests = day.loop > 0 ? [] : questsOn(day.day);
  const sides = sidesOf(day);
  const charged = Math.min(powerCooldown, day.tick - day.powerAt);
  const full = 100 - hungerOf(day);
  const rank = rankOf(day);
  const floor = rankFloors[rank] ?? 0;
  const next = rankFloors[rank + 1];
  const mastered = skills.filter(([id]) =>
    day.done.includes(`mastered-${id}`),
  ).length;
  const till = tillOf(day);
  return [
    ...lasting(day),
    ...rentMeter(day),
    ...(quests.length === 0
      ? []
      : [
          meter(
            "quests",
            "Quests",
            quests.filter((quest) => questDone(day, quest)).length,
            quests.length,
            "#38e8ff",
            undefined,
            true,
          ),
        ]),
    ...(sides.length === 0
      ? []
      : [
          meter(
            "sides",
            "Side quests",
            sides.filter((side) => side.done).length,
            sides.length,
            "#c9b6ff",
          ),
        ]),
    meter(
      "power",
      `${powerNames[powerOf(day.hero)]} ${String(powerLevel(day))}`,
      charged,
      powerCooldown,
      "#ffd166",
      charged >= powerCooldown ? "ready" : seconds(powerCooldown - charged),
    ),
    meter(
      "full",
      "Full",
      full,
      100,
      "#ff8a3c",
      `${String(full)}%`,
      false,
      full <= 25,
    ),
    ...(till > 0
      ? [
          meter(
            "shop",
            "Shop",
            till,
            tillCap,
            "#5beac6",
            `${till.toLocaleString("en-US")} DUN`,
          ),
        ]
      : []),
    ...(day.day < 2 || day.loop > 0
      ? []
      : [
          meter(
            "skills",
            "Skills",
            mastered,
            skills.length,
            "#ff9ecf",
            undefined,
            true,
          ),
        ]),
    next === undefined
      ? meter("rank", rankNames[rank] ?? "", 1, 1, "#e0b341", "top")
      : meter(
          "rank",
          `${rankNames[rank] ?? ""} → ${rankNames[rank + 1] ?? ""}`,
          worthOf(day) - floor,
          next - floor,
          "#e0b341",
          `${worthOf(day).toLocaleString("en-US")}/${next.toLocaleString("en-US")}`,
        ),
  ];
}

// The meters on the page, built again only when what they show has changed.
export function createMeters(box: HTMLElement) {
  let shown = "";
  return {
    render(day: DayState | null): void {
      const meters = day === null ? [] : metersOf(day);
      box.hidden = meters.length === 0;
      const key = meters
        .map(
          ({ have, id, label, need, text, warn }) =>
            `${id}:${label}:${String(Math.round((100 * have) / need))}:${text}:${String(warn)}`,
        )
        .join("|");
      if (key === shown) return;
      shown = key;
      const document = box.ownerDocument;
      box.replaceChildren(
        ...meters.map((one) => {
          const row = document.createElement("div");
          row.className = "neon";
          row.dataset.id = one.id;
          if (one.warn) row.dataset.warn = "yes";
          row.style.setProperty("--hue", one.hue);
          const name = document.createElement("span");
          name.className = "neon-name";
          name.textContent = one.label;
          row.append(name, gauge(document, one));
          const value = document.createElement("span");
          value.className = "neon-text";
          value.textContent = one.text;
          row.append(value);
          return row;
        }),
      );
    },
  };
}

// A meter's gauge: lit units when it counts in ones (up to a dozen), otherwise a bar filled to how far along it is.
export function gauge(
  document: Document,
  one: Pick<Meter, "have" | "need" | "units">,
): HTMLElement {
  const track = document.createElement("span");
  if (one.units && one.need <= 12) {
    track.className = "neon-units";
    for (let index = 0; index < one.need; index += 1) {
      const unit = document.createElement("i");
      if (index < one.have) unit.className = "on";
      track.append(unit);
    }
    return track;
  }
  track.className = "neon-track";
  const fill = document.createElement("i");
  fill.style.inlineSize = `${String(Math.round((100 * one.have) / one.need))}%`;
  track.append(fill);
  return track;
}
