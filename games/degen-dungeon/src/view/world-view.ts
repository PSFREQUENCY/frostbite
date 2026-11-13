import { BoxGeometry, Mesh, MeshStandardMaterial, Scene } from "three";

import { storming } from "../rules/day.ts";
import { risen } from "../rules/machine.ts";
import { paceOf } from "../rules/move.ts";
import { onLand } from "../rules/world.ts";
import type { DayState, Point } from "../rules/types.ts";
import {
  buildActor,
  buildCop,
  buildTux,
  buildVest,
  heightOf,
  heroCount,
  type Actor,
} from "./actor.ts";
import { buildAirdrop } from "./airdrop.ts";
import { buildBoards } from "./boards.ts";
import { createRig, type Intent, type Subject } from "./camera.ts";
import { frameOf, opening } from "./cine.ts";
import { buildCity, metres } from "./city.ts";
import { buildCrowd, type Gathering } from "./crowd.ts";
import { buildLight } from "./era.ts";
import { buildLine } from "./line.ts";
import { loadModels, modelOf, rigged, type Model } from "./models/load.ts";
import type { ModelName } from "./models/packed.ts";
import { shaderTime, visionDepth } from "./models/shaders.ts";
import { createNewbie } from "./newbie.ts";
import { createPeople } from "./npcs.ts";
import { buildNorth } from "./north.ts";
import { buildRides } from "./rides.ts";
import { createStage, type Stage } from "./stage.ts";
import { buildStatue } from "./statue.ts";

// The whole island in 3D: the city and its era, the cast, the crowds, the rides, the chasers, the airdrop and the far north, with the camera
// rig choosing a shot for each moment. It reads a day and draws it; nothing here feeds back into the rules.
export interface WorldView {
  day(state: DayState, seconds: number, dt: number, closeUp: boolean): void;
  opening(seconds: number): string | null;
  turntable(hero: number, locked: boolean, seconds: number, dt: number): void;
}

const levelHeight = 12;
const ring = { radius: 3.4, x: 300, z: 64 };
const gatheringOf = (state: DayState): Gathering | null => {
  if (state.gate > 0) return null;
  if (state.day === 1 && !state.done.includes("speech")) return "riot";
  if (state.day === 4) return "robots";
  return state.day === 5 && state.beat >= 1 ? "party" : null;
};

