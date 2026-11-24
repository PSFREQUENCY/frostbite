import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  type Material,
} from "three";

import { nightTick } from "../rules/constants.ts";
import { dogOut, foodSites } from "../rules/food.ts";
import { rooms } from "../rules/rooms.ts";
import type { DayState } from "../rules/types.ts";
import { buildLooked, type Actor } from "./actor.ts";
import { painted } from "./boards.ts";
import { metres } from "./city.ts";
import { gangLook } from "./looks.ts";
import { frameOf, front } from "./shops.ts";
import { toonSteps } from "./textures.ts";

// The food places (`rules/food.ts`): Silky's spinning sign on a pole at every gas station's forecourt (it turns all day and glows neon
// after nightfall), three Crypto Shacks (a hut with a drive-through window, a menu board and a spinning neon coin), the Floe Food Court's
// four stalls and tables under string lights, Biscuit the dog (waiting by the noodle stall, then trotting at the hero's heels until she
// is home), the streaming pod's ring light in The Dome VR, and the Diamond Hands gang at the hero's side once they walk up. It reads the
// day and decides nothing.
export interface Food {
  readonly root: Group;
  show(day: DayState | null, seconds: number): void;
}

const toon = (color: string): MeshToonMaterial =>
  new MeshToonMaterial({ color, gradientMap: toonSteps });
const unit = new BoxGeometry(1, 1, 1);

