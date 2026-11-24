import {
  BoxGeometry,
  EdgesGeometry,
  Fog,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Scene,
} from "three";

import { roofLevel } from "../rules/climb.ts";
import { rayReach } from "../rules/freeze.ts";
import { onLetterTop } from "../rules/mountain.ts";
import { insideAt, rooms } from "../rules/rooms.ts";
import { rayStore } from "../rules/sites.ts";
import type { DayState } from "../rules/types.ts";
import type { Actor } from "./actor.ts";
import { buildAura } from "./aura.ts";
import type { Subject } from "./camera.ts";
import { metres } from "./city.ts";
import { buildIce } from "./ice.ts";
import { buildBeam } from "./beam.ts";
import { buildRay } from "./ray.ts";

// The freeze ray in the city (`rules/freeze.ts`): floating in a frosted case in Cold Harbor Deli's freezer until it is taken, then in the hand of the
// statue come to life who carries it, kicking back with each shot and its beam running out along the heading; the ice on all it froze;
// the butterfly effect about a hero with a bent timeline (`aura.ts`); and, for a hero sitting on a WAGMI letter, the haze pushed far
// back so the whole city shows. It reads the day and decides nothing.
const sight = 70;
const held: readonly [number, number, number] = [-0.27, 1.05, 0.34];

export interface RayView {
  hide(): void;
  show(state: DayState, at: Subject, seconds: number): void;
}

export function createRayView(scene: Scene, forms: readonly Actor[]): RayView {
  const shown = buildRay();
  const hand = buildRay();
  const beam = buildBeam();
  const ice = buildIce();
  const aura = buildAura();
  // The case: a block of frost filling that part of the freezer, glowing faintly, with the ray swaying slowly inside it.
  const display = new Group();
  display.name = "ray-case";
  const block = new BoxGeometry(0.46, 1.5, 1.5);
  const frost = new Mesh(
    block,
    new MeshStandardMaterial({
      color: "#bfefff",
      depthWrite: false,
      emissive: "#7fdcff",
      emissiveIntensity: 0.6,
      opacity: 0.42,
      roughness: 0.2,
      transparent: true,
    }),
  );
  const rime = new LineSegments(
    new EdgesGeometry(block),
    new LineBasicMaterial({ color: "#ffffff" }),
  );
  display.add(frost, rime, shown.root);
  shown.root.scale.setScalar(2);
  shown.root.position.y = 0.05;
  scene.add(display, beam.root, ice.root, aura.root);
  const deli = rooms.find(({ id }) => id === rayStore);
  const shelf = deli === undefined ? { x: 0, z: 0 } : insideAt(deli, 62, 900);
  display.position.set(metres(shelf.x), 1.35, metres(shelf.z));
  const muzzle = new Vector3();
  return {
    hide() {
      for (const part of [display, hand.root, beam.root, ice.root, aura.root])
        part.visible = false;
    },
    show(state, at, seconds) {
      display.visible =
        Math.hypot(display.position.x - at.x, display.position.z - at.z) <
        sight;
      shown.root.visible = !state.gun;
      if (display.visible) {
        shown.animate(seconds);
        shown.root.rotation.y = Math.sin(seconds * 0.5) * 0.25;
      }
      const lead = state.gun && state.form >= 0 ? forms[state.form] : undefined;
      hand.root.visible = lead !== undefined;
      // How long since the last shot (seconds, thirty ticks a second).
      const age = (state.tick - state.rayAt) / 30;
      if (lead !== undefined) {
        if (hand.root.parent !== lead.root) lead.root.add(hand.root);
        hand.root.position.set(...held);
        hand.animate(seconds, Math.max(0, 1 - age * 4));
        hand.root.updateWorldMatrix(true, false);
        muzzle.set(0, 0, 0.32);
        hand.root.localToWorld(muzzle);
      }
      beam.show(
        muzzle,
        (state.facing * Math.PI) / 8,
        rayReach / 100,
        lead === undefined ? -1 : age,
      );
      ice.show(state);
      aura.show(state, at, seconds);
      // Sitting on a letter of the sign, the haze lifts so the whole city shows.
      if (
        state.level === roofLevel &&
        onLetterTop(state.x, state.z) &&
        scene.fog instanceof Fog
      ) {
        scene.fog.near = 160;
        scene.fog.far = Math.max(scene.fog.far, 1_100);
      }
    },
  };
}
