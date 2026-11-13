import { Group, type Scene } from "three";

import { openTo, spots } from "../rules/places.ts";
import type { DayState } from "../rules/types.ts";
import { buildActor, type Actor } from "./actor.ts";
import { buildBody } from "./body.ts";
import type { Subject } from "./camera.ts";
import { metres } from "./city.ts";
import { clerkLooks, placeLooks } from "./looks.ts";

// The people at the island's places, near the hero: every hero who could join stands at their recruit spot (the cast's own bodies, so a
// Frost Run model shows there too), and Frost, Kiki, Scruff, the clerks and the hustlers wait at their talks and offers. Only those within
// sight are shown, each turned to face the hero.
const sight = 70;
const people = spots.filter(
  (spot) =>
    spot.kind === "offer" || spot.kind === "talk" || spot.kind === "recruit",
);

export function createPeople(scene: Scene, cast: readonly Actor[]) {
  const made = new Map<string, Actor>();
  const someone = (id: string, index: number): Actor => {
    const known = made.get(id);
    if (known !== undefined) return known;
    const look = placeLooks[id] ?? clerkLooks[index % clerkLooks.length];
    const body = look === undefined ? buildActor(0) : buildBody(look);
    const actor: Actor =
      "move" in body
        ? body
        : {
            move: (pace, seconds) => body.pose(pace, seconds, false),
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
    },
    show(state: DayState, at: Subject, seconds: number, dt: number): void {
      people.forEach((spot, index) => {
        const x = metres(spot.x) + 1.4;
        const z = metres(spot.z) - 1.4;
        const near =
          Math.hypot(x - at.x, z - at.z) < sight && openTo(spot, state);
        const hero = spot.kind === "recruit" ? spot.hero : null;
        if (hero !== null) {
          const mate = cast[hero];
          const free = hero !== state.hero && !state.crew.includes(hero);
          if (mate === undefined || !near || !free) return;
          mate.root.visible = true;
          mate.root.position.set(x, 0, z);
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
        actor.root.position.set(x, 0, z);
        actor.root.rotation.y = Math.atan2(at.x - x, at.z - z);
        actor.move(0, seconds, dt, state.talk === spot.id);
      });
    },
  };
}
