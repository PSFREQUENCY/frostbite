import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
} from "three";

import { venues } from "../rules/venues.ts";
import { painted } from "./boards.ts";
import { tint } from "./venue-kits.ts";

// ADOR as a real mall, on two floors: a ring of shops round the ground floor's wall, each with its lit window and its name over it; a
// gallery floor all the way round above them, with a glass rail looking down into the atrium and another ring of shops; two escalators
// climbing to it from the atrium's front corners; banners hanging in the atrium and a ring of lights under the roof. The shoppers are
// `insiders.ts`'s; the perfume counter, the racks, the phones and the Omi Omy bar stay on the ground floor (`ador.ts`). The gallery floor
// is drawn from above only, so the camera below always sees up through it. All the names are made up.
export interface Mall {
  readonly root: Group;
}

export const shopNames = [
  [
    "GLOW & CO",
    "THREADS",
    "PIXEL PHONES",
    "SNEAKER VAULT",
    "SWEET TOOTH",
    "BOOK NOOK",
    "SPARKLE",
    "COZY HOME",
    "SPORT LAB",
  ],
  [
    "TOY BOX",
    "BEAUTY BAR",
    "MUSIC BOX",
    "TECH HUB",
    "GAME ZONE",
    "FRESH KICKS",
    "LUXE",
    "KIDS CORNER",
    "FOOD HALL",
  ],
] as const;
// The gallery floor's height, and where the escalators climb: from the atrium's front corners out to the gallery's edge.
export const gallery = 5;
export const escalators = [-1, 1].map((side) => ({
  bottom: [side * 3.54, 3.54] as const,
  top: [side * 8.63, 8.63] as const,
}));

export function buildMall(): Mall {
  const root = new Group();
  root.name = "mall";
  const ador = venues.find(({ kind }) => kind === "store");
  if (ador === undefined) return { root };
  // Built in the hall's own frame (`a` across is x, `b` toward the doorway is z), then turned to face the hall's doorway.
  root.position.set(ador.middle.x / 100, 0, ador.middle.z / 100);
  root.rotation.y = ador.out === 1 ? 0 : Math.PI;
  const solid = (color: string, glow = false): MeshStandardMaterial =>
    new MeshStandardMaterial({
      color,
      emissive: glow ? color : "#000000",
      emissiveIntensity: glow ? 0.55 : 0,
      roughness: 0.6,
    });
  const glass = new MeshBasicMaterial({
    color: "#cfefff",
    depthWrite: false,
    opacity: 0.22,
    side: DoubleSide,
    transparent: true,
  });
  const put = (mesh: Mesh, a: number, y: number, b: number, turn = 0): Mesh => {
    mesh.position.set(a, y, b);
    mesh.rotation.y = turn;
    root.add(mesh);
    return mesh;
  };
  // The shops: a wall panel facing the atrium, a lit window, the name above; on both floors.
  shopNames.forEach((names, floor) =>
    names.forEach((name, index) => {
      const angle = 0.75 + ((Math.PI * 2 - 1.5) * (index + 0.5)) / names.length;
      const at = (radius: number) =>
        [Math.sin(angle) * radius, Math.cos(angle) * radius] as const;
      const base = floor * gallery;
      const [pa, pb] = at(17.9);
      const face = angle + Math.PI;
      put(
        new Mesh(
          new BoxGeometry(5.6, 4.4, 0.3),
          solid(floor === 0 ? "#f4f1ea" : "#e8e2f0"),
        ),
        pa,
        base + 2.2,
        pb,
        face,
      );
      const [wa, wb] = at(17.7);
      put(
        new Mesh(
          new BoxGeometry(4.2, 2.4, 0.08),
          solid(tint(index + floor * 3), true),
        ),
        wa,
        base + 1.5,
        wb,
        face,
      );
      const [sa, sb] = at(17.65);
      put(
        new Mesh(
          new BoxGeometry(3.6, 0.8, 0.08),
          painted(name, tint(index + floor * 3 + 1)),
        ),
        sa,
        base + 3.35,
        sb,
        face,
      );
    }),
  );
  // The gallery floor: a ring seen from above, its edge, and the glass rail with gaps where the escalators arrive.
  const deck = new Mesh(
    new RingGeometry(12, 18.4, 72),
    new MeshStandardMaterial({ color: "#e8e2f0", side: FrontSide }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = gallery;
  deck.name = "mall-gallery";
  root.add(deck);
  put(
    new Mesh(new CylinderGeometry(12, 12, 0.5, 72, 1, true), solid("#f4f8ff")),
    0,
    gallery - 0.25,
    0,
  );
  for (const [from, length] of [
    [Math.PI / 4 + 0.14, Math.PI * 1.5 - 0.28],
    [-Math.PI / 4 + 0.14, Math.PI / 2 - 0.28],
  ] as const)
    put(
      new Mesh(
        new CylinderGeometry(12.05, 12.05, 1, 48, 1, true, from, length),
        glass,
      ),
      0,
      gallery + 0.5,
      0,
    );
  // The escalators: a sloping band of steps between glass sides with black handrails.
  for (const { bottom, top } of escalators) {
    const [da, db] = [top[0] - bottom[0], top[1] - bottom[1]];
    const run = Math.hypot(da, db);
    const length = Math.hypot(run, gallery);
    const slope = Math.atan2(gallery, run);
    const heading = Math.atan2(da, db);
    const flight = new Group();
    flight.position.set(
      (top[0] + bottom[0]) / 2,
      gallery / 2,
      (top[1] + bottom[1]) / 2,
    );
    flight.rotation.set(0, heading, 0);
    const tilted = new Group();
    tilted.rotation.x = -slope;
    tilted.add(
      new Mesh(new BoxGeometry(1.3, 0.35, length), solid("#5d6470")),
      ...[-0.7, 0.7].flatMap((side) => {
        const pane = new Mesh(new BoxGeometry(0.06, 0.9, length), glass);
        pane.position.set(side, 0.6, 0);
        const rail = new Mesh(
          new BoxGeometry(0.1, 0.1, length),
          solid("#11131c"),
        );
        rail.position.set(side, 1.08, 0);
        return [pane, rail];
      }),
    );
    flight.add(tilted);
    flight.name = "mall-escalator";
    root.add(flight);
  }
  // Banners down the atrium, and lights under the roof.
  for (let k = 0; k < 4; k += 1) {
    const angle = Math.PI / 2 + (k * Math.PI) / 2;
    put(
      new Mesh(new BoxGeometry(1.6, 4.2, 0.05), painted("ADOR", tint(k))),
      Math.sin(angle) * 7.5,
      10.5,
      Math.cos(angle) * 7.5,
      angle,
    );
  }
  for (let k = 0; k < 12; k += 1) {
    const angle = (k / 12) * Math.PI * 2;
    put(
      new Mesh(new CylinderGeometry(0.6, 0.6, 0.1, 16), solid("#fff1b8", true)),
      Math.sin(angle) * 10,
      13.6,
      Math.cos(angle) * 10,
    );
  }
  return { root };
}
