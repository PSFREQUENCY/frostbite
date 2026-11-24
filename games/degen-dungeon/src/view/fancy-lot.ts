import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  TorusGeometry,
} from "three";

import { drops, hoverStand, valetBay } from "../rules/deal.ts";
import { bridge, haus } from "../rules/haus.ts";
import type { DayState } from "../rules/types.ts";
import { buildKit, kits } from "./kits.ts";
import { addNeon } from "./neon.ts";
import { canvasOf, toonSteps } from "./textures.ts";

// Round Haus De Savage's plaza (`rules/deal.ts`): the Fancy Lot's glass showroom with its sign and a turntable where the hover car turns
// in its own light until the deal is made (then it waits on the turntable as the hero's, `things.ts`); the valet's lift, a platform in a
// ring of light; over the bridge an arch with HAUS DE SAVAGE in neon; and out at sea off the west shore, Ms. Opal's yacht at anchor.
export interface FancyLot {
  readonly root: Group;
  show(day: DayState | null, seconds: number): void;
}

const toon = (color: string): MeshToonMaterial =>
  new MeshToonMaterial({ color, gradientMap: toonSteps });
const lit = (color: string): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, toneMapped: false });
// A word in neon on a dark board, or the board alone where there is no canvas.
function sign(words: string, color: string, wide: number): Mesh {
  const art = canvasOf(512, 96, (pen) => {
    pen.fillStyle = "#0b0a1a";
    pen.fillRect(0, 0, 512, 96);
    pen.font = "bold 56px sans-serif";
    pen.textAlign = "center";
    pen.textBaseline = "middle";
    pen.shadowColor = color;
    pen.shadowBlur = 18;
    pen.fillStyle = color;
    pen.fillText(words, 256, 50);
  });
  return new Mesh(
    new PlaneGeometry(wide, wide * 0.19),
    art === null
      ? lit(color)
      : new MeshBasicMaterial({
          map: art,
          side: DoubleSide,
          toneMapped: false,
        }),
  );
}
const at = (point: {
  readonly x: number;
  readonly z: number;
}): readonly [number, number] => [point.x / 100, point.z / 100];