export function buildFood(): Food {
  const root = new Group();
  root.name = "food";
  const box = (
    parent: Group,
    [x, y, z]: readonly [number, number, number],
    [w, h, d]: readonly [number, number, number],
    material: Material,
  ): Mesh => {
    const mesh = new Mesh(unit, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  // Silky's signs: a panel each side of a pole, turning.
  const silky = new MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#ff4fd8",
    emissiveIntensity: 0.15,
  });
  const silkyFace = painted("SILKY", "#ff4fd8");
  const spinners: Group[] = [];
  for (const room of rooms.filter(({ kind }) => kind === "gas")) {
    const { toX, toZ } = frameOf(room);
    const pole = new Group();
    pole.position.set(toX(11.6), 0, toZ(front + 6.8));
    box(pole, [0, 3, 0], [0.3, 6, 0.3], toon("#c9ced8"));
    const head = new Group();
    head.position.y = 6.6;
    box(head, [0, 0, 0], [3, 1.3, 0.25], silky);
    const face = new Mesh(new BoxGeometry(2.8, 1.1, 0.27), silkyFace);
    head.add(face);
    pole.add(head);
    spinners.push(head);
    root.add(pole);
  }
  // The Crypto Shacks: a hut north of the spot with its window onto the street, a menu board and a neon coin on a pole.
  const coinFace = new MeshStandardMaterial({
    color: "#2a2f45",
    emissive: "#ffb000",
    emissiveIntensity: 0.9,
  });
  for (const site of foodSites.filter(({ id }) => id.startsWith("shack-"))) {
    const [x, z] = [metres(site.x), metres(site.z) - 3.2];
    const hut = new Group();
    hut.position.set(x, 0, z);
    box(hut, [0, 1.4, 0], [4.2, 2.8, 3], toon("#f3e3c3"));
    box(hut, [0, 3, 0], [4.8, 0.4, 3.6], toon("#e63946"));
    box(
      hut,
      [0.6, 1.6, 1.52],
      [1.6, 1, 0.06],
      new MeshBasicMaterial({ color: "#ffe2b0" }),
    );
    box(hut, [-1.4, 1.6, 1.52], [1, 1.2, 0.06], painted("MENU", "#5beac6"));
    box(hut, [2.6, 2.5, 0], [0.18, 5, 0.18], toon("#c9ced8"));
    const coin = new Mesh(new CylinderGeometry(0.9, 0.9, 0.15, 24), coinFace);
    coin.rotation.x = Math.PI / 2;
    const spin = new Group();
    spin.position.set(2.6, 5.4, 0);
    spin.add(coin);
    hut.add(spin);
    spinners.push(spin);
    root.add(hut);
  }
  // The Floe Food Court: four stalls in a row behind the spot, with tables and sunshades in front, under string lights.
  const court = foodSites.find(({ id }) => id === "food-court");
  const [cx, cz] = [metres(court?.x ?? 0), metres(court?.z ?? 0)];
  ["#ff6fb5", "#ffd166", "#5beac6", "#6aa8ff"].forEach((colour, index) => {
    const x = cx - 6 + index * 4;
    box(root, [x, 1.3, cz - 4], [3.2, 2.6, 2.2], toon("#f4f1ea"));
    box(root, [x, 2.8, cz - 2.8], [3.4, 0.2, 1.4], toon(colour));
    box(
      root,
      [x, 3.3, cz - 4],
      [2.6, 0.5, 0.1],
      new MeshBasicMaterial({ color: colour }),
    );
  });
  for (let k = 0; k < 6; k += 1) {
    const [x, z] = [cx - 5 + (k % 3) * 5, cz + 1 + Math.floor(k / 3) * 3.5];
    box(root, [x, 0.75, z], [1.2, 0.08, 1.2], toon("#ffffff"));
    box(root, [x, 0.37, z], [0.12, 0.74, 0.12], toon("#3a3346"));
    box(root, [x, 2.3, z], [0.06, 2.2, 0.06], toon("#3a3346"));
    const shade = new Mesh(
      new CylinderGeometry(0.05, 1.3, 0.5, 10),
      toon(k % 2 === 0 ? "#ff5d5d" : "#f3e3c3"),
    );
    shade.position.set(x, 3.4, z);
    root.add(shade);
  }
  for (let k = 0; k < 12; k += 1)
    box(
      root,
      [cx - 8 + k * 1.45, 4.2, cz - 1],
      [0.18, 0.18, 0.18],
      new MeshBasicMaterial({ color: "#ffd166" }),
    );
  // Biscuit: a small tan dog.
  const dog = new Group();
  dog.name = "biscuit";
  box(dog, [0, 0.32, 0], [0.32, 0.26, 0.6], toon("#d9a066"));
  box(dog, [0, 0.52, 0.36], [0.26, 0.24, 0.26], toon("#d9a066"));
  for (const side of [-1, 1])
    box(dog, [side * 0.1, 0.68, 0.34], [0.07, 0.12, 0.05], toon("#8a5a3a"));
  for (const [lx, lz] of [
    [-0.1, -0.2],
    [0.1, -0.2],
    [-0.1, 0.2],
    [0.1, 0.2],
  ])
    box(dog, [lx ?? 0, 0.1, lz ?? 0], [0.07, 0.2, 0.07], toon("#8a5a3a"));
  const tail = box(dog, [0, 0.46, -0.34], [0.05, 0.05, 0.22], toon("#d9a066"));
  root.add(dog);
  const kennel = foodSites.find(({ id }) => id === "dog");
  // The streaming pod: a ring light on a stand.
  const pod = foodSites.find(({ id }) => id === "vr-stream");
  const ring = new Mesh(
    new CylinderGeometry(0.6, 0.6, 0.08, 24, 1, true),
    new MeshBasicMaterial({ color: "#ffffff" }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(metres(pod?.x ?? 0), 1.7, metres(pod?.z ?? 0) - 1);
  root.add(ring);
  // The gang: two of them, a step either side of the hero.
  const gang: Actor[] = [0, 1].map((index) => {
    const member = buildLooked(gangLook, `gang-${String(index)}`);
    root.add(member.root);
    return member;
  });
  let last = 0;
  return {
    root,
    show(day, seconds) {
      const dt = Math.min(0.1, Math.max(0, seconds - last));
      last = seconds;
      root.visible = day !== null;
      if (day === null) return;
      const night = day.tick >= nightTick;
      silky.emissiveIntensity = night ? 1.2 : 0.15;
      for (const spinner of spinners) spinner.rotation.y = seconds * 1.4;
      // Biscuit waits by the noodle stall, then follows the hero home to the shack.
      const found =
        day.done.includes("dog-found") && !day.done.includes("dog-returned");
      dog.visible = dogOut(day) || found;
      if (found) dog.position.set(metres(day.x) - 0.9, 0, metres(day.z) + 0.9);
      else dog.position.set(metres(kennel?.x ?? 0), 0, metres(kennel?.z ?? 0));
      tail.rotation.y = Math.sin(seconds * 14) * 0.6;
      ring.visible =
        day.streamFrom >= 0 ||
        Math.hypot(
          metres(day.x) - ring.position.x,
          metres(day.z) - ring.position.z,
        ) < 40;
      gang.forEach((member, index) => {
        member.root.visible = day.gang !== null;
        if (day.gang === null) return;
        member.root.position.set(
          metres(day.gang.x) + (index === 0 ? -1.3 : 1.3),
          0,
          metres(day.gang.z) - 0.8,
        );
        member.root.lookAt(metres(day.x), 0, metres(day.z));
        member.move(0, seconds + index, dt, day.talk === "gang");
      });
    },
  };
}
