import { moonNight } from "./calendar.ts";
import { paradeOn } from "./dash.ts";
import type { DayState, Point } from "./types.ts";

// The street's crowds that gather in one place, and where each of their people stands: the FREE FROST riot in The Exchange until Frost's
// speech on the first morning, the party under Moon Tower once Moon Night's dream is dreamt, and a Degen Dash champion's parade along
// the avenue. The rules keep where they stand so that the freeze ray (`freeze.ts`) can catch them; the view draws them there
// (`view/crowd.ts`), bumped about a little, and the Launch Day robots are the view's alone.
export type Gathering = "parade" | "party" | "riot";
export const crowdSize = 160;
// The middle of each crowd and how far along its two streets it spreads (cm); everyone stands within eight metres of a street's middle.
const spreads: Readonly<Record<Gathering, readonly [number, number, number]>> =
  {
    parade: [18_000, 17_300, 3_000],
    party: [18_000, 16_000, 2_600],
    riot: [18_000, 18_000, 4_000],
  };
const across = 800;

export const gatheringAt = (
  day: Pick<
    DayState,
    "beat" | "dash" | "dashFrom" | "dashTime" | "day" | "done" | "gate" | "tick"
  >,
): Gathering | null => {
  if (day.gate > 0) return null;
  if (paradeOn(day)) return "parade";
  if (day.day === 1 && !day.done.includes("speech")) return "riot";
  return day.day === moonNight && day.beat >= 1 ? "party" : null;
};

// A fixed scatter of whole numbers, 0 to 9,999, so a crowd stands the same way every day and every replay.
const scatter = (index: number, salt: number): number => {
  let mixed =
    Math.imul(index + 1, 0x9e_37_79_b1) ^ Math.imul(salt, 0x85_eb_ca_6b);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x2c_1b_3c_6d);
  mixed ^= mixed >>> 12;
  return (mixed >>> 0) % 10_000;
};

// Where one of a crowd's people stands: half along the north-south street, half along the east-west one.
export function crowdAt(kind: Gathering, index: number): Point {
  const [x, z, spread] = spreads[kind];
  const along = Math.trunc(((scatter(index, 9) - 5_000) * 2 * spread) / 10_000);
  const aside = Math.trunc(((scatter(index, 1) - 5_000) * 2 * across) / 10_000);
  return index % 2 === 0
    ? { x: x + aside, z: z + along }
    : { x: x + along, z: z + aside };
}
