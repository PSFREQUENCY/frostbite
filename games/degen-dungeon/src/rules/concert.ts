import { days, type Spot } from "./spot.ts";
import type { DayState, Draft, Point } from "./types.ts";
import { venues } from "./venues.ts";

// Day two's concert at the Floe Amphitheater, on the Old Floe's north-east lawn (`view/concert.ts`). A crew pastes flyers on The
// Exchange's middle street, and a flyer is the pass the stadium gate's metal detectors let through. Late in the day the singer's manager
// at the stage door says the show is off without her spirit625, an alcohol-free fizz sold at Omi Omy, ADOR's drinks bar. Bring one and
// the show goes on (`concert-show`, a thirty-second live clip). After it, on any day, Miss Mirinda dances at The Long Game, the dance
// studio: three moves, each on its count, and all three right impress her (`danced-mirinda`); the singer's show taught the moves. The
// names and the times are a draft for the owner.
export const showTick = 10_800;
export const spiritPrice = 25;
export const stage: Point = { x: 33_100, z: 1_800 };
export const studio = venues.find(({ label }) => label === "The Long Game");
const day2 = days(2);

export const concertSites: readonly Spot[] = [
  {
    id: "flyers",
    kind: "talk",
    label: "The flyer crew",
    node: "flyers",
    on: day2,
    x: 21_800,
    z: 18_600,
  },
  {
    id: "concert-gate",
    kind: "talk",
    label: "The stadium gate",
    node: "gate",
    on: day2,
    x: 33_600,
    z: 5_400,
  },
  {
    id: "stage-door",
    kind: "talk",
    label: "The stage door",
    node: "stage-door",
    on: day2,
    x: 31_800,
    z: 1_500,
  },
  {
    id: "omi-omy",
    kind: "talk",
    label: "Omi Omy",
    node: "omi-omy",
    x: 21_800,
    z: 14_000,
  },
  ...(studio === undefined
    ? []
    : [
        {
          id: "partner",
          kind: "talk" as const,
          label: "Miss Mirinda",
          node: "partner",
          x: studio.middle.x + 800,
          z: studio.middle.z,
        },
      ]),
];

const has = (day: Pick<DayState, "done">, id: string): boolean =>
  day.done.includes(id);

// The concert's places, by the talk each opens.
export const concertTalks: ReadonlySet<string> = new Set([
  "flyers",
  "gate",
  "omi-omy",
  "partner",
  "stage-door",
]);
// Which talk a concert place opens: the stage door's manager asks for the drink until it is in hand, and Miss Mirinda opens the dance.
export const concertNode = (
  node: string,
  day: Pick<DayState, "done" | "tick">,
): string | null => {
  if (node === "stage-door") {
    if (day.tick < showTick) return null;
    if (has(day, "concert-show")) return "stage-after";
    return has(day, "spirit625") ? "stage-drink" : "stage-door";
  }
  if (node === "partner")
    return has(day, "danced-mirinda") ? "partner-done" : "partner-0";
  return node;
};
// Why a concert place cannot be talked to now, or null.
export const concertRefusal = (
  node: string,
  day: Pick<DayState, "done" | "tick">,
): string | null =>
  node === "stage-door" && day.tick < showTick
    ? "the stage door opens late in the day"
    : node === "stage-door" && !has(day, "gate-in")
      ? "come in through the stadium gate first"
      : null;

// The answers: the flyer, the gate, the drink bought and given, and the dance's three counts (a wrong move starts the dance again).
export const danceRight: readonly number[] = [0, 1, 2];
export const concertNodes: Readonly<
  Record<string, readonly { readonly does?: string; readonly to?: string }[]>
> = {
  flyers: [{ does: "concert-flyer" }, {}],
  gate: [{ does: "concert-gate" }, {}],
  "omi-omy": [{ does: "concert-spirit" }, {}],
  "stage-door": [{}],
  "stage-drink": [{ does: "concert-give" }, {}],
  "stage-after": [{}],
  ...Object.fromEntries(
    danceRight.map((right, count) => [
      `partner-${String(count)}`,
      [0, 1, 2].map((move) =>
        move === right
          ? count + 1 < danceRight.length
            ? { to: `partner-${String(count + 1)}` }
            : { does: "concert-dance" }
          : { to: "partner-again" },
      ),
    ]),
  ),
  "partner-again": [{ to: "partner-0" }, {}],
  "partner-done": [{}],
};

export function concertDeed(day: Draft, name: string): string | null {
  switch (name) {
    case "concert-flyer":
      if (!has(day, "flyer")) day.done = [...day.done, "flyer"];
      return null;
    case "concert-gate":
      if (!has(day, "flyer"))
        return "the flyer is your pass: the crew on The Exchange's street has them";
      if (!has(day, "gate-in")) day.done = [...day.done, "gate-in"];
      return null;
    case "concert-spirit":
      if (has(day, "spirit625") && !has(day, "concert-show"))
        return "you have one already";
      if (day.pocket < spiritPrice) return "not enough DUN";
      day.pocket -= spiritPrice;
      day.done = [...day.done, "spirit625"];
      return null;
    case "concert-give":
      day.done = [...day.done, "concert-show"];
      day.rep += 20;
      return null;
    case "concert-dance":
      day.done = [...day.done, "danced-mirinda"];
      day.rep += 10;
      return null;
    default:
      return "nothing to do";
  }
}
