import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from "three";

import { box, hash } from "./blocks.ts";
import { painted } from "./boards.ts";

// The town in numbers: the FREE FROST riot packing The Exchange on the first morning (signs up, bouncing), the Moon Night party under
// Moon Tower (every one of them in the same hooded parka), and the delivery robots rolling the streets on Launch Day. Each crowd is a few
// instanced meshes; nobody in it is anyone in particular.
export type Gathering = "party" | "riot" | "robots";
const count = 160;
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
  show(gathering: Gathering | null, seconds: number): void;
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
  const signs = new InstancedMesh(
    new PlaneGeometry(1, 0.6),
    painted("FREE FROST", "#ff5d5d"),
    count,
  );
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
  let last: Gathering | null = null;
  return {
    root,
    show(gathering, seconds) {
      root.visible = gathering !== null;
      if (gathering === null) return;
      const robotic = gathering === "robots";
      bodies.visible = !robotic;
      heads.visible = !robotic;
      signs.visible = gathering === "riot";
      robots.visible = robotic;
      for (let index = 0; index < count; index += 1) {
        const [x, z] =
          gathering === "riot"
            ? spot(index, [180, 180], 40)
            : gathering === "party"
              ? spot(index, [180, 160], 26)
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
        const hop =
          gathering === "riot"
            ? Math.abs(Math.sin(seconds * 5 + index)) * 0.25
            : Math.abs(Math.sin(seconds * 3 + index)) * 0.1;
        bodies.setMatrixAt(index, box(x, 0.75 + hop, z, 1, 1, 1));
        heads.setMatrixAt(index, box(x, 1.5 + hop, z, 1, 1, 1));
        signs.setMatrixAt(index, box(x, 2.4 + hop, z, 1, 1, 1));
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
