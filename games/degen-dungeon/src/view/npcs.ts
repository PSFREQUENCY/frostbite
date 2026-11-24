import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type Scene,
} from "three";

import { questAt } from "../quest.ts";
import { isFrozen } from "../rules/freeze.ts";
import { openTo, spots } from "../rules/places.ts";
import type { DayState } from "../rules/types.ts";
import { buildActor, type Actor } from "./actor.ts";
import { buildBody } from "./body.ts";
import type { Subject } from "./camera.ts";
import { createDashView } from "./dash-view.ts";
import { storeyHeight } from "./haus-floors.ts";
import { hillAt } from "./hill.ts";
import { clerkLooks, placeLooks } from "./looks.ts";
import { createRayView } from "./ray-view.ts";
import { standAt } from "./stand.ts";
import { buildWallet } from "./wallet.ts";

// The people at the island's places, near the hero: every hero who could join stands at their recruit spot (the cast's own bodies, so a
// Frost Run model shows there too), and Frost, Kiki, Scruff, the clerks and the hustlers wait at their talks and offers. Only those within
// sight are shown, each turned to face the hero, except one the freeze ray caught, who stands stock still in their ice. Miss Mirinda, at
// the Degen Dash's arch and desk, is the Dash's own (`dash-view.ts`); the freeze ray and its ice are the ray's (`ray-view.ts`).
const sight = 70;
const people = spots.filter(
  (spot) =>
    (spot.kind === "offer" ||
      spot.kind === "talk" ||
      spot.kind === "recruit" ||
      spot.kind === "fence" ||
      spot.kind === "gig") &&
    !spot.id.startsWith("till-") &&
    !spot.id.startsWith("haus-lift-") &&
    spot.id !== "dash" &&
    spot.id !== "dash-desk" &&
    spot.id !== "wallet" &&
    spot.id !== "partner" &&
    spot.id !== "dog" &&
    spot.id !== "vr-stream" &&
    ![
      "cave-mouth",
      "cave-out",
      "bazaar-stairs",
      "bazaar-up",
      "emitter",
      "haus-home",
      "haus-garden",
      "haus-pool",
      "dh-drop-3",
    ].includes(spot.id),
);
// Over the head of everyone with something to say today, a speech bubble; over whoever the story wants next, a gold "!" instead.
const cream = new MeshBasicMaterial({ color: "#f4f8ff" });
const ink = new MeshBasicMaterial({ color: "#2a2f45" });
const gold = new MeshBasicMaterial({ color: "#ffd166" });
const blob = new SphereGeometry(1, 14, 10);
const dotShape = new SphereGeometry(0.035, 6, 4);
const barShape = new BoxGeometry(0.1, 0.32, 0.1);
const knob = new BoxGeometry(0.1, 0.1, 0.1);
function buildBubbles(): Group {
  const bubbles = new Group();
  bubbles.name = "bubbles";
  const speech = new Group();
  speech.name = "speech";
  const cloud = new Mesh(blob, cream);
  cloud.scale.set(0.3, 0.2, 0.06);
  speech.add(cloud);
  for (const x of [-0.11, 0, 0.11]) {
    const dot = new Mesh(dotShape, ink);
    dot.position.set(x, 0, 0.06);
    speech.add(dot);
  }
  const bang = new Group();
  bang.name = "bang";
  const bar = new Mesh(barShape, gold);
  bar.position.y = 0.12;
  const point = new Mesh(knob, gold);
  point.position.y = -0.14;
  bang.add(bar, point);
  bubbles.add(speech, bang);
  bubbles.position.y = 2.3;
  return bubbles;
}
export function createPeople(
  scene: Scene,
  cast: readonly Actor[],
  forms: readonly Actor[],
) {
  const made = new Map<string, Actor>();
  const dash = createDashView(scene);
  const ray = createRayView(scene, forms);
  const wallet = buildWallet();
  scene.add(wallet.root);
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
    actor.root.add(buildBubbles());
    made.set(id, actor);
    scene.add(actor.root);
    return actor;
  };
  return {
    hide(): void {
      for (const actor of made.values()) actor.root.visible = false;
      dash.hide();
      ray.hide();
      wallet.show(null, 0);
    },
    show(state: DayState, at: Subject, seconds: number, dt: number): void {
      dash.show(state, at, seconds, dt);
      ray.show(state, at, seconds);
      wallet.show(state, seconds);
      const goal = questAt(state);
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
        // Up on a floor of Haus De Savage, they stand on it.
        actor.root.position.set(
          x,
          (spot.floor ?? 0) > 0
            ? (spot.floor ?? 0) * storeyHeight
            : hillAt(x, z),
          z,
        );
        const bubbles = actor.root.getObjectByName("bubbles");
        const wanted =
          goal !== null && Math.hypot(goal.x - spot.x, goal.z - spot.z) < 60;
        if (bubbles !== undefined) {
          bubbles.visible = state.talk === null;
          bubbles.position.y = 2.3 + Math.sin(seconds * 3 + index) * 0.05;
          bubbles.rotation.y = wanted ? seconds * 2 : 0;
          const [speech, bang] = bubbles.children;
          if (speech !== undefined) speech.visible = !wanted;
          if (bang !== undefined) bang.visible = wanted;
        }
        if (still) return;
        actor.root.rotation.y = Math.atan2(at.x - x, at.z - z);
        actor.move(0, seconds, dt, state.talk === spot.id);
      });
    },
  };
}
