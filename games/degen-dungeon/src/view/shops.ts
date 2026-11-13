import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PointLight,
  type Material,
  type Matrix4,
} from "three";

import { rooms, type Room } from "../rules/rooms.ts";
import { painted } from "./boards.ts";
import { box } from "./hash.ts";
import { props, walls } from "./shop-props.ts";
import { toonSteps } from "./textures.ts";

// The mom-and-pop shops you can walk into, one per room in the rules: a front of brick or stucco with the shop's name over the door, an
// awning, two display windows you can see in through, and glass doors that slide apart as you come near. Inside there is a floor, walls,
// a ceiling with a lamp, the counter (the clerk stands behind it, `npcs.ts`), and what that kind of shop has: an espresso machine and a
// menu board, shelves of snacks and a glowing fridge, arcade cabinets, barber chairs and a mirror, washing machines, a pizza oven, weight
// racks, rods and bait tanks, glass cases of pawned things, a wall of tools. Two floors of flats sit on top. One lamp lights the shop the
// hero is nearest.
export interface Shops {
  readonly root: Group;
  // Opens the doors near the hero (metres) and lights the shop they are in or near.
  show(x: number, z: number, dt: number): void;
}

// Where a point of a shop's own frame is in the city (metres), and which way is out of its door.
const frameOf = (room: Room) => {
  const out = room.north ? -1 : 1;
  const back = (room.north ? room.room.z1 : room.room.z0) / 100;
  return {
    out,
    toX: (u: number) => room.room.x0 / 100 + u,
    toZ: (w: number) => back + out * w,
  };
};
const depth = 11.2;
const front = 12.6;

