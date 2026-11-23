import {
  AdditiveBlending,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from "three";

import { ticksPerSecond } from "../rules/constants.ts";
import { units } from "../rules/move.ts";
import { letterNear, powerOf, type Power } from "../rules/powers.ts";
import type { DayState } from "../rules/types.ts";
import { metres } from "./city.ts";

// What a hero's power looks like when it is used (`rules/powers.ts`): a ring of light bursting out on the ground in the power's colour,
// a cone of frost from the ice giant's mouth, streaks for a charge, a column of light where a flyer or a blinker lands, a puff for a dig;
// and while the ram senses S, a gold beam from the hero toward S's nearest letter. It reads the day and decides nothing.
export interface PowerView {
  readonly root: Group;
  show(day: DayState | null): void;
}

const colours: Readonly<Record<Power, string>> = {
  blink: "#c9b6ff",
  breath: "#bff4ff",
  charge: "#ff5d5d",
  dig: "#c98a4b",
  fly: "#7be36b",
  sense: "#ffd166",
  shimmer: "#ff6fb5",
  sight: "#ff9ecf",
  strength: "#ffb000",
  vision: "#5beac6",
};
// How long a burst lasts, in seconds of the day.
const burst = 0.8;

const glow = (opacity: number): MeshBasicMaterial =>
  new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#ffffff",
    depthWrite: false,
    opacity,
    side: DoubleSide,
    transparent: true,
  });

export function buildPowers(): PowerView {
  const root = new Group();
  root.name = "powers";
  const ringMaterial = glow(0.8);
  const ring = new Mesh(new RingGeometry(0.6, 1, 40), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.name = "power-ring";
  const coneMaterial = glow(0.45);
  // Its point at the mouth, opening ahead.
  const cone = new Mesh(
    new ConeGeometry(1.6, 6, 20, 1, true).rotateX(-Math.PI / 2),
    coneMaterial,
  );
  cone.name = "power-breath";
  const pillar = new Mesh(
    new CylinderGeometry(0.7, 0.7, 12, 20, 1, true),
    glow(0.35),
  );
  pillar.name = "power-pillar";
  const beamMaterial = glow(0.6);
  const beam = new Mesh(
    new CylinderGeometry(0.08, 0.08, 1, 8).rotateX(Math.PI / 2),
    beamMaterial,
  );
  beam.name = "power-sense";
  root.add(ring, cone, pillar, beam);
  return {
    root,
    show(day) {
      root.visible = day !== null;
      if (day === null) return;
      const power = powerOf(day.hero);
      const age = (day.tick - day.powerAt) / ticksPerSecond;
      const live = day.powerAt >= 0 && age >= 0 && age < burst;
      const part = live ? age / burst : 1;
      const [x, z] = [metres(day.x), metres(day.z)];
      const [east, south] = units[day.facing] ?? [0, 1_024];
      const heading = Math.atan2(south, east);
      const colour = colours[power];
      ring.visible = live;
      ring.position.set(x, 0.06, z);
      ring.scale.setScalar(1 + part * (power === "strength" ? 9 : 5));
      ringMaterial.color.set(colour);
      ringMaterial.opacity = 0.8 * (1 - part);
      // The frost breath: a cone ahead along the heading, at head height.
      cone.visible = live && power === "breath";
      cone.position.set(
        x + Math.cos(heading) * 3.4,
        2.2,
        z + Math.sin(heading) * 3.4,
      );
      cone.lookAt(x + Math.cos(heading) * 9, 2.2, z + Math.sin(heading) * 9);
      coneMaterial.opacity = 0.45 * (1 - part);
      // A column of light where a flyer or a blinker came down, or over a dig.
      pillar.visible =
        live && (power === "fly" || power === "blink" || power === "dig");
      pillar.position.set(x, 6, z);
      pillar.scale.set(1, 1 - part * 0.6, 1);
      if (pillar.material instanceof MeshBasicMaterial)
        pillar.material.color.set(colour);
      // The ram's sense: a gold beam toward S's nearest letter.
      const letter = day.tick < day.senseUntil ? letterNear(day) : null;
      beam.visible = letter !== null;
      if (letter !== null) {
        const [lx, lz] = [metres(letter.x), metres(letter.z)];
        const length = Math.hypot(lx - x, lz - z);
        beam.scale.set(1, 1, Math.max(0.1, length));
        beam.position.set((x + lx) / 2, 1.4, (z + lz) / 2);
        beam.lookAt(lx, 1.4, lz);
        beamMaterial.color.set(colours.sense);
      }
    },
  };
}
