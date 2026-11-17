import {
  Fog,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Scene,
  Vector3,
  type Object3D,
} from "three";
import { describe, expect, it } from "vitest";

import { roofLevel } from "../src/rules/climb.ts";
import { crowdAt } from "../src/rules/crowd.ts";
import { signFace } from "../src/rules/mountain.ts";
import { spots } from "../src/rules/places.ts";
import { insideAt, rooms } from "../src/rules/rooms.ts";
import { rayStore } from "../src/rules/sites.ts";
import type { DayState } from "../src/rules/types.ts";
import { buildForm } from "../src/view/actor.ts";
import { buildAura, flutterOf } from "../src/view/aura.ts";
import { buildChasers } from "../src/view/chasers.ts";
import { buildCrowd } from "../src/view/crowd.ts";
import type { Subject } from "../src/view/camera.ts";
import { metres } from "../src/view/city.ts";
import { buildIce } from "../src/view/ice.ts";
import { createRayView } from "../src/view/ray-view.ts";
import { subZeroDay } from "./support/freeze.ts";
import { started } from "./support/replay.ts";

const named = (root: Object3D, name: string): Object3D => {
  const found = root.getObjectByName(name);
  if (found === undefined) throw new Error(`no ${name}`);
  return found;
};
const deli = rooms.find(({ id }) => id === rayStore);
if (deli === undefined) throw new Error("no deli");
const shelf = insideAt(deli, 62, 900);
const atShelf: Subject = {
  heading: 0,
  x: metres(shelf.x) + 2,
  y: 0,
  z: metres(shelf.z),
};
const day = started(3, 7, 2);
const kerb = spots.find((spot) => spot.kind === "parked");
const talker = spots.find((spot) => spot.kind === "talk");
if (kerb === undefined || talker === undefined) throw new Error("no spots");
// How big an ice shell is drawn (its widest), by its place in the instances.
const sizeOf = (ice: InstancedMesh, index: number): number => {
  const matrix = new Matrix4();
  ice.getMatrixAt(index, matrix);
  const scale = new Vector3();
  matrix.decompose(new Vector3(), new Quaternion(), scale);
  return Math.max(scale.x, scale.y, scale.z);
};

