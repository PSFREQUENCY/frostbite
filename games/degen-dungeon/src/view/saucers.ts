import {
  AdditiveBlending,
  ConeGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";

import { eraOf, invasionEra } from "../rules/calendar.ts";
import { beams, invading, invasionTick } from "../rules/invasion.ts";
import type { DayState } from "../rules/types.ts";
import { toonSteps } from "./textures.ts";

// The saucers over the island on the invasion day: four come down to hang over their street crossings, each with a beam of light to a
// glowing ring on the ground (where to stand), and eight more circle high above. Once peace is made or a trade done they lift and fly
// off together.
export interface Saucers {
  readonly root: Group;
  show(state: DayState, seconds: number, away: boolean): void;
}

const hover = 22;
const flyers = 8;
const centre = 180;
const arrive = 4;

const glow = (color: string, opacity = 1): MeshBasicMaterial =>
  new MeshBasicMaterial({
    blending: AdditiveBlending,
    color,
    depthWrite: false,
    opacity,
    side: DoubleSide,
    transparent: opacity < 1,
  });

// One saucer: a silver hull, a glass dome, a glowing belly and rim, and a ring of bulbs.
export function buildSaucer(): Group {
  const group = new Group();
  const hull = new Mesh(
    new SphereGeometry(1, 28, 10),
    new MeshToonMaterial({ color: "#c3cbe0", gradientMap: toonSteps }),
  );
  hull.scale.set(4.4, 0.75, 4.4);
  const belly = new Mesh(
    new SphereGeometry(1.6, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    glow("#5beac6", 0.85),
  );
  belly.position.y = -0.35;
  const dome = new Mesh(
    new SphereGeometry(1.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshToonMaterial({
      color: "#8ff6ff",
      gradientMap: toonSteps,
      opacity: 0.6,
      transparent: true,
    }),
  );
  dome.position.y = 0.4;
  const rim = new Mesh(new TorusGeometry(4.3, 0.16, 8, 40), glow("#ff4fd8"));
  rim.rotation.x = Math.PI / 2;
  group.add(hull, belly, dome, rim);
  for (let at = 0; at < 10; at += 1) {
    const bulb = new Mesh(
      new SphereGeometry(0.22, 8, 6),
      glow(at % 2 === 0 ? "#fff36b" : "#38e8ff"),
    );
    const angle = (at / 10) * Math.PI * 2;
    bulb.position.set(Math.cos(angle) * 3.7, 0.05, Math.sin(angle) * 3.7);
    group.add(bulb);
  }
  return group;
}

export function buildSaucers(): Saucers {
  const root = new Group();
  root.name = "saucers";
  root.visible = false;
  const hovering = beams.map(() => buildSaucer());
  const rays = beams.map(() => {
    const ray = new Mesh(
      new ConeGeometry(3.4, hover, 28, 1, true),
      glow("#aef9ff", 0.26),
    );
    const ring = new Mesh(new RingGeometry(2.6, 3.2, 40), glow("#5beac6", 0.8));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06 - hover / 2;
    ray.add(ring);
    return ray;
  });
  const flying = Array.from({ length: flyers }, () => buildSaucer());
  root.add(...hovering, ...rays, ...flying);
  let came = -1;
  let went = -1;
  return {
    root,
    show(state, seconds, away) {
      const today =
        eraOf(state.day) === invasionEra && state.tick >= invasionTick;
      const on = invading(state);
      if (!today) {
        came = -1;
        went = -1;
      } else if (on && came < 0) came = seconds;
      else if (!on && went < 0) went = seconds;
      const leaving = went < 0 ? 0 : seconds - went;
      root.visible = today && !away && (on || leaving < 8);
      if (!root.visible) return;
      const drop = Math.max(0, 1 - (seconds - Math.max(0, came)) / arrive);
      const lift = leaving * leaving * 5 + drop * drop * 90;
      hovering.forEach((saucer, index) => {
        const beam = beams[index] ?? { x: 0, z: 0 };
        saucer.position.set(
          beam.x / 100,
          hover + lift + Math.sin(seconds * 1.4 + index) * 0.5,
          beam.z / 100,
        );
        saucer.rotation.y = seconds * 0.9;
        const ray = rays[index];
        if (ray === undefined) return;
        ray.visible = on && drop === 0;
        ray.position.set(beam.x / 100, hover / 2, beam.z / 100);
        ray.material.opacity = 0.22 + Math.sin(seconds * 7 + index) * 0.06;
      });
      flying.forEach((saucer, index) => {
        const angle =
          seconds * 0.07 * (index % 2 === 0 ? 1 : -1) +
          (index / flyers) * Math.PI * 2;
        const radius = 70 + (index % 3) * 35;
        saucer.position.set(
          centre + Math.cos(angle) * radius,
          48 + (index % 4) * 8 + lift,
          centre + Math.sin(angle) * radius,
        );
        saucer.rotation.set(Math.sin(seconds + index) * 0.12, seconds * 1.2, 0);
      });
    },
  };
}
