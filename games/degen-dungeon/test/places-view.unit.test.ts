import { Scene } from "three";
import { describe, expect, it } from "vitest";

import { nightTick } from "../src/rules/constants.ts";
import { spotNamed, spots } from "../src/rules/places.ts";
import { beatOf } from "../src/rules/story.ts";
import type { DayState } from "../src/rules/types.ts";
import { stories } from "../src/script/stories.ts";
import { buildBeatScenes, sceneOf, scenes } from "../src/view/beat-scenes.ts";
import { createPeople } from "../src/view/npcs.ts";
import { buildThings, pieces } from "../src/view/things.ts";
import { started } from "./support/replay.ts";

describe("the places as people and things", () => {
  it("read a scene for every story beat from its words, the frame's auction among them", () => {
    expect(sceneOf("Grab the shiniest frame at the Meme Market auction.")).toBe(
      "auction",
    );
    expect(sceneOf("Fix a dead cabinet in the arcade for cash.")).toBe(
      "arcade",
    );
    expect(sceneOf("Carry a couch for a moving job.")).toBe("couch");
    expect(sceneOf("Find someone people trust.")).toBe("person");
    const kinds = new Set(stories.flat(2).map(({ line }) => sceneOf(line)));
    // Most kinds of scene are used, and every one but the person alone has its things.
    expect(kinds.size).toBeGreaterThan(12);
    for (const kind of kinds)
      if (kind !== "person") expect(scenes[kind].length).toBeGreaterThan(1);
  });

  it("put the beat's things and the one waiting there, with a gold mark over them until the talk opens", () => {
    const beats = buildBeatScenes();
    const day: DayState = { ...started(1, 1, 3), tick: 2_000 };
    const beat = beatOf(day);
    expect(beat).not.toBeNull();
    if (beat === null) return;
    beats.show(day, { x: beat.at.x / 100 - 6, z: beat.at.z / 100 }, 1, 0.1);
    const shown = beats.root.children.filter(({ visible }) => visible);
    expect(shown.length).toBe(3);
    expect(beats.root.getObjectByName("auction-sign")?.parent?.visible).toBe(
      true,
    );
    expect(beats.root.getObjectByName("beat-bang")?.visible).toBe(true);
    beats.show({ ...day, talk: "beat" }, { x: 0, z: 0 }, 2, 0.1);
    expect(beats.root.getObjectByName("beat-bang")?.visible).toBe(false);
    beats.show({ ...day, loop: 1 }, { x: 0, z: 0 }, 3, 0.1);
    expect(beats.root.children.filter(({ visible }) => visible)).toEqual([]);
    beats.show(null, { x: 0, z: 0 }, 4, 0.1);
  });

  it("draw each pickup as itself with a star over it, gold where the quest goes, and a ride on its stand unless ridden", () => {
    const things = buildThings();
    expect(Object.keys(pieces).length).toBeGreaterThanOrEqual(12);
    const named = (id: string) => things.root.getObjectByName(`thing-${id}`);
    const day = started(1, 7, 2);
    const faucet = spotNamed("faucet");
    things.show(day, faucet ?? null, 1);
    expect([named("faucet")?.visible, named("ride-scooter")?.visible]).toEqual([
      true,
      true,
    ]);
    expect(spots.filter(({ kind }) => kind === "letter").length).toBe(
      things.root.children.filter(({ name }) => name.startsWith("thing-letter"))
        .length,
    );
    things.show({ ...day, ride: "scooter" }, null, 2);
    expect(named("ride-scooter")?.visible).toBe(false);
    things.show(null, null, 3);
    expect(things.root.visible).toBe(false);
  });

  it("put a speech bubble over the town's people, and a gold mark over the one the quest wants", () => {
    const scene = new Scene();
    const people = createPeople(scene, [], []);
    const landlord = spotNamed("landlord-7");
    if (landlord === undefined) return;
    // Near nightfall with the rent owed and the money for it, the quest points at the landlord.
    const day: DayState = {
      ...started(1, 7, 2),
      pocket: 10_000,
      tick: nightTick - 100,
      x: landlord.x,
      z: landlord.z,
    };
    const at = { heading: 0, x: landlord.x / 100, y: 0, z: landlord.z / 100 };
    people.show(day, at, 1, 0.1);
    const bubbles = scene
      .getObjectByName("landlord-7")
      ?.getObjectByName("bubbles");
    expect(bubbles?.visible).toBe(true);
    expect(bubbles?.getObjectByName("bang")?.visible).toBe(true);
    people.show({ ...day, done: ["rent-paid"] }, at, 2, 0.1);
    expect(bubbles?.getObjectByName("speech")?.visible).toBe(true);
    // Nobody stands in the hero's own loft at the shop's laptop.
    expect(scene.getObjectByName("till-7")).toBeUndefined();
    people.hide();
  });
});
