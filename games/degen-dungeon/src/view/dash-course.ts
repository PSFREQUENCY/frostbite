import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  RingGeometry,
  type BufferGeometry,
  type Material,
} from "three";

import { dashArch, dashCar, stages, type Trial } from "../rules/course.ts";
import { openTo, spotNamed } from "../rules/places.ts";
import type { DayState } from "../rules/types.ts";
import { painted } from "./boards.ts";
import { metres } from "./city.ts";
import { storey } from "./climbing.ts";
import { buildKit, kits } from "./kits.ts";
import { roofAt } from "./lots.ts";
import { toonSteps } from "./textures.ts";

// The Degen Dash's course in the city: Miss Mirinda's arch (the start and the finish) with its sign and a chequered line, and while a run
// is on each gate's obstacle in turquoise and gold, with a ring of light on the ground at the next one: a sprint gate, a low bar, a crawl
// net, a banner at the top of a wall, a flag on the roof, a mark on the ground only frost vision shows, a checkpoint for the car and Miss
// Mirinda's desk. The Dash car waits at the kerb until it is taken. It reads the day and decides nothing.
const turquoise = "#18c4b4";
const gold = "#f2c14e";
const solid = (colour: string): MeshToonMaterial =>
  new MeshToonMaterial({ color: colour, gradientMap: toonSteps });
const lit = (colour: string, strength = 0.9): MeshStandardMaterial =>
  new MeshStandardMaterial({
    color: colour,
    emissive: colour,
    emissiveIntensity: strength,
  });
const post = solid("#1d2433");
const neon = lit(turquoise);
const trim = lit(gold, 0.6);

const piece = (
  parent: Group,
  geometry: BufferGeometry,
  material: Material,
  at: readonly [number, number, number],
  turn: readonly [number, number, number] = [0, 0, 0],
): Mesh => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...at);
  mesh.rotation.set(...turn);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
};

// A gateway across the way the runner comes (local x across, local z along): two posts, a lintel with the word on both faces, neon on
// its edges.
function gateway(word: string, wide: number, high: number): Group {
  const gate = new Group();
  for (const side of [-1, 1]) {
    piece(gate, new BoxGeometry(0.3, high, 0.3), post, [
      (side * wide) / 2,
      high / 2,
      0,
    ]);
    piece(gate, new BoxGeometry(0.08, high, 0.34), neon, [
      (side * wide) / 2 - side * 0.17,
      high / 2,
      0,
    ]);
  }
  piece(gate, new BoxGeometry(wide + 0.3, 0.9, 0.36), post, [0, high, 0]);
  piece(gate, new BoxGeometry(wide + 0.4, 0.08, 0.4), trim, [
    0,
    high + 0.48,
    0,
  ]);
  const sign = painted(word, turquoise);
  for (const face of [-1, 1])
    piece(
      gate,
      new PlaneGeometry(wide - 0.2, 0.75),
      sign,
      [0, high, face * 0.19],
      [0, face < 0 ? Math.PI : 0, 0],
    );
  return gate;
}

// What stands at each gate, in its own frame (local z the way the runner comes).
function obstacle(trial: Trial, gate: Group, x: number, z: number): void {
  if (trial === "duck")
    piece(
      gate,
      new CylinderGeometry(0.06, 0.06, 4.2, 10),
      neon,
      [0, 1.05, 0],
      [0, 0, Math.PI / 2],
    );
  if (trial === "crawl") {
    const net = new MeshStandardMaterial({
      color: gold,
      opacity: 0.55,
      side: DoubleSide,
      transparent: true,
      wireframe: true,
    });
    piece(
      gate,
      new PlaneGeometry(4.2, 1.8, 12, 6),
      net,
      [0, 0.55, 0],
      [-Math.PI / 2, 0, 0],
    );
  }
  if (trial === "wall") {
    // A banner hung at the top storey of the wall beside the gate.
    const top = roofAt(x, z + 1.6) ?? 3 * storey;
    piece(
      gate,
      new PlaneGeometry(1.6, 2.4),
      painted("CLIMB", gold),
      [0, top - 1.6, 0.62],
      [0, Math.PI, 0],
    );
  }
  if (trial === "roof") {
    const top = roofAt(x, z) ?? 3 * storey;
    piece(gate, new CylinderGeometry(0.05, 0.05, 2.6, 8), post, [
      0,
      top + 1.3,
      0,
    ]);
    piece(gate, new PlaneGeometry(1.4, 0.9), painted("ROOF", turquoise), [
      0.72,
      top + 2.1,
      0,
    ]);
  }
  if (trial === "look") {
    const mark = piece(
      gate,
      new RingGeometry(0.9, 1.4, 6),
      lit("#c9b6ff", 1.2),
      [0, 0.06, 0],
      [-Math.PI / 2, 0, 0],
    );
    mark.name = "dash-mark";
  }
  if (trial === "car")
    for (const side of [-1, 1])
      piece(
        gate,
        new CylinderGeometry(0.05, 0.22, 0.6, 10),
        lit("#ff8c42", 0.4),
        [side * 2.6, 0.3, 1.4],
      );
  if (trial === "quiz") {
    piece(
      gate,
      new BoxGeometry(1.8, 0.95, 0.8),
      solid(turquoise),
      [0, 0.48, 0],
    );
    piece(gate, new BoxGeometry(1.9, 0.06, 0.9), trim, [0, 0.98, 0]);
  }
}

