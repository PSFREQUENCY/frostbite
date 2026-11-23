import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from "three";

import { beatOf } from "../rules/story.ts";
import type { DayState, Point } from "../rules/types.ts";
import { dreams } from "../script/dreams.ts";
import { stories } from "../script/stories.ts";
import { buildLooked, type Actor } from "./actor.ts";
import { painted } from "./boards.ts";
import { hash } from "./hash.ts";
import { hillAt } from "./hill.ts";
import { clerkLooks, thiefLook } from "./looks.ts";
import { build, type Piece } from "./things.ts";

// Where the story's next beat is done, someone is waiting, with the things the beat is about: an auction's easels with gilt frames
// under an AUCTION sign for the shiny frame, the Exchange's chart on a kiosk, an arcade cabinet, a spool of wire and a fuse box, a miner's
// lamp by a carved rock, a safe, a couch to carry, a club's door and rope, a snow pile and a shovel, a notice board, a stoop with
// cards, a camera on its tripod, crates and buckets, a rowboat and a rod, a park bench, a pawn window. Which one is read from the beat's
// own words (`sceneOf`); a beat with nothing to hold has the person alone. A gold "!" turns over their head. Talk to them to do it.
export interface BeatScenes {
  readonly root: Group;
  show(state: DayState | null, hero: Point, seconds: number, dt: number): void;
}

export type Scene =
  | "arcade"
  | "auction"
  | "bench"
  | "boat"
  | "camera"
  | "club"
  | "couch"
  | "crates"
  | "lamp"
  | "notice"
  | "pawn"
  | "person"
  | "screen"
  | "snow"
  | "stoop"
  | "vault"
  | "wire";
const words: readonly (readonly [RegExp, Scene])[] = [
  [/frame|auction/iu, "auction"],
  [/arcade|cabinet|tournament/iu, "arcade"],
  [/wire|power|grid|splice|brownout|line under/iu, "wire"],
  [/carved|tunnel|lamp|mining/iu, "lamp"],
  [/vault|freezer|ledger|MAXX/iu, "vault"],
  [/couch|moving/iu, "couch"],
  [/club|door|party/iu, "club"],
  [/snow/iu, "snow"],
  [/notice|sign|form|fee/iu, "notice"],
  [/stoop|basement|alley|odds/iu, "stoop"],
  [/camera|selfie|face/iu, "camera"],
  [/screen|chart|token|trade|desk|Exchange/iu, "screen"],
  [/deliver|dispatch|courier|robot|bucket|Swap Meet/iu, "crates"],
  [/yacht|boat|pier|dock|fish|coat/iu, "boat"],
  [/park|listen/iu, "bench"],
  [/pawn|suit/iu, "pawn"],
];
export const sceneOf = (line: string): Scene =>
  words.find(([pattern]) => pattern.test(line))?.[1] ?? "person";

const gilt = "#e0b341";
const post = (x: number, height: number, z = 0, colour = "#5a3a2f"): Piece => [
  "box",
  colour,
  [0.07, height, 0.07],
  [x, height / 2, z],
];
const frame = (x: number, colour: string, shine = false): Piece[] => [
  post(x - 0.3, 1.5, -0.1),
  post(x + 0.3, 1.5, -0.1),
  ["box", gilt, [0.9, 0.72, 0.06], [x, 1.35, 0], shine],
  ["box", colour, [0.72, 0.54, 0.07], [x, 1.35, 0.01]],
];
export const scenes: Readonly<
  Record<Exclude<Scene, "person">, readonly Piece[]>
