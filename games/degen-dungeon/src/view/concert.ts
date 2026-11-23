import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  SphereGeometry,
  Vector3,
} from "three";

import { concertSites, showTick, stage } from "../rules/concert.ts";
import type { DayState } from "../rules/types.ts";
import { buildLooked, type Actor } from "./actor.ts";
import { painted } from "./boards.ts";
import { metres } from "./city.ts";
import { bandLooks, luxLook } from "./looks.ts";
import { toonSteps } from "./textures.ts";
import { buildZuri } from "./zuri.ts";

// The Floe Amphitheater (`rules/concert.ts`) on the Old Floe's north-east lawn: a stage facing south with a glowing screen, a lighting
// truss and speaker stacks, a bowl of benches in rings, and on the middle street a stadium gate with turnstiles, guards and a row of walk-
// through metal detectors under its sign. On day two, from late in the day, Lux and her band are on stage and the bowl fills; while her
// show plays (the thirty-second clip) the lights sweep and everyone dances. Posters for the show on ADOR's wall, where the flyer crew
// works, and Miss Mirinda on The Long Game's floor. It reads the day and decides nothing.
export interface Concert {
  readonly root: Group;
  show(day: DayState | null, seconds: number): void;
}
// How long the show runs once the drink is handed over (the clip's length; the day waits while it plays, so the view keeps the time).
const showSeconds = 30;

const [sx, sz] = [metres(stage.x), metres(stage.z)];
// The front edge of the stage, which the bowl's rings face.
const front = sz + 4.5;
const toon = (color: string): MeshToonMaterial =>
  new MeshToonMaterial({ color, gradientMap: toonSteps });
const glow = (color: string): MeshBasicMaterial =>
  new MeshBasicMaterial({ color });

