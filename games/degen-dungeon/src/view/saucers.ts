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

import {
  beamupOf,
  beams,
  invading,
  saucerOpen,
  visiting,
} from "../rules/invasion.ts";
import type { DayState } from "../rules/types.ts";
import { saucerPad } from "../rules/world.ts";
import { toonSteps } from "./textures.ts";

// The saucers over the island from the mania on: four come down to hang over their street crossings, each with a beam of light to a
// glowing ring on the ground (where to stand); in the mania's alarm eight more circle high above, and lift away when it is over. Up every
// beam, one after another, townspeople float slowly into the saucer, turning as they go (a hero who stands in one rises too, `lift.ts`).
// Each hovering saucer flies home once the hero has been aboard it today. Once the visitors leave the hero a saucer of their own, it
// stands on its lawn in the Old Floe until it is flown.
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

// Someone being beamed up: a body, a head, arms up in surprise, in their own colours.
const coats = [
  "#ff9a3c",
  "#6aa8ff",
  "#3fae6b",
  "#ff5d8f",
  "#ffd166",
  "#b48cff",
];
function buildFloater(index: number): Group {
  const body = new Group();
  body.name = "beamed";
  const coat = new MeshToonMaterial({
    color: coats[index % coats.length] ?? "#ffd166",
    gradientMap: toonSteps,
  });
  const skin = new MeshToonMaterial({
    color: ["#8d5524", "#c68642", "#f1c27d", "#e0ac69"][index % 4] ?? "#c68642",
    gradientMap: toonSteps,
  });
  const torso = new Mesh(new SphereGeometry(0.32, 12, 10), coat);
  torso.scale.set(1, 1.6, 0.8);
  torso.position.y = 1;
  const head = new Mesh(new SphereGeometry(0.22, 12, 10), skin);
  head.position.y = 1.72;
  body.add(torso, head);
  for (const side of [-1, 1]) {
    const arm = new Mesh(new SphereGeometry(0.08, 8, 6), coat);
    arm.scale.set(1, 4.2, 1);
    arm.position.set(side * 0.38, 1.6, 0);
    arm.rotation.z = side * -0.35;
    const leg = new Mesh(new SphereGeometry(0.1, 8, 6), coat);
    leg.scale.set(1, 4, 1);
    leg.position.set(side * 0.14, 0.42, 0);
    leg.rotation.z = side * 0.25;
    body.add(arm, leg);
  }
  return body;
}
// How long one townsperson takes to float up a beam (seconds).
export const floatTime = 6;

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
  const floaters = beams.map((_, index) => buildFloater(index));
  const flying = Array.from({ length: flyers }, () => buildSaucer());
  // The saucer the visitors leave the hero, parked on its lawn until it is flown.
  const parked = buildSaucer();
  parked.scale.setScalar(0.42);
  root.add(...hovering, ...rays, ...floaters, ...flying, parked);
  let came = -1;
  let went = -1;
  // When each hovering saucer was first seen visited, to lift it away.
  const gone = hovering.map(() => -1);
  return {
    root,
    show(state, seconds, away) {
      const today = visiting(state);
      const on = invading(state);
      parked.visible = !away && saucerOpen(state) && state.ride !== "saucer";
      parked.position.set(
        saucerPad.x / 100,
        0.32 + Math.sin(seconds * 1.6) * 0.06,
        saucerPad.z / 100,
      );
      parked.rotation.y = seconds * 0.8;
      if (!today) {
        came = -1;
        went = -1;
        gone.fill(-1);
      } else if (came < 0) came = seconds;
      if (today && !on && went < 0) went = seconds;
      const leaving = went < 0 ? 0 : seconds - went;
      root.visible = !away;
      for (const saucer of [...hovering, ...rays, ...floaters, ...flying])
        saucer.visible = today;
      if (!today || away) return;
      const drop = Math.max(0, 1 - (seconds - Math.max(0, came)) / arrive);
      hovering.forEach((saucer, index) => {
        const beam = beams[index] ?? { x: 0, z: 0 };
        const visited = state.done.includes(beamupOf(index));
        if (!visited) gone[index] = -1;
        else if ((gone[index] ?? -1) < 0) gone[index] = seconds;
        const off = visited ? seconds - (gone[index] ?? seconds) : 0;
        const lift = off * off * 5 + drop * drop * 90;
        saucer.visible = off < 8;
        saucer.position.set(
          beam.x / 100,
          hover + lift + Math.sin(seconds * 1.4 + index) * 0.5,
          beam.z / 100,
        );
        saucer.rotation.y = seconds * 0.9;
        const ray = rays[index];
        if (ray === undefined) return;
        ray.visible = !visited && drop === 0;
        ray.position.set(beam.x / 100, hover / 2, beam.z / 100);
        ray.material.opacity = 0.22 + Math.sin(seconds * 7 + index) * 0.06;
        // A townsperson floats up the beam, slowly at first, turning, and shrinks into the saucer's belly at the top.
        const floater = floaters[index];
        if (floater === undefined) return;
        const part = ((seconds + index * 1.7) % floatTime) / floatTime;
        floater.visible = ray.visible;
        floater.position.set(
          beam.x / 100 + Math.sin(seconds * 2 + index) * 0.4,
          part * part * (hover - 3),
          beam.z / 100 + Math.cos(seconds * 2 + index) * 0.4,
        );
        floater.rotation.set(Math.sin(seconds + index) * 0.4, seconds * 1.6, 0);
        floater.scale.setScalar(Math.min(1, (1 - part) * 5));
      });
      // The fleet circling overhead is the alarm's: it lifts away once the alarm is over, and visitors come without it.
      const fleet = leaving * leaving * 5 + drop * drop * 90;
      for (const saucer of flying)
        saucer.visible = on || (went >= 0 && leaving < 8 && came < went);
      flying.forEach((saucer, index) => {
        const angle =
          seconds * 0.07 * (index % 2 === 0 ? 1 : -1) +
          (index / flyers) * Math.PI * 2;
        const radius = 70 + (index % 3) * 35;
        saucer.position.set(
          centre + Math.cos(angle) * radius,
          48 + (index % 4) * 8 + fleet,
          centre + Math.sin(angle) * radius,
        );
        saucer.rotation.set(Math.sin(seconds + index) * 0.12, seconds * 1.2, 0);
      });
    },
  };
}
