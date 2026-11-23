import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";

import { bazaar, caveSites, caveWay } from "../rules/caves.ts";
import type { DayState } from "../rules/types.ts";
import { buildLooked } from "./actor.ts";
import { painted } from "./boards.ts";
import { metres } from "./city.ts";
import { caveFloor } from "./hill.ts";
import { bandLooks, gangLook } from "./looks.ts";
import { toonSteps } from "./textures.ts";

// Underground (`rules/caves.ts`): the crystal caves going down from their mouth in the island's south-east corner, walled in dark rock
// and lined with crystals that shine back the light (quartz, diamond, amethyst, emerald and rose, glossy and glowing), down to the
// Underground Bazaar's hall: lanterns, stalls, patrons who turn to stare at whoever comes in the back way, the guard at the back door
// and the main stairs up. On the island: the caves' rock mouth with crystals glinting inside, the bazaar's lantern sign over its stairs on
// The Shaft's street, and the Light Re-emitter's ring of light by the Ice Runner. It reads the day and decides nothing.
export interface Caves {
  readonly root: Group;
  show(day: DayState | null, seconds: number): void;
}

const toon = (color: string): MeshToonMaterial =>
  new MeshToonMaterial({ color, gradientMap: toonSteps });
const shine = ["#e8f6ff", "#bff4ff", "#b48cff", "#3fae6b", "#ff9ecf"];
// A steady scatter from an index, for crystal sizes and turns.
const scatter = (index: number, salt: number): number =>
  (((Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453) % 1) + 1) % 1;

