import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PointLight,
  SphereGeometry,
  TorusGeometry,
} from "three";

import { venues, type Venue } from "../rules/venues.ts";
import { painted } from "./boards.ts";
import { buildLookout, frameFor } from "./frame.ts";
import { box } from "./hash.ts";
import { coreOf, cornerOf } from "./lots.ts";
import { murals } from "./prints.ts";
import { createProps, type Handle } from "./props.ts";
import { toonSteps } from "./textures.ts";
import { furnish, openAir, tint } from "./venue-kits.ts";
import { crowns } from "./venue-lots.ts";

// The landmarks of Nakasato, every one open to walk into (`venues.ts` in the rules says where): round halls with a doorway and an arched
// canopy to the street, a dome or a neon-rimmed roof, the name over the door, and inside a library's curved shelves, a bank's teller and
// vault, a museum's plinths, an NFT gallery's glowing frames, a VR dome's pods, a giant arcade, three clubs with dance floors, a cinema,
// a record label's booth under its tower, and a creator studio; the skate park and the green are open to the sky. Lookout posts stand in
// the parks, NFT vending machines glow outside every door, and the tallest towers wear company names. The floors and screens pulse, and
// one lamp lights the hall the hero is nearest.
export interface Venues {
  readonly root: Group;
  show(seconds: number, night: number, x?: number, z?: number): void;
}

const radius = 18.5;
const lookouts: readonly (readonly [number, number, number, number])[] = [
  [2, 0, 21, 21],
  [2, 2, 30, 12],
];
const domed: readonly string[] = [
  "bank",
  "cinema",
  "dome",
  "gallery",
  "museum",
];
const walls: Readonly<Record<string, string>> = {
  arcade: "#2a2350",
  bank: "#e8dcc3",
  cinema: "#3a1d5c",
  club: "#2a2350",
  dome: "#2a2350",
  gallery: "#f4f8ff",
  library: "#e8dcc3",
  museum: "#f2efe6",
  records: "#1d1b33",
  studio: "#f4f8ff",
};

const toon = (colour: string): MeshToonMaterial =>
  new MeshToonMaterial({
    color: colour,
    gradientMap: toonSteps,
    side: DoubleSide,
  });

