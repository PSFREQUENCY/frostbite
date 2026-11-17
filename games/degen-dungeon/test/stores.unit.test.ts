import { describe, expect, it } from "vitest";

import { fizzTicks, tankPace, visionTicks } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { paceOf } from "../src/rules/move.ts";
import { spotNamed, spots } from "../src/rules/places.ts";
import { roomAt, rooms } from "../src/rules/rooms.ts";
import { rayStore } from "../src/rules/sites.ts";
import { atmFee, storePrices } from "../src/rules/stores.ts";
import { nodes } from "../src/rules/talk.ts";
import type { DayState } from "../src/rules/types.ts";
import { talks } from "../src/script/lines.ts";
import { refusal, started } from "./support/replay.ts";

function step(
  state: DayState,
  type: string,
  data: Readonly<Record<string, number>> = {},
): DayState {
  const stepped = degenRules.step(state, {
    data: { ...data, tick: state.tick },
    type,
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
}
// An answer picked at a talk that is already open.
const at = (day: DayState, talk: string, choice: number): DayState =>
  step({ ...day, talk }, "pick", { choice });
const price = (item: string): number => storePrices[item] ?? 0;
const day: DayState = { ...started(3, 7, 5), fomo: 50, tick: 600, vision: 0 };

describe("the corner stores and the gas stations", () => {
  it("stand nine and six about the city, with a freezer in every corner store and a coin ATM in every gas station", () => {
    const stores = rooms.filter(({ kind }) => kind === "bodega");
    const pumps = rooms.filter(({ kind }) => kind === "gas");
    expect(new Set(stores.map(({ borough }) => borough)).size).toBe(9);
    expect(pumps).toHaveLength(6);
    for (const room of stores) {
      const freezer = spotNamed(`freezer-${room.id}`);
      expect(freezer && roomAt(freezer.x, freezer.z), room.id).toBe(room);
      expect(freezer).toMatchObject({
        kind: "talk",
        node: room.id === rayStore ? "freezer-ray" : "freezer",
      });
    }
    for (const room of pumps) {
      const atm = spotNamed(`atm-${room.id}`);
      expect(atm && roomAt(atm.x, atm.z), room.id).toBe(room);
      expect(spotNamed(room.id)).toMatchObject({ node: "shop-gas" });
    }
    expect(
      spots.filter((spot) => spot.kind === "talk" && spot.node === "id"),
    ).toHaveLength(1);
    // Every talk they open has words, an answer for each of its choices.
    for (const node of [
      "shop-bodega",
      "shop-gas",
      "freezer",
      "freezer-ray",
      "atm",
      "id",
    ])
      expect(talks[node]?.answers.length, node).toBe(nodes[node]?.length);
  });

  it("sell snacks at the counter and frozen things from the freezer, each for its price", () => {
    const chips = at(day, "shop-bodega", 0);
    expect([chips.pocket, chips.vision, chips.talk]).toEqual([
      day.pocket - price("chips"),
      90,
      "shop-bodega",
    ]);
    expect(at(day, "shop-bodega", 1).rep).toBe(day.rep + 3);
    expect(at(day, "shop-bodega", 2).fomo).toBe(42);
    expect(
      at({ ...day, vision: 2 * visionTicks }, "shop-bodega", 0).vision,
    ).toBe(2 * visionTicks);
    expect(at(day, "freezer", 0).fomo).toBe(38);
    const pint = at(day, "freezer", 1);
    expect([pint.fomo, pint.rep, pint.pocket]).toEqual([
      30,
      day.rep + 1,
      day.pocket - price("pint"),
    ]);
    expect(at(day, "freezer-ray", 1).fomo).toBe(38);
    expect(at(day, "shop-gas", 0)).toMatchObject({ fomo: 45, vision: 60 });
    expect(
      refusal({ ...day, pocket: 2, talk: "freezer" }, "pick", {
        choice: 0,
        tick: 600,
      }),
    ).toBe("not enough DUN");
  });

  it("sell a Fuzzy and trade the coin only on sight of an ID, which the kiosk makes once and the save keeps", () => {
    expect(
      refusal({ ...day, talk: "shop-gas" }, "pick", { choice: 1, tick: 600 }),
    ).toBe("ID first: the kiosk by The Shaft's Gwei Gas makes one");
    expect(
      refusal({ ...day, talk: "atm" }, "pick", { choice: 0, tick: 600 }),
    ).toContain("ID first");
    const carded = at(day, "id", 0);
    expect([
      carded.idCard,
      carded.pocket,
      carded.done.includes("id-card"),
    ]).toEqual([true, day.pocket - price("id"), true]);
    expect(
      refusal({ ...carded, talk: "id" }, "pick", { choice: 0, tick: 600 }),
    ).toBe("you have your ID already");
    // A Fuzzy: quicker on foot for half a minute.
    const fizzy = at(carded, "shop-gas", 1);
    expect(fizzy.fizz).toBe(fizzTicks);
    expect(paceOf(fizzy)).toBeGreaterThan(paceOf(carded));
    expect(advance(fizzy, fizzy.tick + fizzTicks).fizz).toBe(0);
    // The coin ATM: the floor's trade for a fee in, and a tenth of what comes out.
    const bought = at(carded, "atm", 0);
    expect(bought.bag).toBeGreaterThan(0);
    expect(bought.pocket).toBe(carded.pocket - atmFee - 100);
    const sold = at(bought, "atm", 1);
    expect(sold.bag).toBe(0);
    expect(sold.pocket).toBeLessThan(
      bought.pocket + Math.floor((bought.bag * 1_000) / 100),
    );
    expect(
      refusal({ ...carded, heat: 400, talk: "atm" }, "pick", {
        choice: 0,
        tick: 600,
      }),
    ).toBe("your wallet is locked");
    // The setting: a story day can start with the ID; a trip back cannot.
    const init = degenRules.init(3, { day: 2, hero: 7, idcard: 1 });
    expect(init.ok && init.state.idCard).toBe(true);
    expect(degenRules.init(3, { day: 1, hero: 7, idcard: 1, loop: 1 }).ok).toBe(
      false,
    );
    expect(degenRules.init(3, { day: 2, hero: 7, idcard: 2 }).ok).toBe(false);
  });

  it("fill a tank once a day, which makes anything with an engine a little quicker", () => {
    const full = at(day, "shop-gas", 2);
    expect(full.done).toContain("tank");
    expect(paceOf({ ...full, ride: "car" })).toBe(
      paceOf({ ...day, ride: "car" }) + tankPace,
    );
    expect(paceOf({ ...full, ride: "bike" })).toBe(
      paceOf({ ...day, ride: "bike" }),
    );
    expect(
      refusal({ ...full, talk: "shop-gas" }, "pick", { choice: 2, tick: 600 }),
    ).toBe("the tank is already full");
  });
});
