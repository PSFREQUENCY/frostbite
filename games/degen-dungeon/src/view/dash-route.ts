import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshToonMaterial,
  SphereGeometry,
} from "three";

import { dashArch, stages } from "../rules/course.ts";
import type { Point } from "../rules/types.ts";
import { onStreet } from "../rules/world.ts";
import { metres } from "./city.ts";
import { toonSteps } from "./textures.ts";

// The Degen Dash's route, lit through the city once a ticket is handed to Miss Mirinda and the run is on: a ribbon of light along the
// streets from her arch through every gate and back, the leg to the next gate pulsing gold, and the city's people packed along both
// sides of it like a marathon, cheering, some with signs held high. It reads the day and decides nothing.
export interface DashRoute {
  readonly root: Group;
  show(dash: number, seconds: number): void;
}

// The street way from one place to the next (centimetres): along one axis then the other, by whichever corner keeps to the streets, or
// straight across for the short hops between a wall and a roof.
const along = (from: Point, to: Point): boolean => {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 200),
  );
  for (let step = 0; step <= steps; step += 1) {
    const x = from.x + ((to.x - from.x) * step) / steps;
    const z = from.z + ((to.z - from.z) * step) / steps;
    if (!onStreet(x, z)) return false;
  }
  return true;
};
export function legOf(from: Point, to: Point): readonly Point[] {
  for (const corner of [
    { x: to.x, z: from.z },
    { x: from.x, z: to.z },
  ])
    if (along(from, corner) && along(corner, to)) return [from, corner, to];
  return [from, to];
}

const tile = 1.5;
const side = 4.2;
const gap = 2.2;
const shirts = [
  "#ff5d5d",
  "#5beac6",
  "#ffd166",
  "#6aa8ff",
  "#ff6fb5",
  "#c9b6ff",
  "#3fae6b",
];
const skins = ["#f1c9a5", "#c99a73", "#8a5a3a", "#5a3a2a", "#e0b08a"];

export function buildDashRoute(): DashRoute {
  const root = new Group();
  root.name = "dash-route";
  root.visible = false;
  const points = [dashArch, ...stages];
  // Each tile of light: where (metres), which leg it is on, and how far along the whole route.
  const tiles: {
    x: number;
    z: number;
    turn: number;
    leg: number;
    at: number;
  }[] = [];
  const people: {
    face: number;
    phase: number;
    sign: boolean;
    x: number;
    z: number;
  }[] = [];
  let walked = 0;
  points.slice(1).forEach((to, leg) => {
    const from = points[leg] ?? dashArch;
    const way = legOf(from, to);
    for (let part = 1; part < way.length; part += 1) {
      const [a, b] = [way[part - 1] ?? from, way[part] ?? to];
      const [ax, az, bx, bz] = [
        metres(a.x),
        metres(a.z),
        metres(b.x),
        metres(b.z),
      ];
      const length = Math.hypot(bx - ax, bz - az);
      const [ux, uz] =
        length > 0 ? [(bx - ax) / length, (bz - az) / length] : [1, 0];
      for (let d = 0; d < length; d += tile) {
        const [x, z] = [ax + ux * d, az + uz * d];
        tiles.push({ at: walked + d, leg, turn: Math.atan2(ux, uz), x, z });
        if (Math.round(d / tile) % Math.round(gap / tile + 0.5) !== 0) continue;
        for (const way of [-1, 1]) {
          const [px, pz] = [x - uz * side * way, z + ux * side * way];
          if (!onStreet(px * 100, pz * 100)) continue;
          people.push({
            face: Math.atan2(x - px, z - pz),
            phase: (people.length * 1.7) % 6.28,
            sign: people.length % 4 === 0,
            x: px,
            z: pz,
          });
        }
      }
      walked += length;
    }
  });
  const ribbon = new InstancedMesh(
    new BoxGeometry(1.2, 0.04, 1.2),
    new MeshBasicMaterial({
      color: "#ffffff",
      depthWrite: false,
      opacity: 0.8,
      transparent: true,
    }),
    tiles.length,
  );
  ribbon.name = "dash-ribbon";
  const matrix = new Matrix4();
  tiles.forEach(({ turn, x, z }, index) => {
    matrix.makeRotationY(turn).setPosition(x, 0.05, z);
    ribbon.setMatrixAt(index, matrix);
  });
  const bodies = new InstancedMesh(
    new CapsuleGeometry(0.26, 0.9, 4, 8),
    new MeshToonMaterial({ color: "#ffffff", gradientMap: toonSteps }),
    people.length,
  );
  bodies.name = "dash-crowd";
  const heads = new InstancedMesh(
    new SphereGeometry(0.2, 10, 8),
    new MeshToonMaterial({ color: "#ffffff", gradientMap: toonSteps }),
    people.length,
  );
  const signs = new InstancedMesh(
    new BoxGeometry(0.9, 0.55, 0.05),
    new MeshBasicMaterial({ color: "#ffffff" }),
    people.length,
  );
  people.forEach((_, index) => {
    bodies.setColorAt(index, new Color(shirts[index % shirts.length]));
    heads.setColorAt(index, new Color(skins[index % skins.length]));
    signs.setColorAt(index, new Color(shirts[(index + 3) % shirts.length]));
  });
  root.add(ribbon, bodies, heads, signs);
  const lit = new Color();
  return {
    root,
    show(dash, seconds) {
      root.visible = dash > 0;
      if (dash <= 0) return;
      // The leg to the next gate pulses gold toward it; the rest of the way glows turquoise, the legs already run dimly.
      tiles.forEach(({ at, leg }, index) => {
        const next = leg === dash - 1;
        const wave = 0.5 + 0.5 * Math.sin(at * 0.5 - seconds * 6);
        if (next) lit.setRGB(1, 0.65 + 0.3 * wave, 0.2 + 0.3 * wave);
        else if (leg < dash - 1) lit.setRGB(0.05, 0.25, 0.25);
        else lit.setRGB(0.1, 0.75 + 0.2 * wave, 0.7);
        ribbon.setColorAt(index, lit);
      });
      if (ribbon.instanceColor !== null)
        ribbon.instanceColor.needsUpdate = true;
      // The crowd bounces on its toes, arms and signs up.
      people.forEach(({ face, phase, sign, x, z }, index) => {
        const hop = Math.abs(Math.sin(seconds * 5 + phase)) * 0.18;
        matrix.makeTranslation(x, 0.71 + hop, z);
        bodies.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, 1.42 + hop, z);
        heads.setMatrixAt(index, matrix);
        matrix.makeRotationY(face).setPosition(x, sign ? 2.1 + hop : -10, z);
        signs.setMatrixAt(index, matrix);
      });
      for (const mesh of [bodies, heads, signs])
        mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