describe("the freeze ray as it looks", () => {
  it("floats in a frosted case in Cold Harbor Deli's freezer until it is taken, then goes into the hand of the statue come to life", () => {
    const scene = new Scene();
    const forms = [buildForm(0), buildForm(1)];
    const view = createRayView(scene, forms);
    view.show(day, atShelf, 1);
    const display = named(scene, "ray-case");
    const shown = named(display, "freeze-ray");
    expect([display.visible, shown.visible]).toEqual([true, true]);
    expect(display.position.x).toBeCloseTo(metres(shelf.x));
    view.show(day, { ...atShelf, x: atShelf.x + 200 }, 1);
    expect(display.visible).toBe(false);
    // Taken: gone from the case, and held by the statue the hero wears.
    view.show({ ...day, form: 1, gun: true }, atShelf, 2);
    expect(shown.visible).toBe(false);
    const held = forms[1]?.root.getObjectByName("freeze-ray");
    expect(held?.visible).toBe(true);
    view.hide();
    expect([display.visible, held?.visible]).toEqual([false, false]);
  });

  it("shoots a beam for half a second after the trigger, out along the way last walked", () => {
    const scene = new Scene();
    const view = createRayView(scene, [buildForm(0)]);
    const beam = named(scene, "freeze-beam");
    const masked = { ...day, facing: 4, form: 0, gun: true, tick: 600 };
    view.show({ ...masked, rayAt: 597 }, atShelf, 1);
    expect(beam.visible).toBe(true);
    view.show({ ...masked, rayAt: 570 }, atShelf, 1);
    expect(beam.visible).toBe(false);
    // Without the ray in hand there is no beam, whatever the clock says.
    view.show({ ...masked, form: -1, rayAt: 597 }, atShelf, 1);
    expect(beam.visible).toBe(false);
  });

  it("ices the crowd, the chasers, the people at places and the rides it froze, each shell shrinking as it melts", () => {
    const sweep = subZeroDay().state();
    const ice = buildIce();
    ice.show(sweep);
    expect(ice.root.visible).toBe(true);
    expect(ice.root.count).toBe(Math.min(63, sweep.frozen.length));
    const frosted: DayState = {
      ...day,
      cop: { x: 18_000, z: 18_000 },
      frozen: [
        { id: "cop", until: day.tick + 900 },
        { id: "tux", until: day.tick + 900 },
        { id: `person-${talker.id}`, until: day.tick + 900 },
        { id: kerb.id, until: day.tick + 20 },
        { id: "ride-left", until: day.tick + 900 },
        { id: "crowd-3", until: day.tick + 900 },
        { id: "nobody", until: day.tick + 900 },
      ],
      left: [{ id: "ride-left", ride: "car", x: 9_000, z: 9_000 }],
    };
    ice.show(frosted);
    // The tux is not about, nobody is nobody, and with no crowd gathered today its people are nowhere: four shells.
    expect(ice.root.count).toBe(4);
    expect(sizeOf(ice.root, 2)).toBeLessThan(sizeOf(ice.root, 3));
    expect(crowdAt("riot", 3).x).toBeGreaterThan(0);
    ice.show({ ...frosted, frozen: [] });
    expect([ice.root.count, ice.root.visible]).toEqual([0, false]);
  });

  it("holds the frozen still: one of the riot stops bouncing, and a frozen cop stops turning to follow the hero", () => {
    const crowd = buildCrowd();
    const bodies = named(crowd.root, "crowd-bodies");
    if (!(bodies instanceof InstancedMesh)) throw new Error("no crowd");
    const frost = [{ id: "crowd-0", until: 900 }];
    const at = (index: number): Vector3 => {
      const matrix = new Matrix4();
      bodies.getMatrixAt(index, matrix);
      return new Vector3().setFromMatrixPosition(matrix);
    };
    const stand = crowdAt("riot", 0);
    for (const seconds of [1.1, 1.37]) {
      crowd.show("riot", seconds, null, frost);
      const still = new Vector3(metres(stand.x), 0.75, metres(stand.z));
      expect(at(0).distanceTo(still)).toBeLessThan(1e-4);
    }
    crowd.show("riot", 1.1, null, []);
    const first = at(0).y;
    crowd.show("riot", 1.37, null, []);
    expect(at(0).y).not.toBe(first);
    const chasers = buildChasers();
    const [cop] = chasers.actors;
    if (cop === undefined) throw new Error("no cop");
    const chased = { ...day, cop: { x: 18_000, z: 18_000 } };
    const iced = { ...chased, frozen: [{ id: "cop", until: 900 }] };
    chasers.show(iced, { heading: 0, x: 170, y: 0, z: 180 }, 1, 0.1);
    chasers.show(iced, { heading: 0, x: 180, y: 0, z: 170 }, 1, 0.1);
    expect(cop.root.rotation.y).toBe(0);
    chasers.show(chased, { heading: 0, x: 180, y: 0, z: 170 }, 1, 0.1);
    expect(cop.root.rotation.y).not.toBe(0);
  });

  it("wears the butterfly effect: golden butterflies for a brighter timeline, grey static for a darker one, more each step", () => {
    const aura = buildAura();
    const at: Subject = { heading: 0, x: 10, y: 0, z: 10 };
    const butterflies = named(aura.root, "butterflies");
    const noise = named(aura.root, "static");
    if (!(butterflies instanceof InstancedMesh)) throw new Error("no wings");
    if (!(noise instanceof InstancedMesh)) throw new Error("no static");
    aura.show({ fate: 2 }, at, 1);
    expect([aura.root.visible, butterflies.count, noise.count]).toEqual([
      true,
      12,
      0,
    ]);
    aura.show({ fate: -3 }, at, 1.3);
    expect([butterflies.count, noise.count]).toEqual([0, 18]);
    aura.show({ fate: 0 }, at, 1);
    expect(aura.root.visible).toBe(false);
    expect([flutterOf(1), flutterOf(-9)]).toEqual([3, 12]);
  });

  it("lifts the haze for a hero sitting on a WAGMI letter, so the whole city shows", () => {
    const scene = new Scene();
    scene.fog = new Fog("#000000", 40, 420);
    const view = createRayView(scene, [buildForm(0)]);
    const sitting = {
      ...day,
      level: roofLevel,
      x: signFace + 40,
      z: 6_250,
    };
    view.show(sitting, atShelf, 1);
    expect(scene.fog.far).toBeGreaterThanOrEqual(1_100);
  });
});
