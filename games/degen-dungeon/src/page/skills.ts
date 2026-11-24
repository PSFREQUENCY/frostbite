import { kindsTaken, skills } from "../rules/milestones.ts";
import type { DayState } from "../rules/types.ts";
import { skillNames } from "../script/skills.ts";

// How far along each top skill is today, as done and needed (`rules/milestones.ts` decides them; this only measures): three gigs, the
// heat shaken, 100,000 DUN caught in the airdrop, five kinds of ride, and the rest done once.
const once = (yes: boolean): readonly [number, number] => [yes ? 1 : 0, 1];
const measures: Readonly<
  Record<string, (day: DayState) => readonly [number, number]>
> = {
  based: (day) => [Math.min(1, day.warned), 1],
  "diamond-hands": (day) => once(day.done.includes("diamond")),
  grinder: (day) => [Math.min(3, day.gigs), 3],
  "road-trip": (day) => [Math.min(5, kindsTaken(day)), 5],
  "rooftop-runner": (day) => once(day.done.includes("roof")),
  "saved-the-rest": (day) => once(day.saved),
  "scam-spotted": (day) => [Math.min(1, day.spotted), 1],
  "shook-the-tuxes": (day) => once(day.shook),
  "storm-funnel": (day) => [Math.min(100_000, day.storm), 100_000],
  "touching-grass": (day) => once(day.grass),
};

// Each skill's line for the backpack: mastered or not, its name, and its count.
export function skillLines(day: DayState): readonly string[] {
  return skills.map(([id, earned]) => {
    const [have, need] = measures[id]?.(day) ?? once(earned(day));
    const done = day.done.includes(`mastered-${id}`) || earned(day);
    return `${done ? "✓" : "○"} ${skillNames[id] ?? id} (${have.toLocaleString("en-US")}/${need.toLocaleString("en-US")})`;
  });
}