export function buildConcert(): Concert {
  const root = new Group();
  root.name = "concert";
  const unit = new BoxGeometry(1, 1, 1);
  const box = (
    [x, y, z]: readonly [number, number, number],
    [w, h, d]: readonly [number, number, number],
    material: MeshToonMaterial | MeshBasicMaterial,
    parent: Group = root,
  ): Mesh => {
    const mesh = new Mesh(unit, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  // The stage, its lit edge, the screen behind, the truss over it and a speaker stack each side.
  box([sx, 0.6, sz], [16, 1.2, 9], toon("#2a2f45"));
  box([sx, 1.22, front], [16, 0.06, 0.2], glow("#ff6fb5"));
  const screen = box([sx, 4.8, sz - 4.3], [18, 7, 0.4], glow("#5beac6"));
  screen.name = "concert-screen";
  for (const side of [-1, 1]) {
    box([sx + side * 9, 5, sz - 3.5], [0.5, 10, 0.5], toon("#c7d2e0"));
    box([sx + side * 7.2, 2.8, front - 0.8], [1.6, 3.2, 1.4], toon("#11131c"));
  }
  box([sx, 10, sz - 3.5], [18.5, 0.5, 0.5], toon("#c7d2e0"));
  // The beams of light from the truss, swept while the show is on.
  const beams = [-6, -2, 2, 6].map((offset) => {
    const beam = new Mesh(
      new ConeGeometry(1.6, 9, 16, 1, true),
      new MeshBasicMaterial({
        color: offset < 0 ? "#ff6fb5" : "#5beac6",
        depthWrite: false,
        opacity: 0.22,
        side: DoubleSide,
        transparent: true,
      }),
    );
    beam.geometry.translate(0, -4.5, 0);
    beam.position.set(sx + offset, 9.8, sz - 3.2);
    root.add(beam);
    return beam;
  });
  // The bowl: rings of benches facing the stage, each a step higher toward the street.
  const benches: [number, number, number, number][] = [];
  for (let ring = 0; ring < 6; ring += 1) {
    const radius = 7 + ring * 2.6;
    for (let a = -1.15; a <= 1.15; a += 1.6 / radius)
      benches.push([
        sx + Math.sin(a) * radius,
        0.2 + ring * 0.12,
        front + Math.cos(a) * radius,
        -a,
      ]);
  }
  const seats = new InstancedMesh(unit, toon("#b9a27f"), benches.length);
  const matrix = new Matrix4();
  benches.forEach(([x, y, z, turn], index) => {
    matrix.makeRotationY(turn).scale(new Vector3(1.5, 0.4, 0.7));
    matrix.setPosition(x, y, z);
    seats.setMatrixAt(index, matrix);
  });
  root.add(seats);
  // The crowd on the benches.
  const fans = new InstancedMesh(
    new CapsuleGeometry(0.2, 0.62, 4, 8),
    toon("#ffffff"),
    benches.length,
  );
  fans.name = "concert-crowd";
  benches.forEach((_, index) =>
    fans.setColorAt(
      index,
      new Color(
        ["#ff5d5d", "#5beac6", "#ffd166", "#6aa8ff", "#ff6fb5", "#c9b6ff"][
          index % 6
        ],
      ),
    ),
  );
  root.add(fans);
  // The band and Lux, with her two buns.
  const band: Actor[] = bandLooks.map((look, index) =>
    buildLooked(look, `band-${String(index)}`),
  );
  [
    [sx - 4, sz + 1],
    [sx + 4, sz + 1],
    [sx, sz - 2],
    [sx + 5, sz - 2],
  ].forEach(([x = 0, z = 0], index) => {
    band[index]?.root.position.set(x, 1.2, z);
  });
  box([sx, 1.7, sz - 1.2], [1.6, 0.9, 1.2], toon("#c0392b"));
  box([sx + 5, 2, sz - 1.2], [1.8, 0.2, 0.6], toon("#11131c"));
  const lux = buildLooked(luxLook, "lux");
  for (const side of [-1, 1]) {
    const bun = new Mesh(new SphereGeometry(0.11, 10, 8), toon("#111111"));
    bun.position.set(side * 0.13, luxLook.height * 0.98, -0.02);
    lux.root.add(bun);
  }
  lux.root.position.set(sx, 1.2, front - 1.4);
  const performers = new Group();
  performers.add(lux.root, ...band.map(({ root: player }) => player));
  root.add(performers);
  // The stadium gate on the middle street: its sign, turnstiles and four walk-through metal detectors.
  const gate = concertSites.find(({ id }) => id === "concert-gate");
  const [gx, gz] = [metres(gate?.x ?? 0), metres(gate?.z ?? 0) - 3.4];
  const sign = new Mesh(
    new BoxGeometry(7, 1.2, 0.2),
    painted("FLOE AMPHITHEATER", "#ff6fb5"),
  );
  sign.position.set(gx, 4.2, gz);
  root.add(sign);
  for (const side of [-1, 1])
    box([gx + side * 3.6, 2.1, gz], [0.4, 4.2, 0.4], toon("#c7d2e0"));
  for (let lane = 0; lane < 4; lane += 1) {
    const x = gx - 2.4 + lane * 1.6;
    for (const side of [-1, 1])
      box([x + side * 0.45, 1.05, gz + 0.6], [0.12, 2.1, 0.5], toon("#9aa5b5"));
    box([x, 2.15, gz + 0.6], [1.02, 0.14, 0.5], toon("#9aa5b5"));
    box(
      [x, 1.9, gz + 0.86],
      [0.3, 0.1, 0.02],
      glow(lane % 2 === 0 ? "#3fae6b" : "#ff5d5d"),
    );
  }
  // Fresh posters for the show on boards along the pavement, where the flyer crew works.
  const flyers = concertSites.find(({ id }) => id === "flyers");
  const poster = painted("LUX LIVE TONIGHT", "#ffd166");
  for (let k = 0; k < 3; k += 1) {
    const x = metres(flyers?.x ?? 0) - 3 + k * 3;
    const z = metres(flyers?.z ?? 0) - 4.6;
    const sheet = new Mesh(new BoxGeometry(2, 1.4, 0.06), poster);
    sheet.position.set(x, 2.2, z);
    root.add(sheet);
    for (const side of [-1, 1])
      box([x + side * 0.9, 0.9, z - 0.05], [0.08, 1.8, 0.08], toon("#3a3346"));
  }
  // Miss Mirinda on The Long Game's floor.
  const partner = concertSites.find(({ id }) => id === "partner");
  const mirinda = buildZuri();
  mirinda.root.position.set(
    metres(partner?.x ?? 0),
    0,
    metres(partner?.z ?? 0) - 1,
  );
  root.add(mirinda.root);
  let last = 0;
  let began: number | null = null;
  return {
    root,
    show(day, seconds) {
      const dt = Math.min(0.1, Math.max(0, seconds - last));
      last = seconds;
      root.visible = day !== null;
      if (day === null) return;
      const given = day.done.includes("concert-show");
      if (!given) began = null;
      else began ??= seconds;
      const live = began !== null && seconds - began < showSeconds;
      const on =
        live || (day.day === 2 && day.loop === 0 && day.tick >= showTick);
      performers.visible = on;
      fans.visible = on;
      for (const beam of beams) beam.visible = on;
      if (on) {
        // Everyone dances: bodies bob on the beat, Lux turns and throws her arms up, the beams sweep.
        const beat = Math.abs(Math.sin(seconds * 4.2));
        benches.forEach(([x, y, z], index) => {
          matrix.makeTranslation(
            x,
            y + 0.6 + beat * (index % 3 === 0 ? 0.2 : 0.1),
            z,
          );
          fans.setMatrixAt(index, matrix);
        });
        fans.instanceMatrix.needsUpdate = true;
        lux.move(live ? 9 : 0, seconds, dt, false, live);
        lux.root.rotation.y = live ? Math.sin(seconds * 1.7) * 0.9 : 0;
        lux.root.position.y = 1.2 + (live ? beat * 0.12 : 0);
        band.forEach((player, index) => {
          player.move(0, seconds + index, dt, false, live && index !== 2);
        });
        beams.forEach((beam, index) => {
          beam.rotation.z =
            Math.sin(seconds * (live ? 1.6 : 0.5) + index) * 0.5;
          beam.rotation.x = 0.35 + Math.cos(seconds * 1.1 + index) * 0.2;
        });
        const hue = (seconds * 0.08) % 1;
        if (screen.material instanceof MeshBasicMaterial)
          screen.material.color.setHSL(hue, 0.7, live ? 0.55 : 0.35);
      }
      // She dances at the studio on any day, seen only near.
      mirinda.root.visible =
        Math.hypot(
          metres(day.x) - mirinda.root.position.x,
          metres(day.z) - mirinda.root.position.z,
        ) < 60;
      if (mirinda.root.visible)
        mirinda.pose(0, seconds, day.talk?.startsWith("partner") === true);
    },
  };
}