export function buildFancyLot(): FancyLot {
  const root = new Group();
  root.name = "fancy-lot";
  // The showroom: a half drum of glass round the turntable, a roof, the sign.
  const [sx, sz] = at(hoverStand);
  const showroom = new Group();
  showroom.position.set(sx, 0, sz);
  const pane = new Mesh(
    new CylinderGeometry(
      4.6,
      4.6,
      3.4,
      32,
      1,
      true,
      Math.PI * 0.75,
      Math.PI * 1.5,
    ),
    new MeshBasicMaterial({
      color: "#bff3ff",
      depthWrite: false,
      opacity: 0.22,
      side: DoubleSide,
      transparent: true,
    }),
  );
  pane.position.y = 1.7;
  const roof = new Mesh(new CylinderGeometry(5, 5, 0.25, 32), toon("#11131c"));
  roof.position.y = 3.5;
  const eave = new Mesh(new TorusGeometry(5, 0.07, 6, 48), lit("#ff3df2"));
  eave.rotation.x = Math.PI / 2;
  eave.position.y = 3.4;
  const turntable = new Group();
  turntable.name = "fancy-turntable";
  const plate = new Mesh(
    new CylinderGeometry(3.2, 3.3, 0.18, 40),
    toon("#1d1b33"),
  );
  plate.position.y = 0.09;
  const edge = new Mesh(new TorusGeometry(3.25, 0.06, 6, 48), lit("#38e8ff"));
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.19;
  const paint = toon("#e6e9f2");
  const car = buildKit(kits.hover, paint);
  car.name = "fancy-display";
  car.position.y = 0.55;
  const neon = addNeon(car, {
    colour: "#ff3df2",
    edge: 0.05,
    edged: (mesh) => mesh.material === paint,
    halo: 6,
    pool: [4, 6.4],
    ring: 3,
    sparkles: 10,
    at: [0, 0.8, 0],
  });
  turntable.add(plate, edge, car);
  const board = sign("THE FANCY LOT", "#ff3df2", 6);
  board.position.set(0, 4.3, 0);
  board.rotation.y = Math.PI / 2;
  showroom.add(pane, roof, eave, turntable, board);
  // The valet's lift: a platform in a ring of light, with posts to the trunk.
  const [vx, vz] = at(valetBay);
  const valet = new Group();
  valet.position.set(vx, 0, vz);
  const deck = new Mesh(new CylinderGeometry(3, 3, 0.2, 32), toon("#2a2f45"));
  deck.position.y = 0.1;
  const glow = new Mesh(new TorusGeometry(2.6, 0.07, 6, 40), lit("#ffd166"));
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.22;
  valet.add(deck, glow);
  // The doorman's canopy by the lobby's doorway, where the first job ends.
  const [dx, dz] = at(drops[0] ?? haus);
  const awning = new Mesh(new BoxGeometry(2.4, 0.15, 2.4), toon("#2a2350"));
  awning.position.set(dx, 2.6, dz);
  // The bridge, and the arch over its island end.
  const bridgeDeck = new Mesh(
    new BoxGeometry(
      (bridge.x1 - bridge.x0) / 100,
      0.6,
      (bridge.z1 - bridge.z0) / 100,
    ),
    toon("#cfc6b8"),
  );
  bridgeDeck.position.set(
    (bridge.x0 + bridge.x1) / 200,
    -0.28,
    (bridge.z0 + bridge.z1) / 200,
  );
  const arch = new Group();
  arch.position.set(haus.x / 100, 0, bridge.z0 / 100 + 3);
  for (const side of [-4.4, 4.4]) {
    const pillar = new Mesh(
      new CylinderGeometry(0.35, 0.45, 6, 10),
      toon("#4a2f22"),
    );
    pillar.position.set(side, 3, 0);
    arch.add(pillar);
  }
  const name = sign("HAUS DE SAVAGE", "#ffd166", 8);
  name.position.y = 6.2;
  // Facing the shore, where everyone comes from.
  name.rotation.y = Math.PI;
  arch.add(name);
  // Ms. Opal's yacht, at anchor where the third job ends.
  const [yx, yz] = at(drops[2] ?? haus);
  const yacht = new Group();
  yacht.name = "opal-yacht";
  yacht.position.set(yx - 2, -0.6, yz);
  const hull = new Mesh(new CylinderGeometry(1.6, 1.1, 9, 12), toon("#f4f8ff"));
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1, 1, 0.5);
  hull.position.y = 0.5;
  const cabin = new Mesh(new BoxGeometry(2, 1.2, 3.6), toon("#2a2350"));
  cabin.position.set(0, 1.6, -0.6);
  const trim = new Mesh(new TorusGeometry(1.6, 0.05, 6, 32), lit("#38e8ff"));
  trim.rotation.x = Math.PI / 2;
  trim.scale.set(1, 2.9, 1);
  trim.position.y = 1;
  const bridgeDeck2 = new Mesh(new BoxGeometry(1.6, 0.8, 2), toon("#f4f8ff"));
  bridgeDeck2.position.set(0, 2.6, -0.4);
  const lights = new Mesh(new TorusGeometry(1.1, 0.05, 6, 24), lit("#ff3df2"));
  lights.rotation.x = Math.PI / 2;
  lights.scale.set(1, 1.6, 1);
  lights.position.y = 2.2;
  yacht.add(hull, cabin, trim, bridgeDeck2, lights);
  yacht.scale.setScalar(1.6);
  root.add(showroom, valet, awning, bridgeDeck, arch, yacht);
  return {
    root,
    show(day, seconds) {
      turntable.rotation.y = seconds * 0.4;
      // The car on display until the deal is made; then it is the hero's, waiting on the turntable (`things.ts`).
      car.visible = day === null || !day.hover;
      if (car.visible) neon.show(seconds);
      yacht.position.y = -0.6 + Math.sin(seconds * 1.1) * 0.12;
      yacht.rotation.z = Math.sin(seconds * 0.9) * 0.03;
    },
  };
}
