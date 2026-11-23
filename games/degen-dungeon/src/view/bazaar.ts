import {
  BoxGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  SphereGeometry,
} from "three";

import { bazaar, caveSites } from "../rules/caves.ts";
import { box, hash } from "./hash.ts";
import { caveFloor } from "./hill.ts";
import { coats, skins, type Plan } from "./insider-plans.ts";
import { toonSteps } from "./textures.ts";

// The Underground Bazaar, full: rows of stalls under striped canopies along the aisles, their tables heaped with pots, rolls of cloth,
// fruit and glittering stones, rugs laid out in front, strings of lanterns looped across the hall, a keeper behind every stall, and
// shoppers walking the aisles (`insiders.ts` draws the people from `bazaarPlans`). The main walk from the back door to the stairs stays
// clear, and so do the three honest traders' own stalls (`rules/caves.ts`).
export interface Bazaar {
  readonly root: Group;
  show(seconds: number): void;
}

export const stallRows = [28, 44, 76, 92] as const;
export const stallCols = [1365, 1373, 1381, 1389, 1397, 1405] as const;
const deep = caveFloor(bazaar.x0 / 100 + 1);
const traders = caveSites
  .filter(({ id }) => id.startsWith("trader-"))
  .map(({ x, z }) => [x / 100, z / 100] as const);
// The stalls that stand: every place in the grid but a few left open, and none on a trader's own patch.
export const stalls: readonly (readonly [number, number])[] = stallRows
  .flatMap((z) => stallCols.map((x) => [x, z] as const))
  .filter(
    ([x, z]) =>
      hash(x, z, 1) >= 0.15 &&
      traders.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > 6),
  );
const cloth = [
  "#d64545",
  "#ffd166",
  "#3fae6b",
  "#6aa8ff",
  "#ff8fd8",
  "#ff8a3c",
];

export const bazaarPlans: readonly Plan[] = (() => {
  const plans: Plan[] = [];
  const base = {
    bag: false,
    face: 0,
    pace: 0,
    place: -1,
    r: 0,
    rise: 0,
    to: [0, 0] as const,
    y: deep,
  };
  const dress = (index: number) => ({
    coat: coats[Math.floor(hash(index, 31, 1) * coats.length)] ?? "#ffd166",
    phase: hash(index, 31, 3) * 10,
    skin: skins[Math.floor(hash(index, 31, 2) * skins.length)] ?? "#c68642",
  });
  stalls.forEach(([x, z], index) =>
    plans.push({ ...base, ...dress(index), doing: "stand", x, z: z - 1.5 }),
  );
  for (let k = 0; k < 52; k += 1) {
    const along = k % 2 === 0;
    const lane = along
      ? (stallRows[k % stallRows.length] ?? 28) + 3.4
      : (stallCols[k % stallCols.length] ?? 1365) + 4;
    plans.push({
      ...base,
      ...dress(100 + k),
      bag: k % 3 === 0,
      doing: "line",
      pace: 0.8 + hash(k, 5, 5) * 0.6,
      to: along ? [1411, lane] : [lane, 97],
      x: along ? 1362 : lane,
      z: along ? lane : 23,
    });
  }
  // A crowd along the main walk, both ways.
  for (let k = 0; k < 18; k += 1)
    plans.push({
      ...base,
      ...dress(200 + k),
      doing: "line",
      pace: 0.9 + (k % 3) * 0.2,
      to: [1408, 55 + (k % 9) * 1.2],
      x: 1364,
      z: 55 + (k % 9) * 1.2,
    });
  return plans;
})();

export function buildBazaar(): Bazaar {
  const root = new Group();
  root.name = "bazaar";
  const toon = new MeshToonMaterial({ gradientMap: toonSteps });
  const unit = new BoxGeometry(1, 1, 1);
  // Tables, canopies and their posts, and rugs: one instanced box each, coloured one by one.
  const parts: (readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    string,
  ])[] = [];
  stalls.forEach(([x, z], index) => {
    const hue = cloth[index % cloth.length] ?? "#d64545";
    parts.push([x, deep + 0.45, z, 3.2, 0.9, 1.4, "#8a5a3a"]);
    parts.push([x, deep + 2.7, z + 0.2, 3.8, 0.12, 2.2, hue]);
    for (const [dx, dz] of [
      [-1.7, -0.8],
      [1.7, -0.8],
      [-1.7, 1.2],
      [1.7, 1.2],
    ] as const)
      parts.push([x + dx, deep + 1.35, z + dz, 0.1, 2.7, 0.1, "#5a3a2f"]);
    if (index % 2 === 0)
      parts.push([
        x,
        deep + 0.02,
        z + 2.6,
        2.6,
        0.03,
        1.6,
        cloth[(index + 2) % cloth.length] ?? "#ffd166",
      ]);
  });
  const boxes = new InstancedMesh(unit, toon, parts.length);
  boxes.name = "bazaar-stalls";
  parts.forEach(([x, y, z, w, h, d, colour], index) => {
    boxes.setMatrixAt(index, box(x, y, z, w, h, d));
    boxes.setColorAt(index, new Color(colour));
  });
  // The goods heaped on each table.
  const perStall = 9;
  const goods = new InstancedMesh(
    new IcosahedronGeometry(0.16, 0),
    new MeshToonMaterial({ gradientMap: toonSteps }),
    stalls.length * perStall,
  );
  goods.name = "bazaar-goods";
  stalls.forEach(([x, z], stall) => {
    for (let k = 0; k < perStall; k += 1) {
      const index = stall * perStall + k;
      const size = 0.7 + hash(stall, k, 4) * 0.8;
      goods.setMatrixAt(
        index,
        box(
          x - 1.3 + (k % 5) * 0.62,
          deep + 1.02 + Math.floor(k / 5) * 0.2,
          z - 0.3 + Math.floor(k / 5) * 0.5,
          size,
          size,
          size,
        ),
      );
      goods.setColorAt(
        index,
        new Color(cloth[(stall + k) % cloth.length] ?? "#ffffff"),
      );
    }
  });
  // Strings of lanterns looped across the hall, sagging between the walls.
  const [x0, x1, z0, z1] = [
    bazaar.x0 / 100,
    bazaar.x1 / 100,
    bazaar.z0 / 100,
    bazaar.z1 / 100,
  ];
  const strings = 8;
  const perString = 18;
  const lanterns = new InstancedMesh(
    new SphereGeometry(0.16, 8, 6),
    new MeshBasicMaterial({ color: "#ffffff" }),
    strings * perString,
  );
  lanterns.name = "bazaar-lanterns";
  for (let line = 0; line < strings; line += 1)
    for (let k = 0; k < perString; k += 1) {
      const part = k / (perString - 1);
      const index = line * perString + k;
      lanterns.setMatrixAt(
        index,
        box(
          x0 + 2 + ((x1 - x0 - 4) * (line + 0.5)) / strings,
          deep + 5.4 - Math.sin(part * Math.PI) * 1.2,
          z0 + 1 + (z1 - z0 - 2) * part,
          1,
          1,
          1,
        ),
      );
      lanterns.setColorAt(
        index,
        new Color(
          ["#ffb000", "#ff6fb5", "#5beac6"][(k + line) % 3] ?? "#ffb000",
        ),
      );
    }
  root.add(boxes, goods, lanterns);
  return {
    root,
    show(seconds) {
      // The lanterns glow brighter and dimmer, like flames.
      lanterns.material.color.setScalar(0.82 + Math.sin(seconds * 3.1) * 0.18);
    },
  };
}
