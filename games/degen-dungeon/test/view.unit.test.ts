import {
  InstancedMesh,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  type Scene,
} from "three";
import { describe, expect, it, vi } from "vitest";

import { spots } from "../src/rules/places.ts";
import { boardLines, buildBoards, hillWords } from "../src/view/boards.ts";
import { buildLine, onRing } from "../src/view/line.ts";
import { createRig, poseFor } from "../src/view/camera.ts";
import { frameOf, opening } from "../src/view/cine.ts";
import { buildCity, metres } from "../src/view/city.ts";
import type { Stage } from "../src/view/stage.ts";
import { createWorldView } from "../src/view/world-view.ts";
import { started } from "./support/replay.ts";

describe("the city", () => {
  it("has its buildings, a marker for every place, Moon Tower over The Exchange, and shows only what is open today", () => {
    const city = buildCity();
    const towers = city.root.getObjectByName("towers");
    const marks = city.root.getObjectByName("spots");
    expect(towers?.children.length).toBeGreaterThan(18);
    expect(towers?.getObjectByName("shopfronts")).toBeDefined();
    city.night(1);
    expect(marks instanceof InstancedMesh && marks.count).toBe(spots.length);
    expect(city.root.getObjectByName("moon-tower")?.position.toArray()).toEqual(
      [210, 75, 150],
    );
    expect(metres(18_000)).toBe(180);
    const day = started(1, 7, 2);
    city.mark(day, 1);
    const matrix = new Matrix4();
    const shown = (id: string): boolean => {
      if (!(marks instanceof InstancedMesh)) return false;
      marks.getMatrixAt(
        spots.findIndex((spot) => spot.id === id),
        matrix,
      );
      return matrix.elements[0] !== 0;
    };
    expect([
      shown("faucet"),
      shown("letter-1"),
      shown("letter-4"),
      shown("frost"),
    ]).toEqual([true, false, true, true]);
    expect(city.root.getObjectByName("beat")?.visible).toBe(true);
    expect(city.root.getObjectByName("watcher")?.visible).toBe(false);
    city.mark({ ...day, looking: true }, 1);
    expect(city.root.getObjectByName("watcher")?.visible).toBe(true);
    city.mark(null, 1);
    expect([
      shown("faucet"),
      shown("letter-4"),
      city.root.getObjectByName("beat")?.visible,
    ]).toEqual([true, false, false]);
  });

  it("paints the boards and the hill sign for each era, and runs the Green Line round its ring", () => {
    const boards = buildBoards();
    const hill = boards.root.getObjectByName("hill-sign");
    boards.era(2);
    const mania = hill instanceof Mesh ? hill.material : null;
    boards.era(3);
    expect(hill instanceof Mesh ? hill.material : null).not.toBe(mania);
    expect(hillWords[2]).toBe("NGMI");
    expect(boardLines.every((lines) => lines.length >= 6)).toBe(true);
    expect(onRing(0)).toEqual([68, 93, 0]);
    expect(onRing(240)[0]).toBe(308);
    expect(onRing(-1)[0]).toBe(68);
    const line = buildLine();
    line.run(0);
    const train = line.root.getObjectByName("train");
    const before = train?.position.x;
    line.run(2);
    expect(train?.position.x).not.toBe(before);
  });
});

describe("the camera", () => {
  const subject = { heading: 0, x: 10, y: 0, z: 20 };

  it("rides low behind the hero's shoulder, and looks back at a face or down at hands from in front", () => {
    const [x, y, z] = poseFor("follow", subject).from;
    expect([x > 10, y < 4, z > 24]).toEqual([true, true, true]);
    const tight = poseFor("follow", subject, -Math.PI / 2, {
      indoors: true,
      low: false,
      open: 0,
      speed: 0,
    });
    expect(tight.from[2]).toBeLessThan(z);
    expect(
      poseFor("follow", subject, 0, {
        indoors: false,
        low: true,
        open: 1,
        speed: 1,
      }).from[0],
    ).toBeLessThan(10);
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
    // Walking east swings it round behind the hero; walking at it leaves it be.
    rig.aim("follow", { ...on, heading: 0 }, 2, true);
    expect(rig.yaw()).toBeGreaterThan(-0.5);
    const back = createRig();
    back.aim("follow", { ...on, heading: Math.PI / 2 }, 2, true);
    expect(back.yaw()).toBeCloseTo(-Math.PI / 2);
    expect(createRig(() => true).openness(0, 0)).toBe(0);
    expect(createRig().openness(0, 0)).toBe(1);
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
      part("car")?.visible,
    ]).toEqual([true, 150, false]);
    expect(stage.camera.fov).toBe(52);
    view.day(
      { ...day, crew: [], level: 2, ride: "heli", tux: null },
      1,
      0.016,
      false,
    );
    expect([
      part("heli")?.visible,
      part("heli")?.position.y,
      part("tux")?.visible,
    ]).toEqual([true, 24, false]);
    view.day({ ...day, talk: "offer-kiki" }, 1, 0.016, false);
    expect(stage.camera.fov).toBe(30);
    view.day({ ...day, dir: -1 }, 1, 0.016, true);
    expect(stage.camera.fov).toBe(24);
    view.day({ ...day, ride: "car" }, 1, 0.016, false);
    expect([part("car")?.visible, part("crowd")?.visible]).toEqual([
      true,
      true,
    ]);
    view.day(
      {
        ...day,
        cop: { x: 15_000, z: 15_500 },
        day: 4,
        tux: null,
        vests: { x: 18_000, z: 16_000 },
      },
      1,
      0.016,
      false,
    );
    expect([
      part("cop")?.visible,
      part("vest")?.visible,
      part("robots")?.visible,
    ]).toEqual([true, true, true]);
    view.day(
      { ...started(1, 0, 3), dir: 0, tick: 7_300, tools: 3 },
      1,
      0.016,
      false,
    );
    expect([
      part("airdrop")?.visible,
      part("snow")?.visible,
      part("crowd")?.visible,
    ]).toEqual([true, true, false]);
    view.day({ ...started(1, 0, 5), beat: 1 }, 1, 0.016, false);
    expect([
      part("crowd-signs")?.visible,
      part("crowd-bodies")?.visible,
      part("north")?.visible,
    ]).toEqual([false, true, false]);
    view.day(
      { ...started(1, 0, 5), dir: 12, gate: 1, z: -8_000 },
      1,
      0.016,
      false,
    );
    expect([part("north")?.visible, part("crowd")?.visible]).toEqual([
      true,
      false,
    ]);
    expect(stage.camera.fov).toBeGreaterThan(50);
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
    expect(part("hero-3")?.position.z).toBeCloseTo(67.4, 1);
    expect(part("hero-3")?.position.x).toBeCloseTo(300, 1);
    expect(part("locked")?.visible).toBe(false);
    view.turntable(9, true, 0, 0.016);
    expect([part("hero-9")?.visible, part("locked")?.visible]).toEqual([
      false,
      true,
    ]);
  });
});