> = {
  arcade: [
    ["box", "#2a2350", [0.8, 1.8, 0.7], [0, 0.9, 0]],
    ["box", "#5beac6", [0.6, 0.45, 0.02], [0, 1.35, 0.36], true],
    ["box", "#ff3df2", [0.8, 0.2, 0.05], [0, 1.72, 0.36], true],
  ],
  auction: [
    ...frame(-0.6, "#3fae6b"),
    ...frame(0.6, "#6aa8ff", true),
    ["box", "#8a5a3a", [0.7, 1.1, 0.5], [-1.6, 0.55, 0.4]],
    ["ball", gilt, [0.12, 0.12, 0.12], [-1.6, 1.2, 0.4], true],
  ],
  bench: [
    ["box", "#8a5a3a", [1.6, 0.08, 0.45], [0, 0.45, 0]],
    ["box", "#8a5a3a", [1.6, 0.4, 0.06], [0, 0.75, -0.2]],
    post(-0.7, 0.45),
    post(0.7, 0.45),
  ],
  boat: [
    ["ball", "#c98a4b", [0.9, 0.3, 0.45], [0, 0.3, 0]],
    ["box", "#5a3a2f", [0.04, 1.6, 0.04], [0.8, 0.8, 0.3]],
    ["post", "#11131c", [0.04, 1.9, 0.04], [-1, 0.95, -0.2]],
  ],
  camera: [
    post(-0.15, 1.3),
    post(0.15, 1.3),
    ["box", "#11131c", [0.35, 0.25, 0.3], [0, 1.4, 0]],
    ["ring", "#f4f8ff", [0.35, 0.35, 0.35], [0.9, 1.5, 0], true],
    post(0.9, 1.2, 0, "#11131c"),
  ],
  club: [
    ["box", "#11131c", [1.2, 2.2, 0.1], [0, 1.1, -0.5]],
    ["box", "#ff3df2", [1.2, 0.2, 0.05], [0, 2.35, -0.44], true],
    post(-1, 0.9, 0.2, gilt),
    post(1, 0.9, 0.2, gilt),
    ["box", "#b3263a", [2, 0.05, 0.05], [0, 0.8, 0.2]],
  ],
  couch: [
    ["box", "#6a5acd", [1.8, 0.45, 0.8], [0, 0.25, 0]],
    ["box", "#6a5acd", [1.8, 0.5, 0.2], [0, 0.65, -0.3]],
    ["box", "#5a4ab5", [0.2, 0.3, 0.8], [-0.9, 0.55, 0]],
    ["box", "#5a4ab5", [0.2, 0.3, 0.8], [0.9, 0.55, 0]],
  ],
  crates: [
    ["box", "#c98a4b", [0.6, 0.5, 0.6], [-0.4, 0.25, 0]],
    ["box", "#b37a40", [0.5, 0.45, 0.5], [-0.4, 0.72, 0]],
    ["post", "#2f6fb5", [0.22, 0.4, 0.22], [0.5, 0.2, 0.2]],
    ["post", "#d64545", [0.22, 0.4, 0.22], [0.95, 0.2, 0.2]],
  ],
  lamp: [
    ["box", "#4a3f66", [1.6, 1.6, 0.4], [0, 0.8, -0.4]],
    ["box", "#5beac6", [0.9, 0.12, 0.02], [0, 1.05, -0.19], true],
    post(0.9, 0.9, 0, "#11131c"),
    ["ball", "#ffb000", [0.14, 0.18, 0.14], [0.9, 1, 0], true],
  ],
  notice: [
    post(-0.55, 1.6),
    post(0.55, 1.6),
    ["box", "#8a5a3a", [1.3, 0.9, 0.06], [0, 1.35, 0]],
    ["box", "#f4f1ea", [0.35, 0.45, 0.02], [-0.3, 1.35, 0.04]],
    ["box", "#ffd166", [0.35, 0.45, 0.02], [0.2, 1.4, 0.04], true],
  ],
  pawn: [
    ["box", "#5a4a6a", [1.6, 2.2, 0.8], [0, 1.1, -0.5]],
    ["box", "#ffd166", [0.9, 0.6, 0.02], [0, 1.3, -0.09], true],
  ],
  screen: [
    post(0, 1.2, 0, "#2a2f45"),
    ["box", "#11131c", [1.4, 0.9, 0.08], [0, 1.6, 0]],
    ["box", "#39e27d", [1.1, 0.05, 0.02], [0, 1.7, 0.05], true],
    ["box", "#ff4d5e", [0.5, 0.05, 0.02], [0.3, 1.45, 0.05], true],
  ],
  snow: [
    ["ball", "#f4f8ff", [0.9, 0.5, 0.7], [0, 0.2, 0]],
    ["box", "#8a5a3a", [0.05, 1.2, 0.05], [0.8, 0.6, 0.2]],
    ["box", "#9aa3b5", [0.35, 0.3, 0.04], [0.8, 0.12, 0.25]],
  ],
  stoop: [
    ["box", "#b48a6a", [1.6, 0.2, 0.9], [0, 0.1, -0.4]],
    ["box", "#b48a6a", [1.6, 0.2, 0.6], [0, 0.3, -0.55]],
    ["box", "#2a2f45", [0.6, 0.6, 0.5], [0.9, 0.3, 0.3]],
    ["box", "#f4f1ea", [0.4, 0.01, 0.3], [0.9, 0.61, 0.3]],
  ],
  vault: [
    ["box", "#5d6470", [0.8, 0.9, 0.7], [0, 0.45, 0]],
    ["ring", "#d8dee9", [0.16, 0.16, 0.16], [0, 0.5, 0.36]],
    ["box", "#d8dee9", [0.05, 0.25, 0.05], [0.25, 0.5, 0.37]],
  ],
  wire: [
    ["post", "#c98a4b", [0.4, 0.5, 0.4], [-0.6, 0.25, 0]],
    post(0.5, 1.8, -0.2, "#5d6470"),
    ["box", "#5d6470", [0.5, 0.6, 0.25], [0.5, 1.4, -0.05]],
    ["box", "#ffd166", [0.15, 0.25, 0.02], [0.5, 1.4, 0.08], true],
  ],
};

