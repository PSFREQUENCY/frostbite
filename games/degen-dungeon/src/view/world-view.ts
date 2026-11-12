import {
  BoxGeometry,
  Color,
  Fog,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from "three";

import { echoAt, risen } from "../rules/machine.ts";
import { paceOf } from "../rules/move.ts";
import type { DayState, Ride } from "../rules/types.ts";
import {
  buildActor,
  buildTux,
  heroCount,
  stride,
  type Actor,
} from "./actor.ts";
import { createRig, type Intent, type Subject } from "./camera.ts";
import { frameOf, opening } from "./cine.ts";
import { buildCity, metres } from "./city.ts";
import type { Stage } from "./stage.ts";
import { buildStatue } from "./statue.ts";

// The scene and its three ways of being looked at: a day being played, the opening cinematic, and the hero turntable of the first screen.
// It reads the rules' state and changes nothing in it; everything here is how a moment looks, never what happened.
export interface WorldView {
  // A day as it stands. `closeUp` is true for the moment after a spot is used, when the camera cuts to the hands.
  day(state: DayState, seconds: number, dt: number, closeUp: boolean): void;
  // The opening after `seconds`: its line of words, or null once it is over.
  opening(seconds: number): string | null;
  // The first screen: the cast on a ring, the chosen one at the front (a shadow, if they are still locked).
  turntable(hero: number, locked: boolean, seconds: number, dt: number): void;
}

// How big the box under a rider is (the kit's scooter, car, boat and helicopter replace it), and how high a helicopter level is.
const rideSizes: Readonly<
  Record<Exclude<Ride, "foot">, readonly [number, number, number]>
> = {
  boat: [2.2, 0.8, 5],
  car: [1.9, 1, 3.8],
  heli: [2.2, 1.6, 4.5],
  scooter: [0.5, 0.7, 1.6],
};
const levelHeight = 12;
const ring = { radius: 3.2, x: 180, z: 188 };

export function createWorldView(stage: Stage): WorldView {
  const scene = new Scene();
  scene.background = new Color("#0b1026");
  scene.fog = new Fog("#0b1026", 60, 520);
  const city = buildCity();
  const cast: Actor[] = Array.from({ length: heroCount }, (_, hero) =>
    buildActor(hero),
  );
  const tux = buildTux();
  const ride = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: "#e0b341", roughness: 0.5 }),
  );
  ride.name = "ride";
  const shadow = new Mesh(
    new BoxGeometry(0.6, 1.7, 0.4),
    new MeshStandardMaterial({ color: "#000000" }),
  );
  shadow.name = "locked";
  // The first block: a lit cube of ice where the Faucet stands.
  const block = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: "#bfe9ff", emissive: "#5beac6" }),
  );
  block.name = "cornerstone";
  block.position.set(170, 0.5, 180);
  const statue = buildStatue();
  // The hero's newbie self on a trip back: a second, smaller body of the hero who is travelling.
  let echo: { readonly actor: Actor; readonly hero: number } | null = null;
  scene.add(
    city,
    ride,
    shadow,
    block,
    statue.root,
    tux.root,
    ...cast.map(({ root }) => root),
  );
  const rig = createRig();
  const towers = city.getObjectByName("towers");
  let heading = Math.PI / 2;
  let spin = 0;

  const hideAll = (): void => {
    for (const { root } of [...cast, tux]) root.visible = false;
    ride.visible = false;
    shadow.visible = false;
    if (echo !== null) echo.actor.root.visible = false;
  };
  const grown = (part: number): void => {
    if (towers !== undefined)
      towers.scale.y = Math.max(0.02, Math.min(1, part));
  };
  const show = (): void => {
    rig.apply(stage.camera);
    stage.draw(scene);
  };

  return {
    day(state, seconds, dt, closeUp) {
      hideAll();
      grown(1);
      if (state.dir >= 0) heading = (state.dir * Math.PI) / 8;
      const lead = cast[state.hero];
      if (lead === undefined) return;
      const at = {
        x: metres(state.x),
        y: state.level * levelHeight,
        z: metres(state.z),
      };
      const riding = state.ride !== "foot";
      statue.pose(risen(state), seconds, dt);
      // While the newbie is being answered, the close-up is on the newbie, from beside the hero.
      let face: Subject | null = null;
      const past = echoAt(state);
      if (past !== null) {
        if (echo?.hero !== state.hero) {
          if (echo !== null) scene.remove(echo.actor.root);
          echo = { actor: buildActor(state.hero), hero: state.hero };
          echo.actor.root.name = "echo";
          echo.actor.root.scale.multiplyScalar(0.85);
          scene.add(echo.actor.root);
        }
        const newbie = echo.actor;
        newbie.root.visible = true;
        newbie.root.position.set(metres(past.x) + 1.2, 0, metres(past.z));
        newbie.root.rotation.y = Math.atan2(
          at.x - newbie.root.position.x,
          at.z - newbie.root.position.z,
        );
        stride(newbie, 0, seconds);
        const { x, z } = newbie.root.position;
        if (state.talk === past.id)
          face = { heading: Math.atan2(at.z - z, at.x - x), x, y: 0, z };
      }
      const place = (
        actor: Actor,
        back: number,
        side: number,
        pace: number,
      ): void => {
        actor.root.visible = true;
        actor.root.position.set(
          at.x - Math.cos(heading) * back - Math.sin(heading) * side,
          at.y + (riding ? 0.6 : 0),
          at.z - Math.sin(heading) * back + Math.cos(heading) * side,
        );
        actor.root.rotation.y = Math.PI / 2 - heading;
        stride(actor, pace, seconds);
      };
      const pace =
        state.dir >= 0 && !riding && state.talk === null ? paceOf(state) : 0;
      place(lead, 0, 0, pace);
      state.crew.forEach((hero, slot) => {
        const mate = cast[hero];
        if (mate !== undefined) place(mate, 1.6, slot === 0 ? -1.1 : 1.1, pace);
      });
      if (state.ride !== "foot") {
        ride.visible = true;
        ride.scale.set(...rideSizes[state.ride]);
        ride.position.set(at.x, at.y + rideSizes[state.ride][1] / 2, at.z);
        ride.rotation.y = Math.PI / 2 - heading;
      }
      if (state.tux !== null) {
        tux.root.visible = true;
        tux.root.position.set(metres(state.tux.x), 0, metres(state.tux.z));
        tux.root.rotation.y = Math.atan2(
          at.x - metres(state.tux.x),
          at.z - metres(state.tux.z),
        );
        stride(tux, 12, seconds);
      }
      const intent: Intent =
        state.talk !== null
          ? "talk"
          : closeUp
            ? "hands"
            : state.ride === "heli"
              ? "sky"
              : riding
                ? "ride"
                : "follow";
      rig.aim(intent, face ?? { ...at, heading }, dt);
      show();
    },
    opening(seconds) {
      const frame = frameOf(opening, seconds);
      if (frame === null) return null;
      hideAll();
      grown(frame.index === 0 ? 0 : frame.index === 1 ? frame.part : 1);
      rig.cut(frame.pose);
      show();
      return frame.caption;
    },
    turntable(hero, locked, seconds, dt) {
      hideAll();
      grown(1);
      // The ring turns the short way round to bring the chosen hero to the front.
      const turn =
        ((hero - spin + heroCount * 1.5) % heroCount) - heroCount / 2;
      spin += turn * (1 - Math.exp(-8 * Math.max(0, dt)));
      cast.forEach((actor, slot) => {
        const angle = ((slot - spin) * Math.PI * 2) / heroCount;
        const here = [
          ring.x + Math.sin(angle) * ring.radius,
          0,
          ring.z + Math.cos(angle) * ring.radius,
        ] as const;
        const hidden = locked && slot === hero;
        actor.root.visible = !hidden;
        actor.root.position.set(...here);
        actor.root.rotation.y = angle;
        stride(actor, slot === hero ? 2 : 0, seconds);
        if (!hidden) return;
        shadow.visible = true;
        shadow.position.set(here[0], 0.85, here[2]);
      });
      rig.cut({
        fov: 35,
        from: [ring.x, 2.2, ring.z + 9],
        look: [ring.x, 1.1, ring.z + ring.radius],
      });
      show();
    },
  };
}