export function buildCaves(): Caves {
  const root = new Group();
  root.name = "caves";
  const unit = new BoxGeometry(1, 1, 1);
  const box = (
    [x, y, z]: readonly [number, number, number],
    [w, h, d]: readonly [number, number, number],
    material: MeshToonMaterial | MeshBasicMaterial | MeshStandardMaterial,
  ): Mesh => {
    const mesh = new Mesh(unit, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const rock = toon("#2b2438");
  // A glossy floor that gives the crystals back.
  const floor = new MeshStandardMaterial({
    color: "#4a3f66",
    metalness: 0.5,
    roughness: 0.2,
  });
  // Each piece of the way in two-metre slabs stepping down, walled north and south and roofed six metres up.
  const crystals: [number, number, number, number, number][] = [];
  for (const piece of [...caveWay, bazaar]) {
    const [x0, x1, z0, z1] = [
      metres(piece.x0),
      metres(piece.x1),
      metres(piece.z0),
      metres(piece.z1),
    ];
    for (let x = x0; x < x1; x += 2) {
      const y = caveFloor(x + 1);
      box([x + 1, y - 0.25, (z0 + z1) / 2], [2.02, 0.5, z1 - z0], floor);
      box([x + 1, y + 6.25, (z0 + z1) / 2], [2.02, 0.5, z1 - z0 + 2], rock);
      for (const z of [z0 - 0.5, z1 + 0.5])
        box([x + 1, y + 3, z], [2.02, 6.5, 1], rock);
      if (piece === bazaar) continue;
      for (const [side, z] of [
        [1, z0 + 0.4],
        [-1, z1 - 0.4],
      ] as const)
        crystals.push([
          x + 1 + scatter(x, side),
          y + 0.3 + scatter(x, 3) * 2.5,
          z,
          side,
          crystals.length,
        ]);
      if (z1 - z0 > 20)
        crystals.push([
          x + 1,
          y + 0.2,
          (z0 + z1) / 2 + (scatter(x, 7) - 0.5) * 12,
          0,
          crystals.length,
        ]);
    }
  }
  // Lit from within, each in its own colour.
  const gems = new InstancedMesh(
    new OctahedronGeometry(0.5, 0),
    new MeshBasicMaterial({ color: "#ffffff" }),
    crystals.length,
  );
  gems.name = "cave-crystals";
  const matrix = new Matrix4();
  const turn = new Quaternion();
  crystals.forEach(([x, y, z, side, index]) => {
    const size = 0.5 + scatter(index, 1) * 1.8;
    turn.setFromAxisAngle(
      new Vector3(side, 0.4, 1).normalize(),
      scatter(index, 2) * 2,
    );
    matrix.compose(
      new Vector3(x, y, z),
      turn,
      new Vector3(size * 0.6, size * 1.4, size * 0.6),
    );
    gems.setMatrixAt(index, matrix);
    gems.setColorAt(
      index,
      new MeshBasicMaterial({ color: shine[index % shine.length] }).color,
    );
  });
  root.add(gems);
  // The bazaar: lanterns over the stalls, the main stairs up the east wall, the guards at the back door and the patrons who stare.
  const [bx0, bx1, bz0, bz1] = [
    metres(bazaar.x0),
    metres(bazaar.x1),
    metres(bazaar.z0),
    metres(bazaar.z1),
  ];
  const deep = caveFloor(bx0 + 1);
  for (let k = 0; k < 10; k += 1) {
    const lamp = new Mesh(
      new SphereGeometry(0.45, 12, 10),
      new MeshBasicMaterial({ color: k % 2 === 0 ? "#ffb000" : "#ff6fb5" }),
    );
    lamp.position.set(
      bx0 + 6 + (k % 5) * 11,
      deep + 3.6,
      bz0 + 25 + Math.floor(k / 5) * 30,
    );
    root.add(lamp);
  }
  for (const site of caveSites.filter(({ id }) => id.startsWith("trader-"))) {
    const [x, z] = [metres(site.x), metres(site.z)];
    const away = z < (bz0 + bz1) / 2 ? -1 : 1;
    box([x, deep + 0.5, z + away * 1.4], [3.2, 1, 1], toon("#8a5a3a"));
    box(
      [x, deep + 2.6, z + away * 1.4],
      [3.6, 0.15, 1.8],
      new MeshBasicMaterial({
        color:
          site.id === "trader-gems"
            ? "#5beac6"
            : site.id === "trader-crystals"
              ? "#b48cff"
              : "#ffd166",
      }),
    );
  }
  for (let step = 0; step < 8; step += 1)
    box(
      [bx1 - 1 - step * 0.5, deep + 0.5 + step * 0.5, (bz0 + bz1) / 2],
      [0.6, 1 + step, 4],
      toon("#6b5a4a"),
    );
  const watchers = [gangLook, ...bandLooks].map((look, index) => {
    const one = buildLooked(look, `bazaar-${String(index)}`);
    one.root.position.set(
      index === 0 ? bx0 + 1.5 : bx0 + 8 + index * 6,
      deep,
      index === 0 ? (bz0 + bz1) / 2 + 2 : bz0 + 20 + (index % 2) * 40,
    );
    root.add(one.root);
    return one;
  });
  // On the island: the caves' mouth, the bazaar's sign, and the Light Re-emitter's ring.
  const at = (id: string): [number, number] => {
    const site = caveSites.find((one) => one.id === id);
    return [metres(site?.x ?? 0), metres(site?.z ?? 0)];
  };
  const [mx, mz] = at("cave-mouth");
  box([mx + 1.5, 1.6, mz - 2], [5, 3.2, 2.4], rock);
  for (let k = 0; k < 5; k += 1)
    box(
      [mx + 0.2 + k * 0.6, 0.4 + scatter(k, 4), mz - 0.8],
      [0.3, 0.8, 0.3],
      new MeshBasicMaterial({ color: shine[k % shine.length] }),
    );
  const [sx, sz] = at("bazaar-stairs");
  box(
    [sx, 2.6, sz - 2],
    [3.4, 1, 0.2],
    painted("UNDERGROUND BAZAAR", "#ffb000"),
  );
  box(
    [sx, 0.02, sz - 1],
    [2.4, 0.04, 2],
    new MeshBasicMaterial({ color: "#11131c" }),
  );
  const [ex, ez] = at("emitter");
  const ring = new Mesh(
    new TorusGeometry(1.1, 0.12, 12, 40),
    new MeshBasicMaterial({ color: "#5beac6" }),
  );
  ring.position.set(ex, 1.4, ez - 1.2);
  ring.name = "light-re-emitter";
  root.add(ring);
  box([ex, 0.3, ez - 1.2], [1.2, 0.6, 1.2], toon("#c7d2e0"));
  let last = 0;
  return {
    root,
    show(day, seconds) {
      const dt = Math.min(0.1, Math.max(0, seconds - last));
      last = seconds;
      root.visible = day !== null;
      if (day === null) return;
      ring.rotation.y = seconds * 1.5;
      ring.scale.setScalar(1 + Math.sin(seconds * 3) * 0.06);
      // Heads turn toward whoever came in the back way, until they are walked up and out.
      const stared =
        day.done.includes("bazaar-back") && !day.done.includes("kicked-out");
      for (const one of watchers) {
        if (stared)
          one.root.lookAt(metres(day.x), one.root.position.y, metres(day.z));
        one.move(0, seconds, dt, stared);
      }
    },
  };
}
