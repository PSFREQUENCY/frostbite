import {
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";

import { crowdAt, gatheringAt } from "../rules/crowd.ts";
import { spotNamed, spots } from "../rules/places.ts";
import type { Spot } from "../rules/spot.ts";
import type { DayState, Wheels } from "../rules/types.ts";
import { metres } from "./city.ts";
import { drawnAt } from "./parked.ts";
import { standAt } from "./stand.ts";

// The freeze ray's ice (`rules/freeze.ts`): a crystal shell of clear blue ice round everything frozen, a person in a tall one, a ride in
// a long one along its street, each turned its own way; in its last two seconds it shrinks as it melts. It reads the day and decides
// nothing.
const most = 63;
const melt = 60;
const wide: readonly Wheels[] = ["car", "semi", "truck", "van"];
const sizeOf = (ride: Wheels): readonly [number, number, number] =>
  wide.includes(ride) ? [2.4, 2.1, 5.2] : [1, 1.7, 2.2];

// Where something frozen is (metres), its size and turn, or null if it is not to be found.
function where(
  state: DayState,
  id: string,
): {
  readonly at: Vector3;
  readonly size: readonly [number, number, number];
  readonly turn: number;
} | null {
  const person: readonly [number, number, number] = [1, 2.2, 1];
  if (id.startsWith("crowd-")) {
    const gathering = gatheringAt(state);
    if (gathering === null) return null;
    const point = crowdAt(gathering, Number(id.slice(6)));
    return {
      at: new Vector3(metres(point.x), 1.1, metres(point.z)),
      size: person,
      turn: 0,
    };
  }
  if (id === "cop" || id === "tux") {
    const point = id === "cop" ? state.cop : state.tux;
    return point === null
      ? null
      : {
          at: new Vector3(metres(point.x), 1.1, metres(point.z)),
          size: person,
          turn: 0,
        };
  }
  if (id.startsWith("person-")) {
    const spot = spotNamed(id.slice(7));
    if (spot === undefined) return null;
    const stand = standAt(spot);
    return { at: new Vector3(stand.x, 1.1, stand.z), size: person, turn: 0 };
  }
  const left = state.left.find((ride) => ride.id === id);
  if (left !== undefined) {
    const size = sizeOf(left.ride);
    return {
      at: new Vector3(metres(left.x), size[1] / 2, metres(left.z)),
      size,
      turn: 0,
    };
  }
  const kerb = spots.find(
    (spot): spot is Extract<Spot, { kind: "parked" }> =>
      spot.kind === "parked" && spot.id === id,
  );
  if (kerb === undefined) return null;
  const drawn = drawnAt(kerb);
  const size = sizeOf(kerb.ride);
  return {
    at: new Vector3(drawn.x, size[1] / 2, drawn.z),
    size,
    turn: drawn.turn,
  };
}

export interface Ice {
  readonly root: InstancedMesh;
  show(state: DayState): void;
}

export function buildIce(): Ice {
  const geometry = new IcosahedronGeometry(0.5, 1);
  // Crack the round shell into facets, the same way every time.
  const points = geometry.getAttribute("position");
  for (let index = 0; index < points.count; index += 1) {
    const nudge = 1 + ((Math.sin(index * 12.9898) * 43_758.5453) % 1) * 0.12;
    points.setXYZ(
      index,
      points.getX(index) * nudge,
      points.getY(index) * nudge,
      points.getZ(index) * nudge,
    );
  }
  geometry.computeVertexNormals();
  const root = new InstancedMesh(
    geometry,
    new MeshStandardMaterial({
      color: new Color("#c9f6ff"),
      depthWrite: false,
      emissive: new Color("#5fd8ff"),
      emissiveIntensity: 0.45,
      flatShading: true,
      metalness: 0.1,
      opacity: 0.72,
      roughness: 0.12,
      transparent: true,
    }),
    most,
  );
  root.name = "ice";
  const matrix = new Matrix4();
  const spin = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const scale = new Vector3();
  return {
    root,
    show(state) {
      let count = 0;
      for (const frost of state.frozen) {
        if (count >= most) break;
        const found = where(state, frost.id);
        if (found === null) continue;
        const left = Math.min(1, (frost.until - state.tick) / melt);
        const [x, y, z] = found.size;
        spin.setFromAxisAngle(up, found.turn + count * 0.7);
        scale
          .set(x, y, z)
          .multiplyScalar(0.35 + 0.65 * Math.sqrt(Math.max(0, left)));
        root.setMatrixAt(count, matrix.compose(found.at, spin, scale));
        count += 1;
      }
      root.count = count;
      root.visible = count > 0;
      root.instanceMatrix.needsUpdate = true;
    },
  };
}
