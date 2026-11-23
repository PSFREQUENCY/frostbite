import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Scene,
} from "three";

import { isFrozen } from "../rules/freeze.ts";
import { openTo, spotNamed, spots } from "../rules/places.ts";
import type { DayState } from "../rules/types.ts";
import { buildActor, type Actor } from "./actor.ts";
import { buildBody } from "./body.ts";
import type { Subject } from "./camera.ts";
import { metres } from "./city.ts";
import { createDashView } from "./dash-view.ts";
import { hillAt } from "./hill.ts";
import { clerkLooks, placeLooks } from "./looks.ts";
import { createRayView } from "./ray-view.ts";
import { standAt } from "./stand.ts";

// The people at the island's places, near the hero: every hero who could join stands at their recruit spot (the cast's own bodies, so a
// Frost Run model shows there too), and Frost, Kiki, Scruff, the clerks and the hustlers wait at their talks and offers. Only those within
// sight are shown, each turned to face the hero, except one the freeze ray caught, who stands stock still in their ice. Zuri, at the
// Degen Dash's arch and desk, is the Dash's own (`dash-view.ts`); the freeze ray and its ice are the ray's (`ray-view.ts`).
const sight = 70;
const people = spots.filter(
  (spot) =>
    (spot.kind === "offer" ||
      spot.kind === "talk" ||
      spot.kind === "recruit") &&
    spot.id !== "dash" &&
    spot.id !== "dash-desk" &&
    spot.id !== "wallet",
);
// The wallet dropped in the riot's crowd (`rules/errands.ts`), lying on the street until it is picked up.
const dropped = spotNamed("wallet");

export function createPeople(
  scene: Scene,
  cast: readonly Actor[],
  forms: readonly Actor[],
) {
  const made = new Map<string, Actor>();
  const dash = createDashView(scene);
  const ray = createRayView(scene, forms);
  const wallet = new Mesh(
    new BoxGeometry(0.22, 0.05, 0.14),
    new MeshStandardMaterial({ color: "#6b3e1f", roughness: 0.6 }),
  );
  wallet.name = "dropped-wallet";
  scene.add(wallet);
  const someone = (id: string, index: number): Actor => {
    const known = made.get(id);
    if (known !== undefined) return known;
    const look = placeLooks[id] ?? clerkLooks[index % clerkLooks.length];
    const body = look === undefined ? buildActor(0) : buildBody(look);
    const actor: Actor =
      "move" in body
        ? body
        : {
            hip: () => body.hip,
            move: (pace, seconds) => body.pose(pace, seconds, false),
            seat: () => undefined,
            root: (() => {
              const root = new Group();
              root.name = id;
              root.add(body.root);
              return root;
            })(),
            wear: () => undefined,
          };
    made.set(id, actor);
    scene.add(actor.root);
    return actor;
  };
  return {
    hide(): void {
      for (const actor of made.values()) actor.root.visible = false;
      dash.hide();
      ray.hide();
      wallet.visible = false;
    },
    show(state: DayState, at: Subject, seconds: number, dt: number): void {
      dash.show(state, at, seconds, dt);
      ray.show(state, at, seconds);
      wallet.visible = dropped !== undefined && openTo(dropped, state);
      if (dropped !== undefined)
        wallet.position.set(metres(dropped.x), 0.03, metres(dropped.z));
      people.forEach((spot, index) => {
        const { x, z } = standAt(spot);
        const near =
          Math.hypot(x - at.x, z - at.z) < sight && openTo(spot, state);
        const still = isFrozen(state, `person-${spot.id}`);
        const hero = spot.kind === "recruit" ? spot.hero : null;
        if (hero !== null) {
          const mate = cast[hero];
          const free = hero !== state.hero && !state.crew.includes(hero);
          if (mate === undefined || !near || !free) return;
          mate.root.visible = true;
          mate.root.position.set(x, hillAt(x, z), z);
          if (still) return;
          mate.root.rotation.y = Math.atan2(at.x - x, at.z - z);
          mate.move(0, seconds, dt, state.talk === spot.id);
          return;
        }
        if (!near) {
          made.get(spot.id)?.root.position.set(0, -50, 0);
          return;
        }
        const actor = someone(spot.id, index);
        actor.root.visible = true;
        actor.root.position.set(x, hillAt(x, z), z);
        if (still) return;
        actor.root.rotation.y = Math.atan2(at.x - x, at.z - z);
        actor.move(0, seconds, dt, state.talk === spot.id);
      });
    },
  };
}
