import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshToonMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from "three";

import { block } from "../rules/constants.ts";
import { box } from "./hash.ts";
import { kerbs, turnedBox } from "./kerbs.ts";
import { buildNotices } from "./notices.ts";
import { toonSteps } from "./textures.ts";

// The street furniture of every block, on the pavements round each lot: lamps (lit at night, with a pool of light under each), fire
// hydrants, benches and bins, newspaper boxes, traffic lights at the crossroads cycling red, amber and green, posters pasted on the walls,
// flyers on the lamp posts, and a billboard on a pole at every crossroads, low enough to read from the street.
export interface Street {
  // The clock (seconds) and how dark it is (0 day, 1 night).
  run(seconds: number, night: number): void;
  readonly root: Group;
}

type Piece = readonly [Matrix4, string];
function many(
  name: string,
  geometry: BufferGeometry,
  material: Material,
  pieces: readonly Piece[],
): InstancedMesh {
  const mesh = new InstancedMesh(
    geometry,
    material,
    Math.max(1, pieces.length),
  );
  mesh.name = name;
  mesh.count = pieces.length;
  pieces.forEach(([matrix, colour], index) => {
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, new Color(colour));
  });
  return mesh;
}

export function buildStreet(): Street {
  const root = new Group();
  root.name = "street";
  const toon = new MeshToonMaterial({
    color: "#ffffff",
    gradientMap: toonSteps,
  });
  const lamps = kerbs(18, 1.3, 1);
  const lampPosts = lamps.map(({ x, z }): Piece => [
    box(x, 2.6, z, 0.16, 5.2, 0.16),
    "#2a2f45",
  ]);
  const heads = new InstancedMesh(
    new SphereGeometry(0.32, 10, 8),
    new MeshBasicMaterial({ color: "#fff1b8" }),
    Math.max(1, lamps.length),
  );
  heads.name = "lamp-heads";
  lamps.forEach(({ x, z }, index) =>
    heads.setMatrixAt(index, box(x, 5.3, z, 1, 1, 1)),
  );
  const pools = new InstancedMesh(
    new CircleGeometry(3.4, 20),
    new MeshBasicMaterial({
      blending: AdditiveBlending,
      color: "#ffcf8a",
      depthWrite: false,
      opacity: 0,
      transparent: true,
    }),
    Math.max(1, lamps.length),
  );
  pools.name = "lamp-light";
  lamps.forEach(({ x, z }, index) =>
    pools.setMatrixAt(
      index,
      new Matrix4().makeRotationX(-Math.PI / 2).setPosition(x, 0.05, z),
    ),
  );
  const hydrants = kerbs(31, 1.1, 2).map(({ x, z }): Piece => [
    box(x + 2.2, 0.4, z, 0.36, 0.8, 0.36),
    "#e63946",
  ]);
  const benches = kerbs(23, 0.9, 3).filter((_, index) => index % 2 === 0);
  const seats = benches.map(({ turn, x, z }): Piece => [
    turnedBox(x + 4, 0.45, z, 1.8, 0.12, 0.55, turn),
    "#8a5a3a",
  ]);
  const backs = benches.map(({ turn, x, z }): Piece => [
    turnedBox(x + 4, 0.8, z, 1.8, 0.5, 0.1, turn),
    "#8a5a3a",
  ]);
  const bins = benches.map(({ x, z }): Piece => [
    box(x + 5.6, 0.45, z, 0.5, 0.9, 0.5),
    "#3b7d4f",
  ]);
  const papers = kerbs(41, 1, 4).map(({ turn, x, z }, index): Piece => [
    turnedBox(x - 2.4, 0.55, z, 0.6, 1.1, 0.5, turn),
    index % 2 === 0 ? "#2f6fb5" : "#d64545",
  ]);
  // Traffic lights at the four corners of every borough's middle crossroads.
  const corners: [number, number][] = [];
  for (let borough = 0; borough < 9; borough += 1) {
    const cx = (block * (borough % 3)) / 100 + 60;
    const cz = (block * Math.floor(borough / 3)) / 100 + 60;
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const)
      corners.push([cx + dx * 9.6, cz + dz * 9.6]);
  }
  const signalPosts = corners.map(([x, z]): Piece => [
    box(x, 2.2, z, 0.18, 4.4, 0.18),
    "#1b1e2a",
  ]);
  const signalBoxes = corners.map(([x, z]): Piece => [
    box(x, 4.2, z, 0.5, 1.3, 0.5),
    "#1b1e2a",
  ]);
  const signals = new InstancedMesh(
    new SphereGeometry(0.16, 8, 6),
    new MeshBasicMaterial({ color: "#ffffff" }),
    Math.max(1, corners.length),
  );
  signals.name = "signals";
  corners.forEach(([x, z], index) =>
    signals.setMatrixAt(
      index,
      box(x, 4.2, z + (index % 2 === 0 ? 0.27 : -0.27), 1, 1, 1),
    ),
  );
  root.add(
    many("lamp-posts", new CylinderGeometry(0.5, 0.6, 1, 6), toon, lampPosts),
    heads,
    pools,
    many("hydrants", new CylinderGeometry(0.5, 0.6, 1, 8), toon, hydrants),
    many("benches", new BoxGeometry(1, 1, 1), toon, [...seats, ...backs]),
    many("bins", new CylinderGeometry(0.5, 0.45, 1, 8), toon, bins),
    many("news-boxes", new BoxGeometry(1, 1, 1), toon, papers),
    many(
      "signal-posts",
      new CylinderGeometry(0.5, 0.5, 1, 6),
      toon,
      signalPosts,
    ),
    many("signal-boxes", new BoxGeometry(1, 1, 1), toon, signalBoxes),
    signals,
  );
  root.add(buildNotices(lamps));
  const green = new Color("#22c55e");
  const amber = new Color("#ffb000");
  const red = new Color("#ff3b3b");
  const poolMaterial = pools.material;
  return {
    root,
    run(seconds, night) {
      heads.visible = true;
      if (!Array.isArray(poolMaterial)) poolMaterial.opacity = night * 0.32;
      pools.visible = night > 0.05;
      const phase = (seconds % 12) / 12;
      corners.forEach((_, index) => {
        const mine = (phase + (index % 2) * 0.5) % 1;
        signals.setColorAt(
          index,
          mine < 0.45 ? green : mine < 0.55 ? amber : red,
        );
      });
      if (signals.instanceColor !== null)
        signals.instanceColor.needsUpdate = true;
    },
  };
}