const wordOf: Readonly<Record<Trial, string>> = {
  car: "DRIVE",
  crawl: "CRAWL",
  duck: "DUCK",
  finish: "FINISH",
  look: "LOOK",
  quiz: "QUIZ",
  roof: "",
  run: "RUN",
  wall: "",
};
// Which way the runner comes through each gate (radians about the up axis: 0 means along +z). The gates stand tall enough that the
// beacon's gem hangs under their signs.
const facing: Readonly<Record<Trial, number>> = {
  car: 0,
  crawl: 0,
  duck: 0,
  finish: Math.PI / 2,
  look: Math.PI / 2,
  quiz: Math.PI / 2,
  roof: Math.PI / 2,
  run: Math.PI / 2,
  wall: 0,
};

export interface Course {
  readonly root: Group;
  show(state: DayState, seconds: number): void;
}

export function buildCourse(): Course {
  const root = new Group();
  root.name = "degen-dash";
  const arch = gateway("DEGEN DASH", 7, 5);
  const flag = new Group();
  for (let square = 0; square < 14; square += 1)
    piece(
      flag,
      new PlaneGeometry(0.5, 0.5),
      solid(square % 2 === 0 ? "#f4f8ff" : "#11131c"),
      [-3.25 + square * 0.5, 0.03, square % 2 === 0 ? 0.25 : -0.25],
      [-Math.PI / 2, 0, 0],
    );
  arch.add(flag);
  arch.position.set(metres(dashArch.x), 0, metres(dashArch.z));
  arch.rotation.y = Math.PI / 2;
  arch.name = "dash-arch";
  const gates = stages.slice(0, -1).map((stage) => {
    const x = metres(stage.x);
    const z = metres(stage.z);
    const word = wordOf[stage.trial];
    const gate =
      word === "" || stage.trial === "quiz"
        ? new Group()
        : gateway(word, stage.trial === "car" ? 6 : 4.2, 5.2);
    if (stage.trial === "quiz") {
      const stand = gateway(word, 1.8, 2.4);
      stand.position.z = -1.6;
      gate.add(stand);
    }
    obstacle(stage.trial, gate, x, z);
    const ring = piece(
      gate,
      new CircleGeometry(2.6, 32),
      lit(gold, 0.5),
      [0, 0.05, 0],
      [-Math.PI / 2, 0, 0],
    );
    ring.name = "next-gate";
    gate.position.set(x, 0, z);
    gate.rotation.y = facing[stage.trial];
    gate.name = `dash-gate-${stage.trial}`;
    root.add(gate);
    return { gate, ring, trial: stage.trial };
  });
  const car = buildKit(
    kits.car,
    new MeshToonMaterial({ color: turquoise, gradientMap: toonSteps }),
  );
  car.name = "dash-car";
  car.position.set(metres(dashCar.x), 0, metres(dashCar.z));
  car.rotation.y = Math.PI / 2;
  root.add(arch, car);
  const archSpot = spotNamed("dash");
  return {
    root,
    show(state, seconds) {
      arch.visible = archSpot !== undefined && openTo(archSpot, state);
      const pulse = 1 + 0.12 * Math.sin(seconds * 5);
      gates.forEach(({ gate, ring, trial }, index) => {
        const stage = index + 1;
        gate.visible = state.dash > 0 && stage >= state.dash;
        ring.visible = stage === state.dash;
        ring.scale.setScalar(pulse);
        // The frost-vision mark shows only while frost vision is on.
        const mark =
          trial === "look" ? gate.getObjectByName("dash-mark") : undefined;
        if (mark !== undefined) mark.visible = state.looking;
      });
      car.visible =
        state.dash > 0 &&
        state.dash <= 7 &&
        !(state.ride === "car" && state.rideId === "");
    },
  };
}
