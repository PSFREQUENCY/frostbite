import {
  AdditiveBlending,
  CapsuleGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";

import { ticksPerSecond } from "../rules/constants.ts";
import { flying } from "../rules/flight.ts";
import { units } from "../rules/move.ts";
import { powerOf, type Power } from "../rules/powers.ts";
import type { DayState } from "../rules/types.ts";
import { hash } from "./hash.ts";
import { hillAt } from "./hill.ts";
import { liftOf } from "./lift.ts";

// What a power keeps doing after the first burst (`powers.ts` has the burst): a glow round the hero in the power's colour; sparks that
// do what the power does: dirt and stones thrown up round a dig (and the gem, when one is found, spinning up out of the hole), frost
// blown ahead by the ice giant, dust kicked out by the bear's stamp, a rainbow swirling up round the unicorn, eyes' light round the
// dog and the cat, a puff where the wizard left and one where they land; streaks of speed behind a charge; and while the dragon flies,
// a trail of green sparks behind it. It reads the day and decides nothing.
export interface PowerFx {
  readonly root: Group;
  show(day: DayState | null, colour: string): void;
}

const sparks = 64;
// How long the sparks of a use last (seconds), by power.
export const lasting: Readonly<Record<Power, number>> = {
  blink: 1,
  breath: 1.4,
  charge: 1,
  dig: 1.6,
  fly: 1,
  sense: 1,
  shimmer: 2.2,
  sight: 1.6,
  strength: 1.2,
  vision: 1.6,
};
const matrix = new Matrix4();
const turn = new Quaternion();
const where = new Vector3();
const size = new Vector3();
const none = new Matrix4().makeScale(0, 0, 0);
const upward = new Vector3(0, 1, 0);
const dirt = ["#8a5a3a", "#6b4a2f", "#b48a6a"];
const rainbow = [
  "#ff5d5d",
  "#ffd166",
  "#7be36b",
  "#5beac6",
  "#6aa8ff",
  "#c9b6ff",
];

export function buildPowerFx(): PowerFx {
  const root = new Group();
  root.name = "power-fx";
  const glow = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#ffffff",
    depthWrite: false,
    opacity: 0.35,
    side: DoubleSide,
    transparent: true,
  });
  const aura = new Mesh(new CapsuleGeometry(0.55, 1.1, 6, 14), glow);
  aura.name = "power-aura";
  const bits = new InstancedMesh(
    new OctahedronGeometry(0.09, 0),
    new MeshBasicMaterial({ color: "#ffffff" }),
    sparks,
  );
  bits.name = "power-sparks";
  bits.frustumCulled = false;
  const gem = new Mesh(
    new OctahedronGeometry(0.3, 0),
    new MeshBasicMaterial({ color: "#5beac6" }),
  );
  gem.name = "power-gem";
  const mound = new Mesh(
    new SphereGeometry(0.7, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshBasicMaterial({ color: "#6b4a2f" }),
  );
  mound.name = "power-mound";
  root.add(aura, bits, gem, mound);
  const paint = new Color();
  // Where the hero was a moment ago, for the flight's trail and the wizard's leaving.
  const trail: Vector3[] = [];
  let left = new Vector3();
  let used = -1;
  return {
    root,
    show(day, colour) {
      root.visible = day !== null;
      if (day === null) return;
      const power = powerOf(day.hero);
      const age = (day.tick - day.powerAt) / ticksPerSecond;
      const live = day.powerAt >= 0 && age >= 0 && age < lasting[power];
      const [x, z] = [day.x / 100, day.z / 100];
      const y = hillAt(x, z) + (liftOf(day) ?? 0);
      const here = new Vector3(x, y, z);
      if (day.powerAt !== used) {
        used = day.powerAt;
        if (power === "blink" && trail[0] !== undefined)
          left = trail[0].clone();
      }
      trail.unshift(here);
      trail.length = Math.min(trail.length, 24);
      const [east, south] = units[day.facing] ?? [0, 1_024];
      const [ahead, aside] = [
        new Vector3(east / 1_024, 0, south / 1_024),
        new Vector3(-south / 1_024, 0, east / 1_024),
      ];
      // The glow round the hero: while a use lasts, while charging, and while flying.
      const glowing = live || day.tick < day.boostUntil || flying(day);
      aura.visible = glowing;
      aura.position.set(x, y + 1, z);
      glow.color.set(colour);
      glow.opacity = 0.22 + Math.sin(day.tick * 0.4) * 0.08;
      const part = live ? age / lasting[power] : 1;
      for (let index = 0; index < sparks; index += 1) {
        const [a, b, c] = [
          hash(index, 1, 7),
          hash(index, 2, 7),
          hash(index, 3, 7),
        ];
        let shown = live;
        let tint = colour;
        if (power === "dig") {
          // Thrown up and out, falling back.
          const out = 0.4 + a * 1.6;
          const up = 3 * part - 4.5 * part * part;
          where.set(
            x + Math.cos(b * 6.3) * out * part * 2,
            y + Math.max(0, up * (0.6 + c)),
            z + Math.sin(b * 6.3) * out * part * 2,
          );
          tint = dirt[index % dirt.length] ?? "#8a5a3a";
        } else if (power === "breath") {
          // Blown ahead in a widening cone.
          const far = 1 + part * 7 * (0.5 + a * 0.5);
          where
            .copy(here)
            .addScaledVector(ahead, far)
            .addScaledVector(aside, (b - 0.5) * far * 0.5);
          where.y = y + 1.6 + (c - 0.5) * far * 0.3;
          tint = "#e8fbff";
        } else if (power === "strength") {
          const out = 1 + part * 6 * (0.6 + a * 0.4);
          where.set(
            x + Math.cos(b * 6.3) * out,
            y + 0.2 + c * 0.4 * (1 - part),
            z + Math.sin(b * 6.3) * out,
          );
          tint = dirt[index % dirt.length] ?? "#b48a6a";
        } else if (power === "blink") {
          const from = index % 2 === 0 ? left : here;
          const out = part * 2 * (0.5 + a);
          where.set(
            from.x + Math.cos(b * 6.3) * out,
            from.y + 0.3 + c * 2,
            from.z + Math.sin(b * 6.3) * out,
          );
        } else if (power === "fly" || power === "sense" || power === "charge") {
          // A trail behind while flying; streaks of speed behind a charge.
          const back =
            trail[Math.min(trail.length - 1, Math.floor(a * trail.length))] ??
            here;
          shown = flying(day) || day.tick < day.boostUntil;
          where.copy(back).addScaledVector(aside, (b - 0.5) * 0.8);
          where.y = back.y + 0.3 + c * 1.4;
          tint = power === "fly" ? "#7be36b" : colour;
        } else {
          // A swirl rising round the hero: a rainbow for the unicorn, light round the dog's and the cat's eyes.
          const angle = b * 6.3 + age * 4;
          const out = 0.7 + a * 0.5;
          where.set(
            x + Math.cos(angle) * out,
            y +
              (power === "shimmer"
                ? part * 3 * (0.3 + c)
                : 1.5 + (c - 0.5) * 0.4),
            z + Math.sin(angle) * out,
          );
          tint =
            power === "shimmer"
              ? (rainbow[index % rainbow.length] ?? "#ffffff")
              : colour;
        }
        if (!shown) {
          bits.setMatrixAt(index, none);
          continue;
        }
        turn.setFromAxisAngle(upward, age * 6 + a * 3);
        bits.setMatrixAt(
          index,
          matrix.compose(where, turn, size.setScalar(1 - part * 0.5)),
        );
        bits.setColorAt(index, paint.set(tint));
      }
      bits.instanceMatrix.needsUpdate = true;
      if (bits.instanceColor !== null) bits.instanceColor.needsUpdate = true;
      // A dig leaves its mound a while; a gem found spins up out of it.
      const dug = power === "dig" && day.powerAt >= 0 && age >= 0 && age < 3;
      mound.visible = dug;
      mound.position.set(x + ahead.x * 0.9, hillAt(x, z), z + ahead.z * 0.9);
      mound.scale.set(1, Math.min(1, age * 3) * 0.5, 1);
      gem.visible = dug && day.done.includes(`gem-${String(day.powerAt)}`);
      gem.position.set(
        mound.position.x,
        mound.position.y + 0.6 + Math.min(1.4, age),
        mound.position.z,
      );
      gem.rotation.y = age * 5;
    },
  };
}
