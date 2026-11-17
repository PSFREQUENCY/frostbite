import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  SphereGeometry,
  type Object3D,
} from "three";

import {
  launchpad,
  moon,
  moonPad,
  shotWindow,
  shuttleBooth,
} from "../rules/constants.ts";
import { painted } from "./boards.ts";
import { box, hash } from "./hash.ts";
import { toonSteps } from "./textures.ts";

// The colony on the moon, far east of the island where the shuttle sets down: grey ground pocked with craters, glass domes with green
// inside and lights round their rims, solar panels, a rover, the shuttle on its pad, the colony's own flag, and Earth hanging in a black
// sky. Back home, a booth and a sign at the foot of Moon Tower sell the seats. The hero wears a helmet up here.
export interface Moon {
  // Whether a point (metres) is on the moon, for the sky and the helmet.
  on(x: number, z: number): boolean;
  readonly root: Group;
  // Where the hero is (metres), the clock, and the day's tick (a rocket goes up from the launchpad at every launch).
  show(x: number, z: number, seconds: number, tick?: number): void;
  // Puts the helmet on a body of a height (metres), or takes it off.
  wear(body: { readonly root: Object3D } | null, tall: number): void;
}

const [x0, x1, z0, z1] = [
  moon.x0 / 100,
  moon.x1 / 100,
  moon.z0 / 100,
  moon.z1 / 100,
];
const toon = (colour: string): MeshToonMaterial =>
  new MeshToonMaterial({ color: colour, gradientMap: toonSteps });