export function createWorldView(
  stage: Stage,
  models?: Promise<ReadonlyMap<ModelName, Model>>,
): WorldView {
  const scene = new Scene();
  const light = buildLight();
  const city = buildCity();
  const boards = buildBoards();
  const line = buildLine();
  const north = buildNorth();
  const crowd = buildCrowd();
  const airdrop = buildAirdrop();
  const rides = buildRides();
  const statue = buildStatue();
  const cast: Actor[] = Array.from({ length: heroCount + 1 }, (_, hero) =>
    buildActor(hero),
  );
  const chasers = { cop: buildCop(), tux: buildTux(), vests: buildVest() };
  const shadow = new Mesh(
    new BoxGeometry(0.6, 1.7, 0.4),
    new MeshStandardMaterial({ color: "#000000" }),
  );
  shadow.name = "locked";
  scene.add(
    light.root,
    city.root,
    boards.root,
    line.root,
    north.root,
    crowd.root,
    airdrop.root,
    rides.root,
    statue.root,
    shadow,
    ...cast.map(({ root }) => root),
    ...Object.values(chasers).map(({ root }) => root),
  );
  const loaded = new Map<ModelName, Model>();
  const past = createNewbie(scene, loaded);
  const town = createPeople(scene, cast);
  void models?.then((all) => {
    for (const [name, model] of all) loaded.set(name, model);
    cast.forEach((actor, hero) => {
      const name = modelOf[hero];
      const model =
        name === undefined || name === null ? undefined : all.get(name);
      if (model !== undefined) actor.wear(rigged(model, heightOf(hero)));
    });
  });
  // Inside a building: on the island and not on its streets or avenues (the rules' own map, in centimetres).
  const rig = createRig(
    (x, z) => x > 0 && z > 0 && x < 360 && z < 360 && !onLand(x * 100, z * 100),
  );
  const towers = city.root.getObjectByName("towers");
  let heading = Math.PI / 2;
  let spin = 0;
  let era = 0;
  const hideAll = (): void => {
    for (const { root } of [...cast, ...Object.values(chasers)])
      root.visible = false;
    rides.show("foot", 0, 0, 0, 0, 0);
    shadow.visible = false;
    crowd.show(null, 0);
    airdrop.fall(false, 0, 0, 0, 0);
    past.hide();
    town.hide();
  };
  const grown = (part: number): void => {
    if (towers !== undefined)
      towers.scale.y = Math.max(0.02, Math.min(1, part));
  };
  const setEra = (day: number): void => {
    if (day === era) return;
    era = day;
    boards.era(day);
  };
  const show = (seconds: number): void => {
    shaderTime.value = seconds;
    line.run(seconds);
    rig.apply(stage.camera);
    stage.draw(scene);
  };
  const chase = (
    actor: Actor,
    at: Point | null,
    to: Subject,
    seconds: number,
    dt: number,
  ): void => {
    if (at === null) return;
    actor.root.visible = true;
    actor.root.position.set(metres(at.x), 0, metres(at.z));
    actor.root.rotation.y = Math.atan2(
      to.x - metres(at.x),
      to.z - metres(at.z),
    );
    actor.move(12, seconds, dt);
  };
  return {
    day(state, seconds, dt, closeUp) {
      hideAll();
      grown(1);
      setEra(state.day);
      if (state.dir >= 0) heading = (state.dir * Math.PI) / 8;
      const at = {
        heading,
        x: metres(state.x),
        y: state.level * levelHeight,
        z: metres(state.z),
      };
      const riding = state.ride !== "foot";
      light.set(
        scene,
        state.day,
        state.gate > 0 && state.z < -7_000,
        seconds,
        at.x,
        at.z,
      );
      city.mark(state, seconds);
      north.show(state.gate > 0, seconds);
      crowd.show(gatheringOf(state), seconds);
      airdrop.fall(
        storming(state),
        seconds,
        at.x,
        at.z,
        [0, 0.4, 0.6, 0.9][state.tools] ?? 0,
      );
      statue.pose(risen(state), seconds, dt);
      visionDepth.value +=
        ((state.looking ? 1 : 0) - visionDepth.value) * Math.min(1, dt * 4);
      const face = past.show(state, at, seconds, dt);
      const pace =
        state.dir >= 0 && !riding && state.talk === null ? paceOf(state) : 0;
      const place = (actor: Actor, back: number, side: number): void => {
        actor.root.visible = true;
        actor.root.position.set(
          at.x - Math.cos(heading) * back - Math.sin(heading) * side,
          at.y + (riding ? 0.7 : 0),
          at.z - Math.sin(heading) * back + Math.cos(heading) * side,
        );
        actor.root.rotation.y = Math.PI / 2 - heading;
        actor.move(
          pace,
          seconds,
          dt,
          state.talk !== null,
          state.ended && state.cause === "beach",
        );
      };
      const lead = cast[state.hero];
      if (lead !== undefined) place(lead, 0, 0);
      state.crew.forEach((hero, slot) => {
        const mate = cast[hero];
        if (mate !== undefined) place(mate, 0.5, slot === 0 ? -1.7 : 1.7);
      });
      town.show(state, at, seconds, dt);
      if (riding)
        rides.show(
          state.ride,
          at.x,
          at.y,
          at.z,
          Math.PI / 2 - heading,
          seconds,
        );
      chase(chasers.cop, state.cop, at, seconds, dt);
      chase(chasers.tux, state.tux, at, seconds, dt);
      chase(chasers.vests, state.vests, at, seconds, dt);
      const intent: Intent =
        state.talk !== null
          ? "talk"
          : closeUp
            ? "hands"
            : state.ride === "heli"
              ? "sky"
              : riding || state.gate > 0
                ? "ride"
                : "follow";
      rig.aim(intent, face ?? at, dt);
      show(seconds);
    },
    opening(seconds) {
      const frame = frameOf(opening, seconds);
      if (frame === null) return null;
      hideAll();
      setEra(1);
      light.set(scene, 1, false, seconds, 180, 180);
      city.mark(null, seconds);
      crowd.show("riot", seconds);
      grown(frame.index === 0 ? 0 : frame.index === 1 ? frame.part : 1);
      rig.cut(frame.pose);
      show(seconds);
      return frame.caption;
    },
    turntable(hero, locked, seconds, dt) {
      hideAll();
      grown(1);
      setEra(1);
      light.set(scene, 1, false, seconds, ring.x, ring.z);
      city.mark(null, seconds);
      // The ring turns the short way round to bring the chosen hero to the front.
      const turn =
        ((hero - spin + heroCount * 1.5) % heroCount) - heroCount / 2;
      spin += turn * (1 - Math.exp(-8 * Math.max(0, dt)));
      cast.slice(0, heroCount).forEach((actor, slot) => {
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
        actor.move(0, seconds, dt, false, slot === hero);
        if (!hidden) return;
        shadow.visible = true;
        shadow.position.set(here[0], 0.85, here[2]);
      });
      rig.cut({
        fov: 38,
        from: [ring.x, 2.4, ring.z + 10],
        look: [ring.x, 1.2, ring.z + ring.radius],
      });
      show(seconds);
    },
  };
}

// The world on a page's canvas, or null where the browser has no WebGL 2 (the canvas is then hidden and the flat map is the game). Frost
// Run's models load in the background and are put on as they arrive.
export function worldOn(canvas: HTMLCanvasElement): WorldView | null {
  const stage = createStage(canvas);
  canvas.hidden = stage === null;
  return stage === null
    ? null
    : createWorldView(
        stage,
        loadModels().catch(() => new Map()),
      );
}
