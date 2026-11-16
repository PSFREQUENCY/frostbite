import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";

import { eraOf, moonNight } from "../rules/calendar.ts";
import { createBumps, type Mover } from "./bumps.ts";
import type { DayState } from "../rules/types.ts";
import { box, hash } from "./hash.ts";
import { painted } from "./boards.ts";
import { paradeOn } from "./parade.ts";

// The town in numbers: the FREE FROST riot packing The Exchange on the first morning (signs up, bouncing), the Moon Night party under
// Moon Tower (every one of them in the same hooded parka), and the delivery robots rolling the streets on Launch Day. Each crowd is a few
// instanced meshes; nobody in it is anyone in particular.
export type Gathering = "parade" | "party" | "riot" | "robots";
const count = 160;
const matrix = new Matrix4();
const tilt = new Quaternion();
const axis = new Vector3();
const where = new Vector3();
const unit = new Vector3(1, 1, 1);
const jackets = [
  "#ff5d5d",
  "#5beac6",
  "#ffd166",
  "#6aa8ff",
  "#ff9ecf",
  "#c9c2ff",
] as const;

// Where each of the crowd stands: on the streets of a borough, near its middle (metres).
function spot(
  index: number,
  around: readonly [number, number],
  spread: number,
): readonly [number, number] {
  const along = (hash(index, 3, 9) - 0.5) * 2 * spread;
  const across = (hash(index, 5, 1) - 0.5) * 16;
  return index % 2 === 0
    ? [around[0] + across, around[1] + along]
    : [around[0] + along, around[1] + across];
}

export interface Crowd {
  readonly root: Group;
  // `hero` bumps into the people of a riot or a party as into anyone on the street (`bumps.ts`).
  show(gathering: Gathering | null, seconds: number, hero?: Mover | null): void;
}

export function buildCrowd(): Crowd {
  const root = new Group();
  root.name = "crowd";
  const cloth = new MeshStandardMaterial({ flatShading: true, roughness: 0.8 });
  const bodies = new InstancedMesh(
    new CapsuleGeometry(0.3, 0.9, 3, 8),
    cloth,
    count,
  );
  const heads = new InstancedMesh(new SphereGeometry(0.22, 8, 6), cloth, count);
  // The riot's placards, or a Degen Dash champion's cheers.
  const placards = painted("FREE FROST", "#ff5d5d");
  const cheers = painted("CHAMPION!", "#f2c14e");
  const signs = new InstancedMesh(new PlaneGeometry(1, 0.6), placards, count);
  const robots = new InstancedMesh(
    new BoxGeometry(0.9, 0.8, 1.2),
    new MeshStandardMaterial({
      color: "#c7d2e0",
      emissive: "#1d5d7a",
      flatShading: true,
    }),
    count,
  );
  for (const [name, mesh] of [
    ["crowd-bodies", bodies],
    ["crowd-heads", heads],
    ["crowd-signs", signs],
    ["robots", robots],
  ] as const) {
    mesh.name = name;
    root.add(mesh);
  }
  const skin = new Color("#e0b08a");
  const placed = createBumps(count);
  let last: Gathering | null = null;
  return {
    root,
    show(gathering, seconds, hero = null) {
      root.visible = gathering !== null;
      if (gathering === null) return;
      const robotic = gathering === "robots";
      bodies.visible = !robotic;
      heads.visible = !robotic;
      const loud = gathering === "riot" || gathering === "parade";
      signs.visible = loud;
      signs.material = gathering === "parade" ? cheers : placards;
      robots.visible = robotic;
      for (let index = 0; index < count; index += 1) {
        const [x, z] =
          gathering === "riot"
            ? spot(index, [180, 180], 40)
            : gathering === "party"
              ? spot(index, [180, 160], 26)
              : gathering === "parade"
                ? spot(index, [180, 173], 30)
                : spot(
                    index,
                    [
                      60 + 120 * (index % 3),
                      60 + 120 * Math.floor((index % 9) / 3),
                    ],
                    50,
                  );
        if (robotic) {
          const roll = Math.sin(seconds * 0.5 + index) * 20;
          robots.setMatrixAt(
            index,
            index % 2 === 0
              ? box(x, 0.4, z + roll, 0.9, 0.8, 1.2)
              : box(x + roll, 0.4, z, 1.2, 0.8, 0.9),
          );
          continue;
        }
        const at = placed(index, x, z, seconds, hero);
        const hop =
          at.lift +
          (loud
            ? Math.abs(Math.sin(seconds * 5 + index)) * 0.25
            : Math.abs(Math.sin(seconds * 3 + index)) * 0.1);
        // Knocked over, a body tips about its feet the way it went, head and sign with it.
        const lean = at.tip?.lean ?? 0;
        tilt.setFromAxisAngle(
          axis.set(at.tip?.z ?? 0, 0, -(at.tip?.x ?? 0)).normalize(),
          lean,
        );
        for (const [mesh, height] of [
          [bodies, 0.75],
          [heads, 1.5],
          [signs, 2.4],
        ] as const)
          mesh.setMatrixAt(
            index,
            matrix.compose(
              where.set(
                at.x + (at.tip?.x ?? 0) * height * Math.sin(lean),
                height * Math.cos(lean) + hop,
                at.z + (at.tip?.z ?? 0) * height * Math.sin(lean),
              ),
              tilt,
              unit,
            ),
          );
        if (gathering !== last) {
          const coat =
            gathering === "party"
              ? "#5d6470"
              : (jackets[index % jackets.length] ?? "#ffffff");
          bodies.setColorAt(index, new Color(coat));
          heads.setColorAt(
            index,
            gathering === "party" ? new Color("#5d6470") : skin,
          );
        }
      }
      for (const mesh of [bodies, heads, signs, robots])
        mesh.instanceMatrix.needsUpdate = true;
      if (gathering !== last) {
        if (bodies.instanceColor !== null)
          bodies.instanceColor.needsUpdate = true;
        if (heads.instanceColor !== null)
          heads.instanceColor.needsUpdate = true;
      }
      last = gathering;
    },
  };
}

// Which crowd a day has: a Degen Dash champion's parade, the riot before the speech on the first morning, the robots on Launch Day, the
// party once Moon Night's dream is dreamt.
export const gatheringOf = (state: DayState): Gathering | null => {
  if (state.gate > 0) return null;
  if (paradeOn(state)) return "parade";
  if (state.day === 1 && !state.done.includes("speech")) return "riot";
  if (eraOf(state.day) === 4) return "robots";
  return state.day === moonNight && state.beat >= 1 ? "party" : null;
};
