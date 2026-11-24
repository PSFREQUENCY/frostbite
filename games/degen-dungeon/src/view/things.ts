import {
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  OctahedronGeometry,
} from "three";

import { openTo, spots, type Spot } from "../rules/places.ts";
import type { DayState, Point } from "../rules/types.ts";
import { clueShape } from "./clues.ts";
import { hash } from "./hash.ts";
import { hillAt } from "./hill.ts";
import { buildKit, kits } from "./kits.ts";
import { addNeon, type Neon, type NeonLook } from "./neon.ts";
import { build, pieces } from "./pieces.ts";
import { toonSteps } from "./textures.ts";

export { pieces } from "./pieces.ts";

// The things at the island's places (`pieces.ts` has their shapes), where there used to be only a glowing disc on the ground; the magnet
// and the vacuum floating over their pallets, turning; and at the ride stands the rides themselves. Whatever can be picked up or borrowed
// glows neon (`neon.ts`): a halo, sparkles, a lit edge round the magnet, the vacuum, the loot and the rides, and a pool of light under a
// ride. A small star turns over each one that can be used today, gold over where to go next. The people at the places are `npcs.ts`'s,
// the story's beats `beat-scenes.ts`'s.
export interface Things {
  readonly root: Group;
  show(state: DayState | null, goal: Point | null, seconds: number): void;
}

// What stands at each ride stand: the ride itself (the saucer and the Dash car are drawn by their own views), each lit its own colour.
const stands: Readonly<Record<string, keyof typeof kits>> = {
  "ride-boat": "boat",
  "ride-car": "car",
  "ride-heli": "heli",
  "ride-scooter": "scooter",
};
const standLight: Readonly<Record<string, NeonLook>> = {
  "ride-boat": { colour: "#38e8ff", halo: 6, pool: [4, 8], at: [0, 1, 0] },
  "ride-car": {
    colour: "#ff3df2",
    edge: 0.05,
    halo: 5,
    pool: [4, 6.4],
    sparkles: 10,
    ring: 2.6,
    at: [0, 1, 0],
  },
  "ride-heli": { colour: "#ffd166", halo: 5, pool: [3.4, 5], at: [0, 1.4, 0] },
  "ride-scooter": {
    colour: "#5beac6",
    edge: 0.04,
    halo: 3,
    pool: [1.8, 2.8],
    sparkles: 6,
    ring: 1.1,
    at: [0, 0.6, 0],
  },
};
// The magnet and the vacuum, each over its pallet in a light of its own.
const tools: Readonly<Record<string, readonly ["magnet" | "vacuum", string]>> =
  {
    "tool-magnet": ["magnet", "#ff3d6e"],
    "tool-vacuum": ["vacuum", "#b06bff"],
  };
const toolHeight = 1.1;
// The neon of each kind of thing to pick up.
const glows: Readonly<Partial<Record<Spot["kind"], NeonLook>>> = {
  gig: {
    colour: "#ff8a5b",
    halo: 2,
    sparkles: 5,
    ring: 0.9,
    at: [0.6, 0.5, 0],
  },
  heroword: { colour: "#5beac6", halo: 2.4, at: [0, 0.15, 0] },
  letter: {
    colour: "#fff1a8",
    halo: 1.3,
    sparkles: 5,
    ring: 0.45,
    at: [0, 0.2, 0],
  },
  loot: {
    beam: 2.6,
    colour: "#ffd166",
    edge: 0.025,
    halo: 2,
    sparkles: 8,
    ring: 0.8,
    at: [0, 0.4, 0],
  },
  word: { colour: "#f7f3d7", halo: 1, at: [0, 0.1, 0] },
};

function lookOf(spot: Spot): { look: Group; neon: Neon | null } | null {
  const kind = stands[spot.id];
  if (kind !== undefined) {
    const paint = new MeshToonMaterial({
      color: "#5aa9ff",
      gradientMap: toonSteps,
    });
    const look = buildKit(kits[kind], paint);
    const light = standLight[spot.id];
    const edged = (mesh: Mesh): boolean => mesh.material === paint;
    return {
      look,
      neon: light === undefined ? null : addNeon(look, { ...light, edged }),
    };
  }
  const tool = tools[spot.id];
  if (tool !== undefined) {
    const look = build(pieces.tool ?? []);
    const [shape, colour] = tool;
    const floating = clueShape(shape);
    floating.name = "floating";
    floating.position.y = toolHeight;
    floating.scale.setScalar(1.3);
    look.add(floating);
    const neon = addNeon(floating, {
      beam: 2.4,
      colour,
      edge: 0.03,
      halo: 1.9,
      ring: 0.6,
      sparkles: 8,
    });
    return { look, neon };
  }
  const list = pieces[spot.kind];
  if (list === undefined) return null;
  const look = build(list);
  const glow = glows[spot.kind];
  return {
    look,
    neon:
      glow === undefined
        ? null
        : addNeon(look, { ...glow, phase: hash(spot.x, spot.z, 9) * 6 }),
  };
}

export function buildThings(): Things {
  const root = new Group();
  root.name = "things";
  const star = new OctahedronGeometry(0.16, 0);
  const white = new MeshBasicMaterial({ color: "#f4f8ff" });
  const gold = new MeshBasicMaterial({ color: "#ffd166" });
  const placed = spots.flatMap((spot) => {
    const made = lookOf(spot);
    if (made === null) return [];
    const { look, neon } = made;
    const kind = stands[spot.id];
    const [x, z] = [spot.x / 100, spot.z / 100];
    look.position.set(x, hillAt(x, z), z);
    look.rotation.y = hash(spot.x, spot.z, 5) * Math.PI * 2;
    look.name = `thing-${spot.id}`;
    const marker = new Mesh(star, white);
    const over = kind !== undefined ? 3.2 : spot.kind === "tool" ? 2.3 : 1.4;
    marker.position.set(x, hillAt(x, z) + over, z);
    root.add(look, marker);
    const floating = look.getObjectByName("floating") ?? null;
    return [{ floating, kind, look, marker, neon, spot }];
  });
  return {
    root,
    show(state, goal, seconds) {
      root.visible = state !== null;
      if (state === null) return;
      for (const { floating, kind, look, marker, neon, spot } of placed) {
        // Only what is near enough to see, open today; a ride on display is hidden while the hero rides that kind.
        const far =
          Math.abs(spot.x - state.x) > 12_000 ||
          Math.abs(spot.z - state.z) > 12_000;
        look.visible =
          !far &&
          openTo(spot, state) &&
          (kind === undefined || state.ride !== kind);
        marker.visible = look.visible;
        if (!marker.visible) continue;
        const next =
          goal !== null && Math.hypot(goal.x - spot.x, goal.z - spot.z) < 50;
        marker.material = next ? gold : white;
        marker.rotation.y = seconds * 2;
        marker.scale.setScalar(next ? 1.6 : 1);
        neon?.show(seconds);
        if (floating !== null) {
          floating.position.y = toolHeight + Math.sin(seconds * 2) * 0.12;
          floating.rotation.y = seconds * 1.2;
        }
        if (spot.kind === "letter")
          look.position.y =
            hillAt(spot.x / 100, spot.z / 100) +
            0.05 +
            Math.sin(seconds * 2 + spot.x) * 0.04;
      }
    },
  };
}
