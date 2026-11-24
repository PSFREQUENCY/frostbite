import {
  AdditiveBlending,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";

import type { DayState } from "../rules/types.ts";
import type { Subject } from "./camera.ts";

// The butterfly effect, worn: a hero whose timeline a trip back has bent (`fate`) carries it about them. A brighter timeline is golden
// butterflies looping round them, wings beating; a darker one is grey shards of static flickering about them. Three more for every
// step either way, up to a dozen. It reads the day and decides nothing.
const most = 12;
export const flutterOf = (fate: number): number =>
  Math.min(most, Math.abs(fate) * 3);

export interface Aura {
  readonly root: Group;
  show(state: Pick<DayState, "fate">, at: Subject, seconds: number): void;
}

// One wing, hinged at the body along its edge: a broad upper lobe and a smaller lower one.
function wing(): ShapeGeometry {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.06, 0.2, 0.26, 0.24, 0.24, 0.08);
  shape.bezierCurveTo(0.23, 0.01, 0.12, 0, 0.1, 0);
  shape.bezierCurveTo(0.2, -0.04, 0.18, -0.16, 0.08, -0.14);
  shape.bezierCurveTo(0.03, -0.12, 0, -0.06, 0, 0);
  return new ShapeGeometry(shape, 6);
}

export function buildAura(): Aura {
  const root = new Group();
  root.name = "aura";
  const glow = (colour: string, additive: boolean): MeshBasicMaterial =>
    new MeshBasicMaterial({
      blending: additive ? AdditiveBlending : undefined,
      color: colour,
      depthWrite: false,
      opacity: 0.9,
      side: DoubleSide,
      transparent: true,
    });
  const gold = new InstancedMesh(wing(), glow("#ffc93c", true), most * 2);
  const grey = new InstancedMesh(
    new PlaneGeometry(0.14, 0.1),
    glow("#a7afc4", false),
    most * 2,
  );
  gold.name = "butterflies";
  grey.name = "static";
  root.add(gold, grey);
  const matrix = new Matrix4();
  const spin = new Quaternion();
  const turn = new Euler();
  const place = new Vector3();
  const size = new Vector3(1, 1, 1);
  const none = new Vector3(0, 0, 0);
  return {
    root,
    show(state, at, seconds) {
      const count = flutterOf(state.fate);
      const bright = state.fate > 0;
      root.visible = count > 0;
      gold.count = bright ? count * 2 : 0;
      grey.count = bright ? 0 : count * 2;
      for (let index = 0; index < count; index += 1) {
        const around =
          seconds * (0.8 + (index % 3) * 0.2) +
          (index * Math.PI * 2) / Math.max(1, count);
        const out = 0.8 + (index % 4) * 0.18;
        place.set(
          at.x + Math.cos(around) * out,
          at.y + 1 + Math.sin(seconds * 1.7 + index) * 0.55,
          at.z + Math.sin(around) * out,
        );
        if (bright) {
          // Two wings hinged at the body, beating, the body heading round the circle.
          const flap = 0.25 + Math.abs(Math.sin(seconds * 14 + index)) * 1.1;
          for (const side of [0, 1]) {
            turn.set(0.5, -around + (side === 0 ? flap : Math.PI - flap), 0);
            gold.setMatrixAt(
              index * 2 + side,
              matrix.compose(place, spin.setFromEuler(turn), size),
            );
          }
          continue;
        }
        // Static flickers: each shard is there or not, a beat at a time.
        for (const side of [0, 1]) {
          const lit = Math.sin(seconds * 23 + index * 7 + side * 3) > -0.2;
          turn.set(seconds * 3 + index, seconds * 2 + side, 0);
          place.y += side * 0.35;
          grey.setMatrixAt(
            index * 2 + side,
            matrix.compose(place, spin.setFromEuler(turn), lit ? size : none),
          );
        }
      }
      gold.instanceMatrix.needsUpdate = true;
      grey.instanceMatrix.needsUpdate = true;
    },
  };
}
