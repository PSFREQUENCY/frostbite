import { BoxGeometry, Mesh, MeshStandardMaterial, Scene } from "three";

import { storming } from "../rules/day.ts";
import { risen } from "../rules/machine.ts";
import { onLand } from "../rules/world.ts";
import type { DayState } from "../rules/types.ts";
import { buildActor, heightOf, heroCount, type Actor } from "./actor.ts";
import { buildAirdrop } from "./airdrop.ts";
import { buildBoards } from "./boards.ts";
import type { ClipKind } from "../script/clips.ts";
import { createRig } from "./camera.ts";
import { buildChasers } from "./chasers.ts";
import { clipPose } from "./clips.ts";
import { frameOf, opening } from "./cine.ts";
import { buildCity, metres } from "./city.ts";
import { buildCrowd, gatheringOf } from "./crowd.ts";
import { buildLight } from "./era.ts";
import { hopAt, placeCast } from "./lead.ts";
import { buildLine } from "./line.ts";
import { buildMoon } from "./moon.ts";
import { loadModels, modelOf, rigged, type Model } from "./models/load.ts";
import type { ModelName } from "./models/packed.ts";
import { shaderTime, visionDepth } from "./models/shaders.ts";
import { createNewbie } from "./newbie.ts";
import { createPeople } from "./npcs.ts";
import { buildNorth } from "./north.ts";
import { buildRides } from "./rides.ts";
import { createRing, ring } from "./ring.ts";
import { intentFor, roomFor } from "./shot.ts";
import { createStage, type Stage } from "./stage.ts";
import { buildStatue } from "./statue.ts";
import { buildTown, timeOf } from "./town.ts";

// The whole island in 3D: the city and its era, the cast, the crowds, the rides, the chasers, the airdrop and the far north, with the camera
// rig choosing a shot for each moment. It reads a day and draws it; nothing here feeds back into the rules.
export interface WorldView {
  // A moment of a day; while a clip plays, the camera follows the clip instead.
  day(
    state: DayState,
    seconds: number,
    dt: number,
    closeUp: boolean,
    clip?: { readonly kind: ClipKind; readonly part: number } | null,
  ): void;
  // A hop on the spot (or on the move), for the screen only.
  jump(): void;
  opening(seconds: number): string | null;
  turntable(hero: number, locked: boolean, seconds: number, dt: number): void;
  // Writes the player's message on the hero's lantern.
  write(message: string): void;
  // The way the camera looks (radians from east toward south), which the stick's "up" means.
  yaw(): number;
}

const levelHeight = 12;

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
  const town = buildTown();
  const moon = buildMoon();
  const cast: Actor[] = Array.from({ length: heroCount + 1 }, (_, hero) =>
    buildActor(hero),
  );
  const chasers = buildChasers();
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
    town.root,
    moon.root,
    shadow,
    ...cast.map(({ root }) => root),
    ...chasers.actors.map(({ root }) => root),
  );
  const loaded = new Map<ModelName, Model>();
  const past = createNewbie(scene, loaded);
  const people = createPeople(scene, cast);
  const spinRing = createRing(cast, shadow);
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
  let era = 0;
  let clock = 0;
  let jumped = -9;
  let open = 0.5;
  let sampled = -1;
  const hideAll = (): void => {
    for (const { root } of cast) root.visible = false;
    chasers.hide();
    rides.show("foot", 0, 0, 0, 0, 0);
    shadow.visible = false;
    crowd.show(null, 0);
    airdrop.fall(false, 0, 0, 0, 0);
    past.hide();
    people.hide();
    moon.wear(null, 0);
    city.root.visible = true;
    town.root.visible = true;
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
  return {
    day(state, seconds, dt, closeUp, clip = null) {
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
      const { along, dark } = timeOf(state.tick);
      clock = seconds;
      light.set(
        scene,
        state.day,
        state.gate > 0 && state.z < -7_000,
        seconds,
        at.x,
        at.z,
        along,
        dark,
        moon.on(at.x, at.z),
      );
      city.night(dark);
      town.show(state, at.x, at.z, heading, seconds, dt);
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
      // On the moon: a helmet, a black sky, and jumps that hang in the air.
      const up = moon.on(at.x, at.z);
      const lead = placeCast(
        cast,
        state,
        at,
        seconds,
        dt,
        up ? hopAt((seconds - jumped) / 1.8) * 2.4 : hopAt(seconds - jumped),
      );
      moon.wear(up ? (lead ?? null) : null, heightOf(state.hero));
      city.root.visible = !up;
      town.root.visible = !up;
      moon.show(at.x, at.z, seconds, state.tick);
      people.show(state, at, seconds, dt);
      // A ride taken from the kerb keeps its colour, and a car its broken window.
      const taken = [...state.done]
        .reverse()
        .find((id) => id.startsWith(`${state.ride}-`));
      if (riding)
        rides.show(
          state.ride,
          at.x,
          at.y,
          at.z,
          Math.PI / 2 - heading,
          seconds,
          taken === undefined ? undefined : town.paintOf(taken),
          state.ride === "car" && taken !== undefined,
        );
      chasers.show(state, at, seconds, dt);
      // How open the ground is round the hero, looked at a few times a second.
      if (Math.abs(seconds - sampled) > 0.3) {
        sampled = seconds;
        open += (rig.openness(at.x, at.z) - open) * 0.5;
      }
      const room = roomFor(state, open);
      const rising = town.lantern(seconds);
      if (clip !== null) rig.set(clipPose(clip.kind, at, clip.part));
      else if (rising === null) {
        const moving = state.dir >= 0 && state.talk === null;
        rig.aim(intentFor(state, closeUp), face ?? at, dt, moving, room);
      } else {
        const [x, y, z] = rising;
        rig.aim("follow", { heading, x, y: y - 1.6, z }, dt, false, room);
      }
      show(seconds);
    },
    jump() {
      jumped = clock;
    },
    opening(seconds) {
      const frame = frameOf(opening, seconds);
      if (frame === null) return null;
      hideAll();
      setEra(1);
      light.set(scene, 1, false, seconds, 180, 180);
      city.mark(null, seconds);
      city.night(0);
      town.idle(seconds);
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
      city.night(0);
      town.idle(seconds);
      rig.cut(spinRing(hero, locked, seconds, dt));
      show(seconds);
    },
    write: (message) => town.write(message),
    yaw: () => rig.yaw(),
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
