import { InstancedMesh, PerspectiveCamera, type Scene } from "three";
import { describe, expect, it, vi } from "vitest";

import { heroes } from "../src/rules/heroes.ts";
import { spots } from "../src/rules/world.ts";
import { buildActor, buildTux, heroCount, stride } from "../src/view/actor.ts";
import { createRig, poseFor } from "../src/view/camera.ts";
import { frameOf, opening } from "../src/view/cine.ts";
import { buildCity, metres } from "../src/view/city.ts";
import type { Stage } from "../src/view/stage.ts";
import { createWorldView } from "../src/view/world-view.ts";
import { started } from "./support/replay.ts";

describe("the city", () => {
  it("has a tower on every lot, a marker on every spot, and Moon Tower over The Exchange", () => {
    const city = buildCity();
    const towers = city.getObjectByName("towers");
    const marks = city.getObjectByName("spots");
    expect(towers instanceof InstancedMesh && towers.count).toBe(36);
    expect(marks instanceof InstancedMesh && marks.count).toBe(spots.length);
    expect(city.getObjectByName("moon-tower")?.position.toArray()).toEqual([
      210, 55, 150,
    ]);
    expect(metres(18_000)).toBe(180);
  });
});

describe("the cast", () => {
  it("has a body for every hero and for a tux, with legs that walk and stand", () => {
    expect(heroCount).toBe(heroes.length);
    const giant = buildActor(3);
    expect(giant.root.scale.x).toBe(1.6);
    stride(giant, 13, 0.3);
    expect(giant.legs[0]?.rotation.x).not.toBe(0);
    expect(giant.legs[0]?.rotation.x).toBe(-(giant.legs[1]?.rotation.x ?? 0));
    stride(giant, 0, 0.3);
    expect(Math.abs(giant.legs[0]?.rotation.x ?? 1)).toBe(0);
    expect(buildTux().root.name).toBe("tux");
    expect(buildActor(99).root.children.length).toBeGreaterThan(3);
  });
});

describe("the camera", () => {
  const subject = { heading: 0, x: 10, y: 0, z: 20 };

  it("follows from the south, and looks back at a face or down at hands from in front", () => {
    expect(poseFor("follow", subject).from).toEqual([10, 6.5, 29]);
    expect(poseFor("talk", subject).from[0]).toBeGreaterThan(10);
    expect(poseFor("hands", subject).fov).toBeLessThan(
      poseFor("talk", subject).fov,
    );
    expect(poseFor("sky", subject).from[1]).toBeGreaterThan(
      poseFor("ride", subject).from[1],
    );
  });

  it("glides while it follows and cuts into and out of a close-up", () => {
    const rig = createRig();
    rig.aim("follow", subject, 0.016);
    expect(rig.pose()).toEqual(poseFor("follow", subject));
    const on = { ...subject, x: 20 };
    rig.aim("follow", on, 0.016);
    expect(rig.pose().from[0]).toBeGreaterThan(10);
    expect(rig.pose().from[0]).toBeLessThan(20);
    rig.aim("talk", on, 0.016);
    expect(rig.pose()).toEqual(poseFor("talk", on));
    rig.aim("follow", on, 0.016);
    expect(rig.pose()).toEqual(poseFor("follow", on));
    rig.aim("ride", on, 0.016);
    expect(rig.pose()).not.toEqual(poseFor("ride", on));
    const camera = new PerspectiveCamera();
    rig.cut({ fov: 33, from: [1, 2, 3], look: [0, 0, 0] });
    rig.apply(camera);
    expect([camera.fov, ...camera.position.toArray()]).toEqual([33, 1, 2, 3]);
  });
});

describe("a cinematic", () => {
  it("plays its shots in turn, each a move from one pose to another, and is over when they are", () => {
    const total = opening.reduce((sum, shot) => sum + shot.seconds, 0);
    expect(total).toBe(30);
    expect(frameOf(opening, 0)?.index).toBe(0);
    expect(frameOf(opening, -1)?.part).toBe(0);
    const grown = frameOf(opening, 9.5);
    expect([grown?.index, grown?.part, grown?.pose.from[1]]).toEqual([
      1, 0.5, 80,
    ]);
    expect(frameOf(opening, total)).toBeNull();
    expect(new Set(opening.map(({ caption }) => caption)).size).toBe(
      opening.length,
    );
  });
});

describe("the scene", () => {
  const draw = vi.fn<(scene: Scene) => void>();
  const stage: Stage = { camera: new PerspectiveCamera(), draw };
  const part = (name: string) => draw.mock.lastCall?.[0].getObjectByName(name);

  it("shows a day: the lead where the rules say, the crew behind, the tux, a ride, and the close-ups", () => {
    const view = createWorldView(stage);
    const day = {
      ...started(1, 7, 1),
      crew: [0, 6],
      dir: 0,
      tux: { x: 15_000, z: 15_500 },
    };
    view.day(day, 1, 0.016, false);
    expect(part("hero-7")?.visible).toBe(true);
    expect(part("hero-7")?.position.x).toBe(180);
    expect([
      part("hero-0")?.visible,
      part("hero-6")?.visible,
      part("hero-3")?.visible,
    ]).toEqual([true, true, false]);
    expect(part("hero-0")?.position.x).toBeLessThan(180);
    expect([
      part("tux")?.visible,
      part("tux")?.position.x,
      part("ride")?.visible,
    ]).toEqual([true, 150, false]);
    expect(stage.camera.fov).toBe(50);
    view.day(
      { ...day, crew: [], level: 2, ride: "heli", tux: null },
      1,
      0.016,
      false,
    );
    expect([
      part("ride")?.visible,
      part("ride")?.position.y,
      part("tux")?.visible,
    ]).toEqual([true, 24.8, false]);
    view.day({ ...day, talk: "offer-kiki" }, 1, 0.016, false);
    expect(stage.camera.fov).toBe(30);
    view.day({ ...day, dir: -1 }, 1, 0.016, true);
    expect(stage.camera.fov).toBe(26);
    view.day({ ...day, ride: "car" }, 1, 0.016, false);
    expect(part("ride")?.scale.z).toBe(3.8);
    const drawn = draw.mock.calls.length;
    view.day({ ...day, hero: 42 }, 1, 0.016, false);
    expect(draw.mock.calls).toHaveLength(drawn);
  });

  it("plays the opening with the city growing, and says when it is over", () => {
    const view = createWorldView(stage);
    expect(view.opening(0)).toBe(opening[0]?.caption);
    expect(part("towers")?.scale.y).toBe(0.02);
    view.opening(9.5);
    expect(part("towers")?.scale.y).toBe(0.5);
    view.opening(20);
    expect([part("towers")?.scale.y, part("hero-7")?.visible]).toEqual([
      1,
      false,
    ]);
    expect(view.opening(30)).toBeNull();
  });

  it("turns the ring to bring the chosen hero to the front, and shows a shadow for one still locked", () => {
    const view = createWorldView(stage);
    for (let frame = 0; frame < 300; frame += 1)
      view.turntable(3, false, frame * 0.016, 0.016);
    expect(part("hero-3")?.position.z).toBeCloseTo(191.2, 1);
    expect(part("hero-3")?.position.x).toBeCloseTo(180, 1);
    expect(part("locked")?.visible).toBe(false);
    view.turntable(9, true, 0, 0.016);
    expect([part("hero-9")?.visible, part("locked")?.visible]).toEqual([
      false,
      true,
    ]);
  });
});
