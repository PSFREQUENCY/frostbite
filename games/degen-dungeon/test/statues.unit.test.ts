import { Group, Mesh } from "three";
import { describe, expect, it } from "vitest";

import { advance } from "../src/rules/day.ts";
import { paceOf } from "../src/rules/move.ts";
import { spotNamed } from "../src/rules/places.ts";
import { masksWorn, statueId, statues, wear } from "../src/rules/statues.ts";
import type { Draft } from "../src/rules/types.ts";
import {
  floorRadius,
  inVenue,
  outdoors,
  plazaRadius,
  venueAt,
  venues,
} from "../src/rules/venues.ts";
import { onLand, onStreet } from "../src/rules/world.ts";
import { buildForm } from "../src/view/actor.ts";
import { castFor } from "../src/view/lead.ts";
import { maskParts, masks, wearMask } from "../src/view/masks.ts";
import { athlete } from "../src/view/statues.ts";
import { started } from "./support/replay.ts";

describe("the statues", () => {
  it("stand one in each borough, and their masks go on, come off and give a quicker stride on foot", () => {
    expect(statues).toHaveLength(9);
    for (const [index, statue] of statues.entries()) {
      expect(onStreet(statue.x, statue.z), statue.label).toBe(true);
      expect(spotNamed(statueId(index))?.kind).toBe("statue");
    }
    const day: Draft = { ...started(1, 7, 1) };
    const pace = paceOf(day);
    expect(wear(day, 4)).toBeNull();
    expect([day.form, masksWorn(day)]).toEqual([4, 1]);
    expect(paceOf(day)).toBeGreaterThan(pace);
    expect(wear(day, 6)).toBeNull();
    expect(wear(day, 6)).toBeNull();
    expect([day.form, masksWorn(day)]).toEqual([-1, 2]);
    expect(wear({ ...day, ride: "bike" }, 1)).toBe(
      "leave the ride you are on first",
    );
    expect(advance({ ...day, dir: 0, form: 3 }, 30).x).toBeGreaterThan(
      advance({ ...day, dir: 0 }, 30).x,
    );
  });

  it("are carved as athletes in sprint, standing on their toes, each in its own mask", () => {
    const body = athlete("#bfe9ff", 2);
    body.computeBoundingBox();
    expect(body.boundingBox?.min.y).toBeCloseTo(0);
    expect(body.boundingBox?.max.y ?? 0).toBeGreaterThan(1.5);
    expect(body.getAttribute("color").count).toBe(
      body.getAttribute("position").count,
    );
    const kinds = new Set(masks.map(({ kind }) => kind));
    expect(kinds.size).toBe(9);
    const sizes = masks.map((_, index) => maskParts(index).length);
    expect(new Set(sizes).size).toBeGreaterThan(4);
    expect(maskParts(99)).toEqual(maskParts(2));
    const head = new Group();
    wearMask(head, 8, 0.15);
    expect(head.children.every((part) => part instanceof Mesh)).toBe(true);
    expect(head.children).toHaveLength(maskParts(8).length);
  });

  it("come to life as the hero who wears their mask", () => {
    const forms = [buildForm(0), buildForm(1)];
    const cast = [buildForm(5), buildForm(6)];
    expect(castFor(cast, forms, { form: -1, hero: 0 })).toBe(cast);
    expect(castFor(cast, forms, { form: 1, hero: 0 })[0]).toBe(forms[1]);
    expect(castFor(cast, forms, { form: 7, hero: 1 })[1]).toBe(cast[1]);
    expect(forms[0]?.root.name).toBe("form-0");
  });
});

describe("the landmarks' lots", () => {
  it("are open ground round each hall, a round floor inside its wall, and the open lots wholly", () => {
    const hall = venues.find((venue) => !venue.open);
    const open = venues.find((venue) => venue.open);
    if (hall === undefined || open === undefined) throw new Error("no lots");
    const { x, z } = hall.middle;
    const corner = { x: hall.lot.x0 + 100, z: hall.lot.z0 + 100 };
    expect([
      outdoors(corner.x, corner.z),
      onStreet(corner.x, corner.z),
    ]).toEqual([true, true]);
    const wall = Math.round((floorRadius + plazaRadius) / 2);
    expect([onLand(x + wall, z), inVenue(x + wall, z)]).toEqual([false, false]);
    expect(inVenue(x + floorRadius - 10, z)).toBe(true);
    expect(venueAt(x + 1_500, z)?.id).toBe(hall.id);
    expect(venueAt(x + 1_500, z + 1_500)).toBeNull();
    expect(onStreet(open.middle.x, open.middle.z)).toBe(true);
  });
});
