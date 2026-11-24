// @vitest-environment jsdom
import { InstancedMesh } from "three";
import { describe, expect, it } from "vitest";

import { dashArch, stages } from "../src/rules/course.ts";
import { masteryTick, mostTickets } from "../src/rules/mastery.ts";
import { onStreet } from "../src/rules/world.ts";
import { createToasts } from "../src/page/toasts.ts";
import { masteryLine, masters } from "../src/script/dash.ts";
import { buildDashRoute, legOf } from "../src/view/dash-route.ts";
import { started } from "./support/replay.ts";

describe("mastering a skill", () => {
  it("earns a Degen Dash ticket from whoever taught it, once a skill a day, from the second day on", () => {
    const grinder = { ...started(1, 7, 2), gigs: 3 };
    masteryTick(grinder);
    expect([grinder.done, grinder.tickets]).toEqual([["mastered-grinder"], 1]);
    masteryTick(grinder);
    expect(grinder.tickets).toBe(1);
    const many = { ...started(1, 7, 2), gigs: 3, grass: true, saved: true };
    masteryTick({ ...many, tickets: mostTickets });
    const capped = { ...many, tickets: mostTickets - 1 };
    masteryTick(capped);
    expect([capped.done.length, capped.tickets]).toEqual([3, mostTickets]);
    const first = { ...started(1, 7, 1), gigs: 3 };
    masteryTick(first);
    const trip = { ...started(1, 7, 2), gigs: 3, loop: 1 };
    masteryTick(trip);
    expect([first.tickets, trip.tickets]).toEqual([0, 0]);
  });

  it("is cheered with the teacher's name and the ticket for Miss Mirinda", () => {
    const card = document.createElement("div");
    const toasts = createToasts(card);
    const day = { ...started(1, 7, 2), tick: 30 };
    toasts.show(day, 0);
    toasts.show({ ...day, done: ["mastered-grinder"], tick: 60 }, 100);
    expect([card.hidden, card.textContent]).toEqual([
      false,
      `SKILL MASTERED${masteryLine(masters.grinder ?? "")}`,
    ]);
    expect(masteryLine("The courier desk")).toContain("Miss Mirinda");
  });
});

describe("the lit Dash route", () => {
  it("keeps to the streets between gates wherever a corner allows", () => {
    const points = [dashArch, ...stages];
    const legs = points
      .slice(1)
      .map((to, leg) => legOf(points[leg] ?? dashArch, to));
    // Seven of the nine legs run down the streets, round one corner at most; the hops from the wall to the roof and on to the frost
    // mark cut straight across.
    expect(legs.filter((way) => way.length === 3)).toHaveLength(7);
    expect(legs[4]).toEqual([stages[3], stages[4]]);
    for (const way of legs.filter((path) => path.length === 3))
      for (const point of way) expect(onStreet(point.x, point.z)).toBe(true);
  });

  it("lights only while a run is on, the leg to the next gate in gold, with a crowd on both sides holding up signs", () => {
    const route = buildDashRoute();
    route.show(0, 0);
    expect(route.root.visible).toBe(false);
    route.show(2, 1.5);
    expect(route.root.visible).toBe(true);
    const ribbon = route.root.getObjectByName("dash-ribbon");
    const crowd = route.root.getObjectByName("dash-crowd");
    if (!(ribbon instanceof InstancedMesh) || !(crowd instanceof InstancedMesh))
      throw new Error("no ribbon or crowd");
    expect(ribbon.count).toBeGreaterThan(200);
    expect(crowd.count).toBeGreaterThan(100);
    // The first tile is on the first leg (run already), dim; some tile on the second leg glows gold.
    const colour = (index: number): number[] => {
      const values = ribbon.instanceColor?.array ?? [];
      return [0, 1, 2].map((part) => values[index * 3 + part] ?? 0);
    };
    expect(colour(0)[0]).toBeLessThan(0.2);
    const gold = Array.from({ length: ribbon.count }, (_, index) =>
      colour(index),
    ).filter(([red]) => red === 1);
    expect(gold.length).toBeGreaterThan(10);
  });
});
