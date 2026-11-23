import {
  BoxGeometry,
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";

import { roomAt, rooms, type Room } from "../rules/rooms.ts";
import type { DayState } from "../rules/types.ts";
import { buildLooked, type Actor } from "./actor.ts";
import { hash } from "./hash.ts";
import { clerkLooks, thiefLook } from "./looks.ts";
import { frameOf } from "./shops.ts";
import { aisleGoods, aisles } from "./store-props.ts";

// The goods on the corner stores' and the stations' aisles, which a hero can knock off: brush past a shelf walking (or barrel past it
// running) and what you touch tumbles to the floor. A moment later a stock clerk comes out from the back, picks up each thing in turn
// (crouching for it), puts it back where it was, and goes back out of sight. Only the shop the hero is in plays this; walk out and the
// clerk has tidied it by the time anyone looks. Nothing here touches the rules.
export interface Knocks {
  readonly root: Group;
  show(state: DayState | null, seconds: number, dt: number): void;
}

type Lying = "carried" | "down" | "falling" | "shelf";
interface Good {
  readonly home: Vector3;
  readonly room: Room;
  readonly size: Vector3;
  at: Vector3;
  fell: number;
  spin: Euler;
  speed: Vector3;
  state: Lying;
}

const gravity = 9.8;
// How long a knocked thing lies before the clerk comes, and how long the clerk crouches to pick something up (seconds).
export const restFor = 1.5;
export const pickFor = 0.8;
const walk = 2;

export const goods: readonly Good[] = rooms.flatMap((room) => {
  const { toX, toZ } = frameOf(room);
  return (aisles[room.kind] ?? []).flatMap(([u]) =>
    aisleGoods(u).map(([gu, gw, y, w, h, d]) => {
      const home = new Vector3(toX(gu), y, toZ(gw));
      return {
        at: home.clone(),
        fell: 0,
        home,
        room,
        size: new Vector3(w, h, d),
        speed: new Vector3(),
        spin: new Euler(),
        state: "shelf" as Lying,
      };
    }),
  );
});
const colours = rooms.flatMap((room) =>
  (aisles[room.kind] ?? []).flatMap(([u]) =>
    aisleGoods(u).map(([, , , , , , colour]) => colour),
  ),
);

export function buildKnocks(): Knocks {
  const root = new Group();
  root.name = "knocks";
  const mesh = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ flatShading: true, roughness: 0.6 }),
    goods.length,
  );
  mesh.name = "shelf-goods";
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const paint = new Color();
  const draw = (index: number, good: Good): void => {
    mesh.setMatrixAt(
      index,
      matrix.compose(good.at, turn.setFromEuler(good.spin), good.size),
    );
  };
  goods.forEach((good, index) => {
    draw(index, good);
    mesh.setColorAt(index, paint.set(colours[index] ?? "#ffffff"));
  });
  const clerk: Actor = buildLooked(clerkLooks[1] ?? thiefLook, "stock-clerk");
  clerk.root.visible = false;
  root.add(mesh, clerk.root);
  // The clerk's errand: which room, where they are (metres), what they hold, and since when they have been crouching.
  let room: Room | null = null;
  let held: Good | null = null;
  let crouched = -1;
  const shelve = (good: Good): void => {
    good.state = "shelf";
    good.at.copy(good.home);
    good.spin.set(0, 0, 0);
  };
  return {
    root,
    show(state, seconds, dt) {
      const inside = state === null ? null : roomAt(state.x, state.z);
      const here =
        inside !== null && aisles[inside.kind] !== undefined ? inside : null;
      if (here !== room) {
        // Out of the shop the hero has left, everything is back on its shelf.
        goods.forEach((good, index) => {
          if (good.room === room && good.state !== "shelf") {
            shelve(good);
            draw(index, good);
          }
        });
        room = here;
        held = null;
        crouched = -1;
        clerk.root.visible = false;
      }
      if (state === null || here === null) {
        mesh.instanceMatrix.needsUpdate = true;
        return;
      }
      const [hx, hz] = [state.x / 100, state.z / 100];
      const moving = state.dir >= 0 && state.talk === null;
      const reach = state.ride !== "foot" ? 0.8 : state.gait === 1 ? 0.6 : 0.42;
      const { toX, toZ } = frameOf(here);
      const door = new Vector3(toX(10.4), 0, toZ(0.8));
      goods.forEach((good, index) => {
        if (good.room !== here) return;
        if (
          good.state === "shelf" &&
          moving &&
          Math.hypot(good.home.x - hx, good.home.z - hz) < reach
        ) {
          // Knocked: off the shelf away from the hero, turning over as it goes.
          const away = new Vector3(
            good.home.x - hx,
            0,
            good.home.z - hz,
          ).normalize();
          good.state = "falling";
          good.speed.set(away.x * 1.4, 0.6, away.z * 1.4);
          good.spin.set(
            hash(index, 1, 3) * 0.4,
            hash(index, 2, 3) * Math.PI,
            hash(index, 3, 3) * 0.4,
          );
        }
        if (good.state === "falling") {
          good.speed.y -= gravity * dt;
          good.at.addScaledVector(good.speed, dt);
          good.spin.x += dt * 6;
          const floor = good.size.y / 2;
          if (good.at.y <= floor) {
            good.at.y = floor;
            good.state = "down";
            good.fell = seconds;
            good.spin.set(Math.PI / 2, good.spin.y, 0);
          }
        }
        if (good === held)
          good.at.set(clerk.root.position.x, 1, clerk.root.position.z);
        draw(index, good);
      });
      // The clerk: out from the back once something has lain a moment, to each thing in turn, then back to its shelf, then away.
      const waiting = goods.filter(
        (good) =>
          good.room === here &&
          good.state === "down" &&
          seconds - good.fell > restFor,
      );
      const target =
        held !== null
          ? held.home
          : (waiting[0]?.at ?? (clerk.root.visible ? door : null));
      if (target === null) {
        mesh.instanceMatrix.needsUpdate = true;
        return;
      }
      if (!clerk.root.visible) {
        clerk.root.visible = true;
        clerk.root.position.copy(door);
      }
      const gap = new Vector3(
        target.x - clerk.root.position.x,
        0,
        target.z - clerk.root.position.z,
      );
      const far = gap.length();
      if (far > 0.45) {
        crouched = -1;
        clerk.root.rotation.y = Math.atan2(gap.x, gap.z);
        clerk.root.position.addScaledVector(
          gap.normalize(),
          Math.min(far, walk * dt),
        );
        clerk.move(10, seconds, dt);
      } else if (held === null && waiting[0] !== undefined) {
        // Crouched to pick it up.
        if (crouched < 0) crouched = seconds;
        clerk.move(0, seconds, dt, false, false, "crouch");
        if (seconds - crouched >= pickFor) {
          held = waiting[0];
          held.state = "carried";
          crouched = -1;
        }
      } else if (held !== null) {
        shelve(held);
        held = null;
        clerk.move(0, seconds, dt);
      } else clerk.root.visible = false;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