// A round hall: its wall with a gap for the doorway, a roof (a dome or a flat one with a glowing rim), an arched canopy out to the
// pavement, the floor, and the name over the door. The record label's tower rises behind its hall.
function hall(venue: Venue, group: Group): void {
  const [cx, cz] = [venue.middle.x / 100, venue.middle.z / 100];
  const height = venue.kind === "club" || venue.kind === "cinema" ? 10 : 8;
  const door = venue.out === 1 ? 0 : Math.PI;
  const gap = 0.28;
  const wall = new Mesh(
    new CylinderGeometry(
      radius,
      radius,
      height,
      64,
      1,
      true,
      door + gap / 2,
      Math.PI * 2 - gap,
    ),
    toon(walls[venue.kind] ?? "#5d6470"),
  );
  wall.position.set(cx, height / 2, cz);
  const dome = domed.includes(venue.kind);
  const roof = dome
    ? new Mesh(
        new SphereGeometry(radius, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        toon(venue.kind === "bank" ? "#e0b341" : "#9fd8ff"),
      )
    : new Mesh(
        new CylinderGeometry(radius + 0.3, radius + 0.3, 0.6, 64),
        toon("#2a2f45"),
      );
  roof.position.set(cx, height, cz);
  roof.scale.y = dome ? 0.45 : 1;
  const rim = new Mesh(
    new TorusGeometry(radius + 0.2, 0.18, 8, 96),
    new MeshBasicMaterial({ color: tint(venue.label.length) }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(cx, height - 0.3, cz);
  const arch = new Mesh(
    new TorusGeometry(2.6, 0.35, 10, 24, Math.PI),
    toon("#f4f8ff"),
  );
  arch.position.set(cx, 0, cz + venue.out * (radius + 0.6));
  const canopy = new Mesh(
    new CylinderGeometry(2.6, 2.6, 3, 24, 1, true, -Math.PI / 2, Math.PI),
    toon("#5beac6"),
  );
  canopy.rotation.x = Math.PI / 2;
  canopy.position.set(cx, 0, cz + venue.out * (radius + 1.8));
  const floor = new Mesh(
    new CylinderGeometry(radius - 0.1, radius - 0.1, 0.08, 64),
    toon("#3a3f4d"),
  );
  floor.position.set(cx, 0.04, cz);
  const sign = new Mesh(
    new BoxGeometry(14, 3.4, 0.3),
    painted(venue.label.toUpperCase(), tint(venue.label.length + 1)),
  );
  sign.position.set(cx, height + 1.2, cz + venue.out * (radius + 0.4));
  sign.rotation.y = venue.out === 1 ? 0 : Math.PI;
  group.add(wall, roof, rim, arch, canopy, floor, sign);
  if (venue.kind !== "records") return;
  const tower = new Mesh(new CylinderGeometry(8, 9, 60, 32), toon("#1d1b33"));
  tower.position.set(cx, height + 30, cz - venue.out * 4);
  const speaker = new Mesh(
    new TorusGeometry(5, 0.6, 10, 40),
    new MeshBasicMaterial({ color: "#ff3df2" }),
  );
  speaker.position.set(cx, height + 52, cz + venue.out * 4.6);
  group.add(tower, speaker);
}

export function buildVenues(): Venues {
  const root = new Group();
  root.name = "venues";
  const props = createProps("venue-props");
  const lights: Handle[] = [];
  const machines: [number, number][] = [];
  for (const venue of venues) {
    const group = new Group();
    group.name = `venue-${venue.kind}`;
    const [cx, cz] = [venue.middle.x / 100, venue.middle.z / 100];
    const out = venue.out;
    // `a` across and `b` toward the doorway; for a doorway to the north, both turn round.
    const place = (a: number, b: number, y: number) =>
      [cx + a * out, y, cz + b * out] as const;
    if (!openAir(venue)) hall(venue, group);
    lights.push(...furnish(venue.kind, place, props).lights);
    if (openAir(venue)) {
      const art = murals();
      const mural = new Mesh(
        new BoxGeometry(24, 3, 0.4),
        art === null
          ? toon("#3a3f47")
          : new MeshToonMaterial({ gradientMap: toonSteps, map: art }),
      );
      mural.name = "mural-wall";
      mural.position.set(cx, 1.5, cz - out * 19.5);
      group.add(mural);
    }
    root.add(group);
    machines.push([cx - 6, cz + out * 21.8], [cx + 6, cz + out * 21.8]);
  }
  root.add(props.build());
  for (const [borough, corner, u, w] of lookouts) {
    const [x0, z0] = cornerOf(borough, corner);
    buildLookout(frameFor(root, x0, z0, 1, []), u, w);
  }
  // NFT vending machines: a dark body and a glowing screen.
  const bodies = new InstancedMesh(
    new CylinderGeometry(0.55, 0.55, 2, 16),
    toon("#2a2350"),
    machines.length,
  );
  bodies.name = "nft-vending";
  const screens = new InstancedMesh(
    new SphereGeometry(0.4, 12, 8),
    new MeshBasicMaterial({ color: "#ffffff" }),
    machines.length,
  );
  screens.name = "nft-screens";
  machines.forEach(([x, z], index) => {
    bodies.setMatrixAt(index, box(x, 1, z, 1, 1, 1));
    screens.setMatrixAt(index, box(x, 1.4, z, 1, 1.4, 1));
    screens.setColorAt(index, new Color(tint(index)));
  });
  root.add(bodies, screens);
  // A company's name on the crown of the tallest tower in most boroughs; a round tower gets a round crown.
  for (const [borough, name] of Object.entries(crowns)) {
    const core = [0, 3]
      .map((corner) => coreOf(Number(borough), corner))
      .find((found) => found !== null);
    if (core === undefined || core === null) continue;
    const [x0, x1, z0, z1] = core.box;
    const crown = new Mesh(
      core.round
        ? new CylinderGeometry(
            (x1 - x0) / 2 + 0.3,
            (x1 - x0) / 2 + 0.3,
            1.2,
            40,
          )
        : new BoxGeometry(x1 - x0 + 0.6, 1.2, z1 - z0 + 0.6),
      new MeshBasicMaterial({ color: "#fff1b8" }),
    );
    crown.position.set((x0 + x1) / 2, core.height + 0.6, (z0 + z1) / 2);
    const sign = new Mesh(
      new BoxGeometry(14, 4, 0.4),
      painted(name, "#ffd166"),
    );
    sign.name = "crown-sign";
    sign.position.set((x0 + x1) / 2, core.height + 3.6, z1 + 0.4);
    root.add(crown, sign);
  }
  const lamp = new PointLight("#ffe2b0", 0, 30, 1.2);
  lamp.name = "venue-lamp";
  root.add(lamp);
  const colour = new Color();
  return {
    root,
    show(seconds, night, x = -999, z = -999) {
      // The floors and screens pulse, brighter at night.
      lights.forEach((handle, index) => {
        colour.set(tint(index + Math.floor(seconds * 2)));
        props.paint(handle, colour.multiplyScalar(0.6 + night * 0.4));
      });
      const near = venues.find(
        ({ middle }) =>
          Math.hypot(middle.x / 100 - x, middle.z / 100 - z) < radius + 6,
      );
      lamp.intensity = near === undefined || openAir(near) ? 0 : 14;
      if (near !== undefined)
        lamp.position.set(near.middle.x / 100, 6, near.middle.z / 100);
    },
  };
}
