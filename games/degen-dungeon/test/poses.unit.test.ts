import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { buildBody } from "../src/view/body.ts";
import { heroLooks } from "../src/view/looks.ts";
import { legReach, poseFor, wayOf, type Pose } from "../src/view/poses.ts";

// How tall a built body stands in a pose (metres), from its bounding box.
const heightIn = (way: Parameters<typeof poseFor>[0], pace = 0): number => {
  const look = heroLooks[7];
  if (look === undefined) throw new Error("no look");
  const body = buildBody(look);
  body.pose(pace, 1.3, false, null, way);
  body.root.updateMatrixWorld(true);
  return new Box3().setFromObject(body.root, true).getSize(new Vector3()).y;
};
const lowest = (pose: Pose): number =>
  Math.max(...pose.legs.map((leg) => legReach(leg, 0.435, 0.424, 0.064)));

describe("a body's poses", () => {
  it("follow the gait on the ground, and the wall while up one", () => {
    expect([
      wayOf(0, null),
      wayOf(1, null),
      wayOf(2, null),
      wayOf(3, null),
      wayOf(3, "climbing"),
      wayOf(2, "hanging"),
    ]).toEqual(["upright", "upright", "crouch", "crawl", "climb", "hang"]);
  });

  it("stand tall, stride with the arms against the legs, and run leaning in with bent elbows", () => {
    const still = poseFor("upright", 0, 2);
    expect(lowest(still)).toBeGreaterThan(0.85);
    const walk = poseFor("upright", 12, 0.3);
    const [left, right] = walk.legs;
    expect(Math.sign(left.hip)).toBe(-Math.sign(right.hip));
    expect(Math.sign(walk.arms[0].shoulder)).toBe(-Math.sign(left.hip));
    const run = poseFor("upright", 22, 0.3);
    expect(run.lean).toBeGreaterThan(walk.lean);
    expect(run.arms[0].elbow).toBeLessThan(-1.2);
    expect(walk.planted && run.planted).toBe(true);
  });

  it("crouch on bent knees, and crawl on hands and knees with the back flat and the arms straight down", () => {
    const low = poseFor("crouch", 6, 0.5);
    expect(Math.min(...low.legs.map((leg) => leg.knee))).toBeGreaterThan(1.3);
    expect(lowest(low)).toBeLessThan(0.7);
    const crawl = poseFor("crawl", 5, 0.5);
    expect(crawl.lean).toBeGreaterThan(1.1);
    for (const arm of crawl.arms)
      expect(Math.abs(arm.shoulder + crawl.lean)).toBeLessThan(0.35);
    // Kneeling: the knees are the lowest point, a thigh's length under the hips.
    expect(lowest(crawl)).toBeLessThan(lowest(low));
    expect(lowest(crawl)).toBeCloseTo(
      0.435 * Math.cos(crawl.legs[0].hip) + 0.064,
      1,
    );
    // A crawl moves a hand and the other side's knee forward together.
    expect(Math.sign(crawl.arms[0].shoulder + crawl.lean)).toBe(
      Math.sign(crawl.legs[1].hip - 0.12),
    );
  });

  it("climb hand over hand and hang with the arms up, held by the hands rather than standing", () => {
    const climb = poseFor("climb", 0, 0.4);
    expect(climb.arms.every((arm) => arm.shoulder < -2.3)).toBe(true);
    expect(climb.arms[0].shoulder).not.toBeCloseTo(climb.arms[1].shoulder, 2);
    const hang = poseFor("hang", 0, 0.4);
    expect(hang.arms.every((arm) => arm.shoulder < -2.5)).toBe(true);
    expect([climb.planted, hang.planted]).toEqual([false, false]);
    // A jump means nothing on a wall.
    expect(poseFor("climb", 0, 0.4, 0.5)).toEqual(climb);
  });

  it("tuck the legs and throw the arms up at the top of a jump, and land as they left", () => {
    const top = poseFor("upright", 12, 1, 0.5);
    expect(top.planted).toBe(false);
    expect(top.legs[0].knee).toBeGreaterThan(1.3);
    expect(top.arms[0].shoulder).toBeLessThan(-2);
    expect(poseFor("upright", 12, 1, 0).legs).toEqual(
      poseFor("upright", 12, 1).legs,
    );
  });

  it("bring a built body down as it crouches and lower still as it crawls, its joints doing it rather than a squash", () => {
    const standing = heightIn("upright");
    const crouched = heightIn("crouch", 6);
    const crawling = heightIn("crawl", 5);
    expect(crouched).toBeLessThan(standing * 0.85);
    expect(crawling).toBeLessThan(crouched);
    expect(heightIn("hang")).toBeGreaterThan(standing);
  });

  it("reach as far as a leg goes: the sole when standing, the knee when kneeling", () => {
    const straight = { hip: 0, knee: 0, spread: 0 };
    expect(legReach(straight, 0.4, 0.4, 0.05)).toBeCloseTo(0.8);
    const kneeling = { hip: 0, knee: Math.PI / 2, spread: 0 };
    expect(legReach(kneeling, 0.4, 0.4, 0.05)).toBeCloseTo(0.45);
  });
});
