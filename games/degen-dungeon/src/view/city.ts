import {
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from "three";

import { island } from "../rules/constants.ts";
import { watcherAt } from "../rules/mystery.ts";
import { openTo, spots, type Spot } from "../rules/places.ts";
import { beatOf } from "../rules/story.ts";
import type { DayState } from "../rules/types.ts";
import { box, buildBlocks } from "./blocks.ts";

// Nakasato, built in code from the same numbers the rules walk on: the island and the sea, the buildings of every borough, Moon Tower
// and the screens of Ticker Square with the hooded mirror statue, and a glowing marker on every place open today: the day's story beat
// tallest and gold, S's letters white on the ground, the watcher's footprints only by frost vision.
export const metres = (centimetres: number): number => centimetres / 100;

const spotTints: Readonly<Record<Spot["kind"], string>> = {
  drop: "#7be36b",
  faucet: "#5beac6",
  fence: "#c9c2ff",
  freezer: "#9fd8ff",
  gig: "#7be36b",
  heroword: "#c9b6ff",
  home: "#ffffff",
  letter: "#ffffff",
  locker: "#ffd166",
  loot: "#ff5d5d",
  offer: "#ff9ecf",
  plug: "#c9b6ff",
  rebrand: "#ffd166",
  recruit: "#ffd166",
  ride: "#5aa9ff",
  stop: "#22c55e",
  talk: "#ffb000",
  tool: "#f4a261",
  word: "#f7f3d7",
};

export interface City {
  // Shows the markers for what is open on this day, where the story's beat is, and the watcher by frost vision.
  mark(day: DayState | null, seconds: number): void;
  readonly root: Group;
}

function landmarks(root: Group): void {
  const glass = new MeshStandardMaterial({
    color: "#1b2f47",
    emissive: "#5beac6",
    emissiveIntensity: 0.3,
    metalness: 0.4,
    roughness: 0.2,
  });
  const tower = new Mesh(new CylinderGeometry(6, 9, 150, 8), glass);
  tower.name = "moon-tower";
  tower.position.set(210, 75, 150);
  const moon = new Mesh(
    new SphereGeometry(7, 16, 12),
    new MeshStandardMaterial({
      color: "#fff3b0",
      emissive: "#ffd166",
      emissiveIntensity: 1,
    }),
  );
  moon.position.set(210, 156, 150);
  const screens = new MeshStandardMaterial({
    color: "#0b0d18",
    emissive: "#22c55e",
    emissiveIntensity: 0.9,
  });
  for (const [x, z, turn] of [
    [169, 168, 0],
    [191, 168, 0],
    [169, 192, Math.PI],
    [191, 192, Math.PI],
  ] as const) {
    const screen = new Mesh(new PlaneGeometry(14, 8), screens);
    screen.name = "ticker";
    screen.position.set(x, 22, z);
    screen.rotation.y = turn;
    root.add(screen);
  }
  const bronze = new MeshStandardMaterial({
    color: "#8a6a3a",
    metalness: 0.8,
    roughness: 0.35,
  });
  const figure = new Mesh(new CapsuleGeometry(0.9, 2.2, 4, 10), bronze);
  figure.position.set(186, 2.6, 186);
  const face = new Mesh(
    new SphereGeometry(0.7, 16, 12),
    new MeshStandardMaterial({
      color: "#ffffff",
      metalness: 1,
      roughness: 0.05,
    }),
  );
  face.name = "mirror-face";
  face.position.set(186, 4.6, 186.3);
  const plinth = new Mesh(
    new CylinderGeometry(1.6, 1.8, 1, 10),
    new MeshStandardMaterial({ color: "#3a3f47" }),
  );
  plinth.position.set(186, 0.5, 186);
  root.add(tower, moon, figure, face, plinth);
}

export function buildCity(): City {
  const root = new Group();
  root.name = "city";
  const size = metres(island);
  const ground = new Mesh(
    new PlaneGeometry(size, size),
    new MeshStandardMaterial({ color: "#20263a", roughness: 1 }),
  );
  ground.name = "ground";
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(size / 2, 0, size / 2);
  ground.receiveShadow = true;
  const sea = new Mesh(
    new PlaneGeometry(size * 4, size * 4),
    new MeshStandardMaterial({
      color: "#0a2a44",
      metalness: 0.2,
      roughness: 0.3,
    }),
  );
  sea.name = "sea";
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(size / 2, -0.6, size / 2);
  root.add(ground, sea);
  buildBlocks(root);
  landmarks(root);
  const markers = new InstancedMesh(
    new CylinderGeometry(0.35, 0.35, 1, 8),
    new MeshStandardMaterial({ emissive: "#ffffff", emissiveIntensity: 0.6 }),
    spots.length,
  );
  markers.name = "spots";
  spots.forEach((spot, index) =>
    markers.setColorAt(index, new Color(spotTints[spot.kind])),
  );
  const beacon = new Mesh(
    new CylinderGeometry(0.8, 0.8, 30, 12, 1, true),
    new MeshStandardMaterial({
      color: "#ffb000",
      emissive: "#ffb000",
      emissiveIntensity: 1,
      opacity: 0.4,
      transparent: true,
    }),
  );
  beacon.name = "beat";
  const steps = new Mesh(
    new CylinderGeometry(1.2, 1.2, 0.1, 12),
    new MeshStandardMaterial({
      color: "#c9b6ff",
      emissive: "#c9b6ff",
      emissiveIntensity: 0.8,
    }),
  );
  steps.name = "watcher";
  root.add(markers, beacon, steps);
  return {
    mark(day, seconds) {
      spots.forEach((spot, index) => {
        const open = day === null ? spot.on === undefined : openTo(spot, day);
        const paper = spot.kind === "letter";
        const wide = paper ? 1 : 2.2 + 0.25 * Math.sin(seconds * 2 + index);
        const side = open ? wide : 0;
        markers.setMatrixAt(
          index,
          box(
            metres(spot.x),
            0.04,
            metres(spot.z),
            side,
            open ? 0.06 : 0,
            paper ? side * 0.7 : side,
          ),
        );
      });
      markers.instanceMatrix.needsUpdate = true;
      const beat = day === null ? null : beatOf(day);
      beacon.visible = beat !== null;
      if (beat !== null) {
        beacon.position.set(metres(beat.at.x), 15, metres(beat.at.z));
        beacon.scale.setScalar(1 + 0.15 * Math.sin(seconds * 3));
      }
      steps.visible =
        day !== null && day.looking && !day.done.includes("watcher");
      if (day !== null && steps.visible) {
        const at = watcherAt(day.seed, day.day);
        steps.position.set(metres(at.x), 0.05, metres(at.z));
      }
    },
    root,
  };
}
