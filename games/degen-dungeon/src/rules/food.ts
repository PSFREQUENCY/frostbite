import { heatPerStar, reach } from "./constants.ts";
import { rooms } from "./rooms.ts";
import type { Spot } from "./spot.ts";
import type { DayState, Draft, Point } from "./types.ts";

// Within reach (as `places.ts` has it, kept here so this module does not import the places that list its own).
const within = (from: Point, place: Point, far = reach): boolean =>
  Math.max(Math.abs(from.x - place.x), Math.abs(from.z - place.z)) <= far;

// Food and the loops it closes (`view/food.ts`). Hunger builds from the last meal (`ateAt`) to starving in five minutes. Three Crypto
// Shacks sell a Satoshi Burger at the counter or, to a hero at the wheel, through the drive-through; the first shack's waitress has lost
// her dog, Biscuit, who is sniffing round the Floe Food Court's stalls (noodles, tacos, a smoothie). Streaming live from The Dome VR pays
// by the ten seconds, but only when fed, and only for a minute: then the stream cuts and the hero is starving until they eat. At Diamond
// Hands, the seafront restaurant, its owner Ms. Opal serves the Diamond Plate; her Diamond Hands gang walks up to anyone who has made
// 50,000 DUN today with a diamond NFT "for protection". Turning them down sends a tip to the tuxes (a star of heat), never more. Names
// and prices are a draft for the owner.
export const hungerTicks = 9_000;
export const streamTicks = 1_800;
export const streamPay = 50;
export const gangAt = 50_000;
export const nftPrice = 5_000;
export const meals: Readonly<Record<string, number>> = {
  diamond: 500,
  noodles: 20,
  shack: 15,
  smoothie: 10,
  tacos: 20,
};

export const hungerOf = (day: Pick<DayState, "ateAt" | "tick">): number =>
  Math.min(100, Math.floor(((day.tick - day.ateAt) * 100) / hungerTicks));
export const starving = (day: Pick<DayState, "ateAt" | "tick">): boolean =>
  hungerOf(day) >= 100;

const restaurant = rooms.find(({ kind }) => kind === "restaurant");
const shack = (id: string, x: number, z: number): Spot => ({
  id,
  kind: "talk",
  label: "Crypto Shack",
  node: "shack",
  x,
  z,
});
export const foodSites: readonly Spot[] = [
  shack("shack-1", 9_800, 18_300),
  shack("shack-2", 6_400, 27_600),
  shack("shack-3", 30_400, 27_600),
  {
    id: "food-court",
    kind: "talk",
    label: "Floe Food Court",
    node: "court",
    x: 26_900,
    z: 9_100,
  },
  {
    id: "dog",
    kind: "talk",
    label: "Biscuit, a small lost dog",
    node: "dog",
    x: 26_900,
    z: 8_000,
  },
  {
    id: "vr-stream",
    kind: "talk",
    label: "The streaming pod",
    node: "stream",
    x: 21_900,
    z: 26_900,
  },
  ...(restaurant === undefined
    ? []
    : [
        {
          id: "diamond-hands",
          kind: "talk" as const,
          label: "Ms. Opal",
          node: "opal",
          ...restaurant.counter,
        },
      ]),
];
// Biscuit is out there once the waitress has asked, until she is found.
export const dogOut = (day: Pick<DayState, "done">): boolean =>
  day.done.includes("dog-asked") && !day.done.includes("dog-found");

export const foodNodes: Readonly<
  Record<string, readonly { readonly does?: string; readonly to?: string }[]>
> = {
  court: [
    { does: "food-noodles" },
    { does: "food-tacos" },
    { does: "food-smoothie" },
    {},
  ],
  dog: [{ does: "food-fetch" }],
  gang: [{ does: "food-nft" }, { does: "food-no" }],
  opal: [{ does: "food-diamond" }, {}],
  shack: [{ does: "food-shack" }, { does: "food-dog" }, {}],
  stream: [{ does: "food-stream" }, {}],
};

const eat = (day: Draft, meal: string, ...done: string[]): string | null => {
  const price = meals[meal] ?? 0;
  if (day.pocket < price) return "not enough DUN";
  day.pocket -= price;
  day.ateAt = day.tick;
  day.done = [...day.done, `ate-${meal}`, ...done];
  return null;
};
const wheels = (day: Pick<DayState, "ride">): boolean =>
  ["car", "truck", "van"].includes(day.ride);

export function foodDeed(day: Draft, name: string): string | null {
  switch (name) {
    case "food-shack":
      return eat(day, "shack", ...(wheels(day) ? ["drive-thru"] : []));
    case "food-dog":
      if (!day.done.includes("dog-asked")) {
        day.done = [...day.done, "dog-asked"];
        return null;
      }
      if (!day.done.includes("dog-found"))
        return "Biscuit is still out there, near the food court";
      if (day.done.includes("dog-returned")) return "Biscuit is home, wagging";
      day.pocket += 100;
      day.ateAt = day.tick;
      day.done = [...day.done, "dog-returned"];
      return null;
    case "food-fetch":
      day.done = [...day.done, "dog-found"];
      return null;
    case "food-noodles":
    case "food-tacos":
    case "food-smoothie":
      return eat(day, name.slice(5));
    case "food-diamond":
      return eat(day, "diamond", "dined-diamond");
    case "food-stream":
      if (starving(day)) return "you are starving: eat first, then stream";
      if (day.streamFrom >= 0) return "you are live already";
      day.streamFrom = day.tick;
      return null;
    case "food-nft":
      if (day.pocket < nftPrice) return "not enough DUN";
      day.pocket -= nftPrice;
      day.done = [...day.done, "diamond-nft"];
      day.gang = null;
      return null;
    case "food-no":
      day.done = [...day.done, "gang-no"];
      day.heat += heatPerStar;
      day.gang = null;
      return null;
    default:
      return "nothing to do";
  }
}

// Each tick: the stream pays and cuts at a minute (or when the hero walks off), and the gang walks up once a day to a hero on foot who
// has made enough, and melts back into the crowd if the hero walks on.
export function foodTick(day: Draft): void {
  const pod = foodSites.find(({ id }) => id === "vr-stream");
  if (day.streamFrom >= 0 && pod !== undefined) {
    const live = day.tick - day.streamFrom;
    if (live > 0 && live % 300 === 0) day.pocket += streamPay;
    if (live >= streamTicks) {
      day.streamFrom = -1;
      day.ateAt = Math.min(day.ateAt, day.tick - hungerTicks);
      day.done = [...day.done, "streamed"];
    } else if (!within(day, pod)) day.streamFrom = -1;
  }
  if (day.gang !== null && !within(day, day.gang, reach * 8)) day.gang = null;
  if (
    day.made >= gangAt &&
    !day.done.includes("gang-met") &&
    day.ride === "foot" &&
    day.talk === null &&
    day.dash === 0 &&
    day.loop === 0
  ) {
    day.gang = { x: day.x, z: day.z };
    day.done = [...day.done, "gang-met"];
  }
}
export const gangNear = (
  day: Pick<DayState, "gang" | "level" | "ride" | "x" | "z">,
): boolean =>
  day.gang !== null &&
  day.ride === "foot" &&
  day.level === 0 &&
  within(day, day.gang);
