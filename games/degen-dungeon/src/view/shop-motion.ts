import {
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  type Object3D,
} from "three";

import { machines, washerId } from "../rules/laundry.ts";
import { rooms, type Room } from "../rules/rooms.ts";

// The shops at work. Each laundromat drum turns slowly with somebody's washing in it, spins hard for a few seconds after the hero runs
// a wash, then stops with its door lit; steam rises off the coffee machines and the noodle bar's pots; the pizza ovens' fire flickers;
// the arcade's screens cycle their colours. Only the shops near the hero move. The places come from each shop's own frame (`shops.ts`).
export interface ShopMotion {
  readonly root: Group;
  // The hero's place (metres), the clock and what has been done today (washes among it).
  show(x: number, z: number, seconds: number, done: readonly string[]): void;
}

const near = 40;
const spin = 9;
const spinFor = 6;
const idle = 1.2;
// Where a point of a shop's frame is in the city (metres): across from the left wall, out from the back wall, up from the floor.
function frame(room: Room) {
  const out = room.north ? -1 : 1;
  const back = (room.north ? room.room.z1 : room.room.z0) / 100;
  return (u: number, w: number, y: number) =>
    [room.room.x0 / 100 + u, y, back + out * w] as const;
}

interface Drum {
  readonly id: string;
  readonly mesh: Object3D;
  turned: number;
  washedAt: number;
}
interface Flicker {
  readonly colours: readonly string[];
  readonly mesh: Mesh;
  readonly rate: number;
}
interface Puff {
  readonly base: readonly [number, number, number];
  readonly mesh: Mesh;
  readonly phase: number;
}

export function buildShopMotion(): ShopMotion {
  const root = new Group();
  root.name = "shop-motion";
  const drums: (Drum & { readonly x: number; readonly z: number })[] = [];
  const flickers: (Flicker & { readonly x: number; readonly z: number })[] = [];
  const puffs: (Puff & { readonly x: number; readonly z: number })[] = [];
  const drumGeometry = new CylinderGeometry(0.22, 0.22, 0.05, 20);
  const sock = new SphereGeometry(0.08, 8, 6);
  const steam = new SphereGeometry(0.12, 8, 6);
  const glass = new MeshBasicMaterial({ color: "#2c4f7a" });
  const wash = new MeshBasicMaterial({ color: "#ff9ecf" });
  for (const room of rooms) {
    const at = frame(room);
    const [x, , z] = at(5.6, 6, 0);
    // A screen faces into the shop (toward the door) or toward the back wall.
    const facing = (front: boolean): number =>
      front === room.north ? Math.PI : 0;
    if (room.kind === "laundry")
      for (let index = 0; index < machines; index += 1) {
        const drum = new Group();
        drum.position.set(...at(1.09, 4 + index * 1.1, 0.55));
        const face = new Mesh(drumGeometry, glass);
        face.rotation.z = Math.PI / 2;
        const clothes = new Mesh(sock, wash);
        clothes.position.set(0.04, 0.12, 0);
        drum.add(face, clothes);
        root.add(drum);
        const id = washerId(room.id, index);
        drum.name = id;
        drums.push({ id, mesh: drum, turned: 0, washedAt: -1, x, z });
      }
    const screen = (
      [u, w, y]: readonly [number, number, number],
      size: readonly [number, number],
      colours: readonly string[],
      rate: number,
      front: boolean,
    ): void => {
      const mesh = new Mesh(
        new PlaneGeometry(size[0], size[1]),
        new MeshBasicMaterial({ color: colours[0] ?? "#ffffff" }),
      );
      mesh.position.set(...at(u, w, y));
      mesh.rotation.y = facing(front);
      root.add(mesh);
      flickers.push({ colours, mesh, rate, x, z });
    };
    const cycle = ["#ff3df2", "#5beac6", "#ffd166", "#6aa8ff"];
    if (room.kind === "arcade")
      for (let k = 0; k < 4; k += 1)
        screen(
          [1.2 + k * 2.6, 5.67, 1.3],
          [0.7, 0.5],
          [...cycle.slice(k), ...cycle.slice(0, k)],
          3,
          false,
        );
    if (room.kind === "pizza")
      screen(
        [2, 1.75, 0.7],
        [0.8, 0.42],
        ["#ff9a3c", "#ffd166", "#ff5d2a"],
        9,
        true,
      );
    const kettle: readonly [number, number, number] | null =
      room.kind === "coffee"
        ? [4.4, 1.5, 1.75]
        : room.kind === "noodles"
          ? [10.4, 6, 1.2]
          : null;
    if (kettle !== null)
      for (let phase = 0; phase < 3; phase += 1) {
        const mesh = new Mesh(
          steam,
          new MeshBasicMaterial({
            color: "#ffffff",
            depthWrite: false,
            opacity: 0.5,
            transparent: true,
          }),
        );
        const base = at(kettle[0], kettle[1], kettle[2]);
        mesh.position.set(...base);
        root.add(mesh);
        puffs.push({ base, mesh, phase: phase / 3, x, z });
      }
  }
  const colour = new Color();
  let last = 0;
  return {
    root,
    show(x, z, seconds, done) {
      const dt = Math.max(0, Math.min(0.1, seconds - last));
      last = seconds;
      const close = (one: { readonly x: number; readonly z: number }) =>
        Math.hypot(one.x - x, one.z - z) < near;
      for (const drum of drums) {
        // A machine washes once a day: a new day finds it turning again.
        if (!done.includes(drum.id)) drum.washedAt = -1;
        else if (drum.washedAt < 0) drum.washedAt = seconds;
        if (!close(drum)) continue;
        const since = drum.washedAt < 0 ? -1 : seconds - drum.washedAt;
        const rate = since < 0 ? idle : since < spinFor ? spin : 0;
        drum.turned += rate * dt;
        drum.mesh.rotation.x = drum.turned;
      }
      for (const { colours, mesh, rate, ...at } of flickers) {
        if (!close(at) || !(mesh.material instanceof MeshBasicMaterial))
          continue;
        const step = Math.floor(seconds * rate) % colours.length;
        mesh.material.color.copy(colour.set(colours[step] ?? "#ffffff"));
      }
      for (const puff of puffs) {
        if (!close(puff)) continue;
        const rise = (seconds * 0.5 + puff.phase) % 1;
        const [bx, by, bz] = puff.base;
        puff.mesh.position.set(
          bx + Math.sin(seconds + puff.phase * 6) * 0.05,
          by + rise * 0.9,
          bz,
        );
        puff.mesh.scale.setScalar(0.6 + rise * 1.4);
        if (puff.mesh.material instanceof MeshBasicMaterial)
          puff.mesh.material.opacity = 0.5 * (1 - rise);
      }
    },
  };
}
