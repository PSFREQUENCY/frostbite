// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { heatPerStar, nightTick } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import {
  foodDeed,
  foodTick,
  gangAt,
  hungerOf,
  hungerTicks,
  meals,
  nftPrice,
  starving,
  streamPay,
  streamTicks,
} from "../src/rules/food.ts";
import { degenRules } from "../src/rules/index.ts";
import { openTo, spotNamed } from "../src/rules/places.ts";
import type { DayState } from "../src/rules/types.ts";
import { goalFor } from "../src/page/words.ts";
import { sidesOf } from "../src/sides.ts";
import { hungryLine } from "../src/script/food.ts";
import { buildFood } from "../src/view/food.ts";
import { refusal, started } from "./support/replay.ts";

const pick = (day: DayState, talk: string, choice: number): DayState => {
  const stepped = degenRules.step(
    { ...day, talk },
    { data: { choice, tick: day.tick }, type: "pick" },
  );
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
const why = (day: DayState, talk: string, choice: number): string | null =>
  refusal({ ...day, talk }, "pick", { choice, tick: day.tick });
const at = (id: string): { x: number; z: number } => {
  const spot = spotNamed(id);
  return { x: spot?.x ?? 0, z: spot?.z ?? 0 };
};

describe("food", () => {
  it("builds hunger from the last meal to starving in five minutes, and Pip says so until the hero eats", () => {
    const day = { ...started(1, 7, 2), pocket: 1_000 };
    expect(hungerOf({ ...day, tick: hungerTicks / 2 })).toBe(50);
    const hungry = { ...day, tick: hungerTicks };
    expect([starving(hungry), goalFor(hungry)]).toEqual([true, hungryLine]);
    const fed = pick({ ...hungry, ...at("shack-1") }, "shack", 0);
    expect([starving(fed), fed.pocket, fed.done]).toEqual([
      false,
      1_000 - (meals.shack ?? 0),
      ["ate-shack"],
    ]);
    expect(why({ ...hungry, pocket: 0 }, "court", 2)).toBe("not enough DUN");
    const court = pick({ ...hungry, ...at("food-court") }, "court", 1);
    expect(court.done).toEqual(["ate-tacos"]);
  });

  it("sells through the drive-through to a hero at the wheel, a day five side quest", () => {
    const car = { ...started(1, 7, 5), pocket: 100, ride: "car" as const };
    expect(pick(car, "shack", 0).done).toEqual(["ate-shack", "drive-thru"]);
    expect(sidesOf(pick(car, "shack", 0))[3]?.done).toBe(true);
  });

  it("sends the hero after the waitress's lost dog, out by the food court, and pays for bringing her home", () => {
    const day = { ...started(1, 7, 4), pocket: 0 };
    const dog = spotNamed("dog");
    if (dog === undefined) throw new Error("no dog");
    expect(openTo(dog, day)).toBe(false);
    const asked = pick(day, "shack", 1);
    expect(openTo(dog, asked)).toBe(true);
    expect(why(asked, "shack", 1)).toBe(
      "Biscuit is still out there, near the food court",
    );
    const found = pick(asked, "dog", 0);
    expect(openTo(dog, found)).toBe(false);
    const home = pick(found, "shack", 1);
    expect([home.pocket, sidesOf(home)[5]?.done]).toEqual([100, true]);
    expect(why(home, "shack", 1)).toBe("Biscuit is home, wagging");
  });

  it("serves the Diamond Plate at Diamond Hands, a last-day side quest", () => {
    const day = { ...started(1, 7, 7), pocket: 600 };
    const dined = pick(day, "opal", 0);
    expect([dined.pocket, sidesOf(dined)[4]?.done]).toEqual([100, true]);
  });

  it("streams from The Dome VR only when fed, pays by the ten seconds and cuts at a minute, leaving the hero starving", () => {
    const pod = { ...started(1, 7, 2), ...at("vr-stream"), pocket: 0 };
    expect(why({ ...pod, tick: hungerTicks }, "stream", 0)).toBe(
      "you are starving: eat first, then stream",
    );
    const live = pick(pod, "stream", 0);
    expect(why(live, "stream", 0)).toBe("you are live already");
    const done = advance(live, streamTicks + 1);
    expect([done.streamFrom, done.pocket, starving(done)]).toEqual([
      -1,
      (streamPay * streamTicks) / 300,
      true,
    ]);
    const left = advance({ ...live, x: live.x + 2_000 }, 10);
    expect(left.streamFrom).toBe(-1);
  });

  it("has the Diamond Hands gang walk up once a hero has made 50,000 today: buy their NFT, or refuse and get a star of heat", () => {
    // Out on the street by the loft's door, with nothing else in reach.
    const rich = {
      ...started(1, 7, 5),
      made: gangAt,
      pocket: 10_000,
      x: 15_460,
      z: 17_300,
    };
    foodTick(rich);
    expect(rich.gang).toEqual({ x: rich.x, z: rich.z });
    const asked = degenRules.step(rich, {
      data: { tick: rich.tick },
      type: "act",
    });
    expect(asked.ok && asked.state.talk).toBe("gang");
    const bought = pick(rich, "gang", 0);
    expect([bought.pocket, bought.gang]).toEqual([10_000 - nftPrice, null]);
    const refused = pick(rich, "gang", 1);
    expect([refused.heat - rich.heat, refused.gang]).toEqual([
      heatPerStar,
      null,
    ]);
    const away = { ...rich, x: rich.x + 5_000 };
    foodTick(away);
    expect(away.gang).toBeNull();
    expect(foodDeed({ ...rich }, "food-nothing")).toBe("nothing to do");
  });

  it("spins Silky's signs (neon at night), keeps Biscuit by the stalls or at the hero's heels, and stands the gang beside the hero", () => {
    const food = buildFood();
    const dog = food.root.getObjectByName("biscuit");
    const day = { ...started(1, 7, 4) };
    food.show({ ...day, tick: nightTick }, 1);
    expect(dog?.visible).toBe(false);
    food.show({ ...day, done: ["dog-asked"] }, 2);
    expect([dog?.visible, dog?.position.x]).toEqual([true, at("dog").x / 100]);
    food.show({ ...day, done: ["dog-asked", "dog-found"] }, 3);
    expect(dog?.position.x).toBeCloseTo(day.x / 100 - 0.9);
    food.show({ ...day, gang: { x: day.x, z: day.z } }, 4);
    expect(food.root.getObjectByName("gang-0")?.visible).toBe(true);
    food.show(null, 5);
    expect(food.root.visible).toBe(false);
  });
});