export function buildBeatScenes(): BeatScenes {
  const root = new Group();
  root.name = "beat-scenes";
  const props = new Map<Scene, Group>();
  const people = new Map<number, Actor>();
  const sign = new Mesh(new PlaneGeometry(1.6, 0.55), painted("AUCTION", gilt));
  sign.name = "auction-sign";
  // The "!" over the one waiting: a bar and a dot, glowing gold.
  const bang = new Group();
  bang.name = "beat-bang";
  const goldLit = new MeshBasicMaterial({ color: "#ffd166" });
  const bar = new Mesh(new BoxGeometry(0.1, 0.32, 0.1), goldLit);
  bar.position.y = 0.12;
  const dot = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), goldLit);
  dot.position.y = -0.14;
  bang.add(bar, dot);
  root.add(bang);
  // Each beat's scene faces the hero the moment it is first shown, and stays put.
  let key = "";
  let facing = 0;
  return {
    root,
    show(state, hero, seconds, dt) {
      const beat = state === null ? null : beatOf(state);
      for (const group of props.values()) group.visible = false;
      for (const actor of people.values()) actor.root.visible = false;
      bang.visible = false;
      if (state === null || beat === null) return;
      const words =
        stories[state.hero]?.[state.day - 3]?.[state.beat]?.line ??
        dreams[state.hero]?.line;
      const scene = sceneOf(words ?? "");
      const [x, z] = [beat.at.x / 100, beat.at.z / 100];
      const now = `${String(state.hero)}-${String(state.day)}-${String(state.beat)}`;
      if (now !== key) {
        key = now;
        facing = Math.atan2(hero.x - x, hero.z - z);
      }
      const ground = hillAt(x, z);
      if (scene !== "person") {
        let group = props.get(scene);
        if (group === undefined) {
          group = build(scenes[scene]);
          group.scale.setScalar(scene === "auction" ? 1.35 : 1.15);
          if (scene === "auction") {
            sign.position.set(0, 2.4, 0);
            group.add(sign);
          }
          props.set(scene, group);
          root.add(group);
        }
        group.visible = true;
        group.position.set(x, ground, z);
        group.rotation.y = facing;
      }
      // The one waiting stands a step to the side, turned to the hero, talking while the hero talks to them.
      const which = Math.floor(
        hash(state.hero, state.day, state.beat) * clerkLooks.length,
      );
      let actor = people.get(which);
      if (actor === undefined) {
        actor = buildLooked(
          clerkLooks[which] ?? thiefLook,
          `beat-person-${String(which)}`,
        );
        people.set(which, actor);
        root.add(actor.root);
      }
      const side = scene === "person" ? 0 : 1.4;
      const [px, pz] = [
        x + Math.cos(facing) * side,
        z - Math.sin(facing) * side,
      ];
      actor.root.visible = true;
      actor.root.position.set(px, hillAt(px, pz), pz);
      actor.root.rotation.y = Math.atan2(hero.x - px, hero.z - pz);
      actor.move(0, seconds, dt, state.talk !== null);
      bang.visible = state.talk === null;
      bang.position.set(
        px,
        hillAt(px, pz) + 2.35 + Math.sin(seconds * 3) * 0.08,
        pz,
      );
      bang.rotation.y = seconds * 2;
    },
  };
}
