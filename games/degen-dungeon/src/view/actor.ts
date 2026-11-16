import { Group } from "three";

import { buildBody, type Body, type Seat } from "./body.ts";
import type { Way } from "./poses.ts";
import {
  bitLook,
  copLook,
  formLooks,
  heroLooks,
  tuxLook,
  vestLook,
  type Look,
} from "./looks.ts";
import type { Rigged } from "./models/load.ts";

// Someone on the island: the ten heroes, Bit, the tux, the beat cop and Max's Vests. Every one starts as a body built in code; a hero
// with a Frost Run model puts it on once the models have loaded, and from then on its own clips move it. The root faces along +z.
export interface Actor {
  // Moves the body for a pace (centimetres a tick, 0 standing), the clock and the time since the last frame, and on foot for what it is
  // doing (`poses.ts`) and how far through a jump it is (-1 on the ground).
  move(
    pace: number,
    seconds: number,
    dt: number,
    talking?: boolean,
    cheering?: boolean,
    way?: Way,
    air?: number,
  ): void;
  readonly root: Group;
  // How it rides from now on (null on foot), and how high its hips are above its feet (metres) to sit it on a seat.
  seat(kind: Seat): void;
  hip(): number;
  // Swaps the built body for a model.
  wear(model: Rigged): void;
}

export const heroCount = heroLooks.length;

function actorOf(look: Look, name: string): Actor {
  const root = new Group();
  root.name = name;
  const body: Body = buildBody(look);
  root.add(body.root);
  let model: Rigged | null = null;
  let riding: Seat = null;
  return {
    hip: () => (model === null ? body.hip : model.hip),
    move(
      pace,
      seconds,
      dt,
      talking = false,
      cheering = false,
      way = "upright",
      air = -1,
    ) {
      if (model === null) body.pose(pace, seconds, talking, riding, way, air);
      else model.update(pace, dt, cheering, riding, way, air);
    },
    root,
    seat(kind) {
      riding = kind;
    },
    wear(next) {
      if (model !== null) root.remove(model.root);
      model = next;
      body.root.visible = false;
      root.add(next.root);
    },
  };
}

// A hero by number (10 is Bit, the robot).
export const buildActor = (hero: number): Actor =>
  actorOf(heroLooks[hero] ?? bitLook, `hero-${String(hero)}`);
export const buildTux = (): Actor => actorOf(tuxLook, "tux");
export const buildCop = (): Actor => actorOf(copLook, "cop");
export const buildVest = (): Actor => actorOf(vestLook, "vest");
// A statue come to life, for a hero wearing its mask.
export const buildForm = (statue: number): Actor =>
  actorOf(formLooks[statue] ?? vestLook, `form-${String(statue)}`);
export const heightOf = (hero: number): number =>
  (heroLooks[hero] ?? bitLook).height;