export function buildMoon(): Moon {
  const root = new Group();
  root.name = "moon";
  const ground = new Mesh(new CircleGeometry(160, 48), toon("#b9bcc6"));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const craters = new InstancedMesh(
    new SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    toon("#8f939e"),
    60,
  );
  craters.name = "craters";
  for (let index = 0; index < 60; index += 1) {
    const size = 1.5 + hash(index, 1, 4) * 6;
    craters.setMatrixAt(
      index,
      box(
        x0 - 30 + hash(index, 2, 4) * 180,
        -size * 0.25,
        z0 - 30 + hash(index, 3, 4) * 180,
        size * 2,
        size * 0.35,
        size * 2,
      ),
    );
  }
  root.add(ground, craters);
  const glass = new MeshBasicMaterial({
    color: "#bfe9ff",
    depthWrite: false,
    opacity: 0.3,
    transparent: true,
  });
  for (const [dx, dz, r] of [
    [-30, -45, 14],
    [-6, -50, 10],
    [-36, -20, 9],
  ] as const) {
    const dome = new Mesh(
      new SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      glass,
    );
    dome.position.set(moonPad.x / 100 + dx, 0, moonPad.z / 100 + dz);
    const garden = new Mesh(
      new CylinderGeometry(r * 0.8, r * 0.8, 0.6, 20),
      toon("#3fae6b"),
    );
    garden.position.set(dome.position.x, 0.3, dome.position.z);
    const rim = new Mesh(
      new CylinderGeometry(r + 0.2, r + 0.2, 0.5, 24, 1, true),
      new MeshBasicMaterial({ color: "#5beac6" }),
    );
    rim.position.set(dome.position.x, 0.25, dome.position.z);
    root.add(dome, garden, rim);
  }
  const panels = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    toon("#2c4f7a"),
    12,
  );
  panels.name = "solar-panels";
  for (let index = 0; index < 12; index += 1)
    panels.setMatrixAt(
      index,
      box(
        x0 + 8 + (index % 6) * 5,
        1.4,
        z0 + 70 + Math.floor(index / 6) * 7,
        4,
        0.12,
        2.6,
      ),
    );
  // The shuttle on its pad: a body, a nose, fins, and the pad's ring of lights.
  const shuttle = new Group();
  shuttle.name = "shuttle";
  const hull = new Mesh(new CylinderGeometry(1.6, 1.8, 9, 16), toon("#f4f8ff"));
  hull.position.y = 5;
  const nose = new Mesh(new ConeGeometry(1.6, 3, 16), toon("#e63946"));
  nose.position.y = 11;
  shuttle.add(hull, nose);
  for (let fin = 0; fin < 3; fin += 1) {
    const plate = new Mesh(new BoxGeometry(0.2, 3, 2.2), toon("#e63946"));
    plate.position.set(
      Math.cos((fin * Math.PI * 2) / 3) * 1.8,
      1.6,
      Math.sin((fin * Math.PI * 2) / 3) * 1.8,
    );
    plate.rotation.y = -(fin * Math.PI * 2) / 3;
    shuttle.add(plate);
  }
  const pad = new Mesh(new CylinderGeometry(6, 6, 0.3, 32), toon("#5d6470"));
  pad.position.y = 0.15;
  shuttle.add(pad);
  shuttle.position.set(moonPad.x / 100 + 7, 0, moonPad.z / 100);
  const rover = new Group();
  rover.name = "rover";
  const deck = new Mesh(new BoxGeometry(2.2, 0.6, 3.2), toon("#e0b341"));
  deck.position.y = 0.9;
  rover.add(deck);
  for (const [wx, wz] of [
    [-1.2, -1.2],
    [1.2, -1.2],
    [-1.2, 1.2],
    [1.2, 1.2],
  ] as const) {
    const wheel = new Mesh(
      new CylinderGeometry(0.5, 0.5, 0.4, 12),
      toon("#11131c"),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.5, wz);
    rover.add(wheel);
  }
  const flag = new Mesh(
    new BoxGeometry(3, 1.8, 0.05),
    painted("DUN COLONY", "#ffd166"),
  );
  flag.position.set(moonPad.x / 100 - 12, 4, moonPad.z / 100 - 4);
  const pole = new Mesh(
    new CylinderGeometry(0.06, 0.06, 5, 6),
    toon("#c0c6d0"),
  );
  pole.position.set(flag.position.x - 1.5, 2.5, flag.position.z);
  const earth = new Mesh(
    new SphereGeometry(18, 24, 16),
    new MeshBasicMaterial({ color: "#3f8fd8", fog: false }),
  );
  earth.name = "earth";
  root.add(panels, shuttle, rover, flag, pole, earth);
  // The moonshot launchpad beside it: a round kiosk, and a little rocket that goes up at every launch.
  const kiosk = new Mesh(
    new CylinderGeometry(1.4, 1.6, 2.6, 24),
    toon("#2a2350"),
  );
  kiosk.position.set(launchpad.x / 100 + 1.6, 1.3, launchpad.z / 100 - 1.4);
  const rocket = new Group();
  rocket.name = "launch-rocket";
  const body = new Mesh(
    new CylinderGeometry(0.35, 0.45, 2.2, 16),
    toon("#f4f8ff"),
  );
  const tip = new Mesh(new ConeGeometry(0.35, 0.8, 16), toon("#ff3df2"));
  tip.position.y = 1.5;
  const flame = new Mesh(
    new ConeGeometry(0.3, 1.2, 12),
    new MeshBasicMaterial({ color: "#ffb35a" }),
  );
  flame.rotation.x = Math.PI;
  flame.position.y = -1.6;
  rocket.add(body, tip, flame);
  root.add(kiosk, rocket);
  // Back on the island: the booth and its sign under Moon Tower.
  const booth = new Mesh(new BoxGeometry(2.4, 2.6, 1.6), toon("#2a2350"));
  booth.position.set(
    shuttleBooth.x / 100 - 1.6,
    1.3,
    shuttleBooth.z / 100 - 1.4,
  );
  const sign = new Mesh(
    new BoxGeometry(6, 2, 0.2),
    painted("SHUTTLE TO THE COLONY", "#5beac6"),
  );
  sign.position.set(
    shuttleBooth.x / 100 - 1.6,
    4.2,
    shuttleBooth.z / 100 - 1.4,
  );
  root.add(booth, sign);
  const helmet = new Mesh(
    new SphereGeometry(0.3, 20, 14),
    new MeshBasicMaterial({
      color: "#bfe9ff",
      depthWrite: false,
      opacity: 0.35,
      transparent: true,
    }),
  );
  helmet.name = "helmet";
  root.add(helmet);
  return {
    wear(body, tall) {
      helmet.visible = body !== null;
      if (body === null) return;
      helmet.position.copy(body.root.position);
      helmet.position.y += tall * 0.86;
      helmet.scale.setScalar(tall / 1.7);
    },
    on: (x, z) => x >= x0 - 40 && x <= x1 + 40 && z >= z0 - 40 && z <= z1 + 40,
    root,
    show(x, z, seconds, tick = 0) {
      const since = (tick % shotWindow) / 30;
      rocket.position.set(
        launchpad.x / 100 + 1.6,
        3 + (since < 6 ? since * since * 4 : -40),
        launchpad.z / 100 - 1.4,
      );
      rocket.visible = since < 6;
      rover.position.set(
        x0 + 60 + Math.sin(seconds * 0.15) * 30,
        0,
        z0 + 40 + Math.cos(seconds * 0.15) * 20,
      );
      rover.rotation.y = seconds * 0.15 + Math.PI / 2;
      earth.position.set(x + 160, 120, z - 260);
      earth.rotation.y = seconds * 0.02;
    },
  };
}