export function buildShops(): Shops {
  const root = new Group();
  root.name = "shops";
  const solid: (readonly [Matrix4, string])[] = [];
  const glow: (readonly [Matrix4, string])[] = [];
  const glass: Matrix4[] = [];
  const doors: {
    readonly room: Room;
    readonly x: number;
    readonly z: number;
    open: number;
  }[] = [];
  for (const room of rooms) {
    const { toX, toZ } = frameOf(room);
    const [floor, wall, face] = walls[room.kind] ?? [
      "#888888",
      "#aaaaaa",
      "#666666",
    ];
    const put = (
      u: number,
      w: number,
      y: number,
      width: number,
      height: number,
      deep: number,
      colour: string,
      lit = false,
    ): void => {
      (lit ? glow : solid).push([
        box(toX(u), y, toZ(w), width, height, deep),
        colour,
      ]);
    };
    put(depth / 2, front / 2, -0.02, depth + 0.6, 0.06, front + 0.3, floor);
    put(depth / 2, front / 2, 3.65, depth + 0.6, 0.1, front + 0.3, "#2a2f45");
    put(depth / 2, -0.15, 1.8, depth + 0.6, 3.6, 0.3, wall);
    put(-0.15, depth / 2, 1.8, 0.3, 3.6, depth, wall);
    put(depth + 0.15, depth / 2, 1.8, 0.3, 3.6, depth, wall);
    // The front: wall, two display windows (a sill, a header and glass), and the doorway with its two sliding doors.
    const wallAt = (from: number, to: number): void =>
      put(
        (from + to) / 2,
        (depth + front) / 2,
        1.8,
        to - from,
        3.6,
        front - depth,
        face,
      );
    wallAt(-0.3, 1);
    wallAt(4, 4.5);
    wallAt(6.7, 7.2);
    wallAt(10.2, depth + 0.3);
    for (const [from, to] of [
      [1, 4],
      [7.2, 10.2],
    ] as const) {
      put(
        (from + to) / 2,
        (depth + front) / 2,
        0.45,
        to - from,
        0.9,
        front - depth,
        face,
      );
      put(
        (from + to) / 2,
        (depth + front) / 2,
        3.15,
        to - from,
        0.9,
        front - depth,
        face,
      );
      glass.push(
        box(toX((from + to) / 2), 1.8, toZ(front - 0.2), to - from, 1.8, 0.05),
      );
    }
    put(5.6, (depth + front) / 2, 3.1, 2.2, 1, front - depth, face);
    put(
      5.6,
      front + 0.9,
      3.3,
      depth,
      0.12,
      1.8,
      ["#ff5d5d", "#5beac6", "#ffd166"][room.counter.x % 3] ?? "#ff5d5d",
    );
    put(5.6, 1.6, 0.52, 4, 1.05, 0.8, "#5a3a2f");
    put(5.6, 2.02, 1.07, 4.1, 0.06, 0.95, "#c9b38a");
    put(5.6, depth / 2, 3.58, 1.2, 0.04, 1.2, "#fff1b8", true);
    for (const prop of props[room.kind] ?? []) {
      const [u, w, y, width, height, thick, colour, lit = false] = prop;
      put(u, w, y, width, height, thick, colour, lit);
    }
    // The flats above, and the name over the door.
    put(depth / 2, front / 2, 3.7 + 3.4, depth + 0.6, 6.8, front, wall);
    const sign = new Mesh(
      new BoxGeometry(5.2, 0.9, 0.2),
      painted(room.label.toUpperCase(), "#ffd166"),
    );
    sign.name = `sign-${room.id}`;
    sign.position.set(toX(5.6), 4.4, toZ(front + 0.12));
    sign.rotation.y = room.north ? Math.PI : 0;
    root.add(sign);
    doors.push({ open: 0, room, x: toX(5.6), z: toZ(front - 0.1) });
  }
  const mesh = (
    name: string,
    material: Material,
    pieces: readonly (readonly [Matrix4, string])[],
  ): InstancedMesh => {
    const made = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      material,
      Math.max(1, pieces.length),
    );
    made.name = name;
    pieces.forEach(([matrix, colour], index) => {
      made.setMatrixAt(index, matrix);
      made.setColorAt(index, new Color(colour));
    });
    return made;
  };
  const panes = new MeshBasicMaterial({
    color: "#9fd8ff",
    depthWrite: false,
    opacity: 0.28,
    transparent: true,
  });
  const sliding = new InstancedMesh(
    new BoxGeometry(1.1, 2.5, 0.05),
    panes,
    doors.length * 2,
  );
  sliding.name = "sliding-doors";
  root.add(
    mesh(
      "shop-parts",
      new MeshToonMaterial({ color: "#ffffff", gradientMap: toonSteps }),
      solid,
    ),
    mesh("shop-glow", new MeshBasicMaterial({ color: "#ffffff" }), glow),
    mesh(
      "shop-glass",
      panes,
      glass.map((matrix) => [matrix, "#ffffff"] as const),
    ),
    sliding,
  );
  const lamp = new PointLight("#ffe2b0", 0, 16, 1.4);
  lamp.name = "shop-lamp";
  root.add(lamp);
  return {
    root,
    show(x, z, dt) {
      let nearest = -1;
      let gap = 22;
      doors.forEach((door, index) => {
        const away = Math.hypot(door.x - x, door.z - z);
        if (away < gap) {
          nearest = index;
          gap = away;
        }
        const want = away < 4.5 ? 1 : 0;
        door.open += (want - door.open) * Math.min(1, dt * 6);
        const slide = 0.55 + door.open * 1.05;
        sliding.setMatrixAt(
          index * 2,
          box(door.x - slide, 1.25, door.z, 1, 1, 1),
        );
        sliding.setMatrixAt(
          index * 2 + 1,
          box(door.x + slide, 1.25, door.z, 1, 1, 1),
        );
      });
      sliding.instanceMatrix.needsUpdate = true;
      const lit = doors[nearest];
      lamp.intensity = lit === undefined ? 0 : 9;
      if (lit === undefined) return;
      const { toX, toZ } = frameOf(lit.room);
      lamp.position.set(toX(5.6), 3.2, toZ(depth / 2));
    },
  };
}
