import { Group, type Object3D } from "three";
import { describe, expect, it } from "vitest";

import { rooms } from "../src/rules/rooms.ts";
import {
  buildingAt,
  createClimber,
  levelHeight,
} from "../src/view/climbing.ts";
import { ringOf, roofAt, shopRoof } from "../src/view/lots.ts";
import { bendPose, bendSeat, bonesOf } from "../src/view/models/bend.ts";
import { clipFor } from "../src/view/models/load.ts";
import { poseFor } from "../src/view/poses.ts";

// On The Exchange's middle street, 70 centimetres south of a building (the rules' own wall finder sees it to the north).
const wall = { level: 0, ride: "foot" as const, x: 15_000, z: 17_100 };

describe("a climb as it is shown", () => {
  it("rises a storey at a climber's pace, facing the wall and closing in on it, then hangs there", () => {
    const climber = createClimber();
    const ground = climber.follow(wall, 150, 171, 0.3, 0.1);
    expect(ground).toEqual({ heading: 0.3, hold: null, x: 150, y: 0, z: 171 });
    const going = climber.follow({ ...wall, level: 1 }, 150, 171, 0.3, 0.5);
    expect(going.y).toBeCloseTo(0.8);
    expect(going.hold).toBe("climbing");
    expect(going.heading).toBeCloseTo(-Math.PI / 2);
    expect(going.z).toBeLessThan(171);
    expect(going.x).toBe(150);
    let shown = going;
    for (let frame = 0; frame < 20; frame += 1)
      shown = climber.follow({ ...wall, level: 1 }, 150, 171, 0.3, 0.25);
    // The wall's storeys reach to just under its roof.
    const top = roofAt(150, 168.5) ?? 0;
    expect(top).toBeGreaterThan(3);
    expect(shown.hold).toBe("hanging");
    expect(shown.y).toBeCloseTo((top - 0.8) / 3);
    expect(shown.z).toBeCloseTo(171 - (0.7 - 0.42));
    const down = climber.follow(wall, 150, 171, 0.3, 0.5);
    expect(down.hold).toBe("climbing");
    expect(down.y).toBeCloseTo((top - 0.8) / 3 - 0.8);
    for (let frame = 0; frame < 20; frame += 1)
      shown = climber.follow(wall, 150, 171, 0.3, 0.25);
    expect([shown.hold, shown.y]).toEqual([null, 0]);
  });

  it("walks a hero on a roof at the roof's own height, and lets the camera over roofs lower than them", () => {
    const climber = createClimber();
    const roof = { level: 4, ride: "foot" as const, x: 15_000, z: 16_910 };
    let shown = climber.follow(roof, 150, 169.1, 1, 0.1);
    for (let frame = 0; frame < 120; frame += 1)
      shown = climber.follow(roof, 150, 169.1, 1, 0.1);
    expect([shown.hold, shown.x, shown.z]).toEqual([null, 150, 169.1]);
    expect(shown.y).toBeCloseTo(roofAt(150, 169.1) ?? 0);
    const inside = buildingAt(() => 0);
    const over = buildingAt(() => 99);
    expect([inside(150, 169.1), over(150, 169.1), inside(180, 180)]).toEqual([
      true,
      false,
      false,
    ]);
    // Where nothing is known of the roof (a tower), the camera keeps out at any height.
    expect(buildingAt(() => 99)(155, 155)).toBe(true);
  });

  it("knows each lot's ring of roofs, a shop's flats, and no roof over a street or a landmark", () => {
    const ring = ringOf(4, 0);
    expect(ring.length).toBeGreaterThan(6);
    for (const piece of ring) {
      const [x0, x1, z0, z1] = piece.box;
      expect(roofAt((x0 + x1) / 2, (z0 + z1) / 2)).toBe(piece.height);
    }
    expect(ringOf(4, 0)).toBe(ring);
    const shop = rooms[0];
    expect(
      roofAt(
        ((shop?.room.x0 ?? 0) + (shop?.room.x1 ?? 0)) / 200,
        ((shop?.room.z0 ?? 0) + (shop?.room.z1 ?? 0)) / 200,
      ),
    ).toBe(shopRoof);
    expect(roofAt(180, 180)).toBeNull();
    expect(ringOf(1, 2)).toEqual([]);
  });

  it("shows a helicopter at its level at once, and a hero moved by the story where they now are", () => {
    const climber = createClimber();
    const flying = climber.follow(
      { level: 2, ride: "heli", x: 18_000, z: 18_000 },
      180,
      180,
      1,
      0.016,
    );
    expect([flying.y, flying.hold]).toEqual([2 * levelHeight, null]);
    const moved = climber.follow(
      { level: 0, ride: "foot", x: 18_000, z: 18_000 },
      180,
      180,
      1,
      0.016,
    );
    expect(moved.y).toBe(0);
  });
});

// A model's skeleton as Frost Run's models name it: a body, arms and forearms, legs and shins (a four-legged one has front and back
// legs instead of arms).
function skeleton(four: boolean): Object3D {
  const root = new Group();
  const body = new Group();
  body.name = "body";
  root.add(body);
  for (const side of ["L", "R"]) {
    const [arm, fore, leg, shin] = four
      ? ["fleg", "fshin", "bleg", "bshin"]
      : ["arm", "fore", "leg", "shin"];
    for (const [name, parent] of [
      [`${String(arm)}.${side}`, body],
      [`${String(leg)}.${side}`, root],
    ] as const) {
      const bone = new Group();
      bone.name = name;
      parent.add(bone);
      const lower = new Group();
      lower.name = `${name.startsWith(String(arm)) ? String(fore) : String(shin)}.${side}`;
      bone.add(lower);
    }
  }
  return root;
}

describe("a model's bones", () => {
  it("bend to a crawl, a climb and a seat, on top of the turns they rest at", () => {
    const model = skeleton(false);
    const bones = bonesOf(model);
    expect(bones.quadruped).toBe(false);
    const crawl = poseFor("crawl", 4, 1);
    bendPose(bones, crawl, false);
    expect(model.getObjectByName("body")?.rotation.x).toBeCloseTo(crawl.lean);
    expect(model.getObjectByName("arm.L")?.rotation.x).toBeCloseTo(
      crawl.arms[0].shoulder,
    );
    bendSeat(bones, "seat", 0);
    expect(model.getObjectByName("leg.R")?.rotation.x).toBeCloseTo(-1.45);
  });

  it("put a four-legged model low on all fours to crawl, and up on its back legs to climb", () => {
    const model = skeleton(true);
    const bones = bonesOf(model);
    expect(bones.quadruped).toBe(true);
    const crouch = poseFor("crouch", 4, 1);
    bendPose(bones, crouch, false);
    expect(model.getObjectByName("fleg.L")?.rotation.x).toBeCloseTo(
      crouch.legs[1].hip,
    );
    expect(model.getObjectByName("body")?.rotation.x).toBeCloseTo(0);
    bendPose(bones, poseFor("climb", 0, 1), true);
    expect(model.getObjectByName("body")?.rotation.x).toBeCloseTo(-1.2);
  });

  it("play the model's own clips for standing, running, ducking and hopping", () => {
    expect([
      clipFor("upright", 0, -1, false),
      clipFor("upright", 12, -1, false),
      clipFor("upright", 12, 0.4, false),
      clipFor("crouch", 5, -1, false),
      clipFor("crawl", 4, -1, false),
      clipFor("crawl", 4, -1, true),
      clipFor("climb", 0, -1, false),
    ]).toEqual(["Idle", "Run", "Hop", "Duck", "Duck", "Run", "Idle"]);
  });
});
