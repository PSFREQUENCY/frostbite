import {
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  Euler,
} from "three";

import { dashArch } from "../rules/course.ts";
import { dashPar } from "../rules/dash.ts";
import type { DayState } from "../rules/types.ts";
import type { Subject } from "./camera.ts";
import { metres } from "./city.ts";

// A champion's parade, for half a minute after a Degen Dash is won (`paradeOn`): confetti over the arch, fireworks above it, the trophy
// held up over the champion's head, and the street's crowd lining the avenue to cheer (`crowd.ts`). It reads the day and decides
// nothing.
export const paradeTicks = 900;
export const paradeOn = (
  state: Pick<DayState, "dash" | "dashFrom" | "dashTime" | "done" | "tick">,
): boolean =>
  state.dash === 0 &&
  state.dashTime > 0 &&
  state.dashTime <= dashPar &&
  state.done.includes("dash-won") &&
  state.tick - state.dashFrom < paradeTicks;

const flakes = 420;
const sparks = 150;
const colours = ["#18c4b4", "#f2c14e", "#ff9ecf", "#f4f8ff", "#6aa8ff"];
// A fixed scatter, so the confetti falls the same way every time.
const scatter = (index: number, salt: number): number => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
};

// The trophy: a gold cup on a stem and a stepped base, with two handles.
export function buildTrophy(): Group {
  const trophy = new Group();
  trophy.name = "trophy";
  const metal = new MeshStandardMaterial({
    color: "#f2c14e",
    emissive: "#f2c14e",
    emissiveIntensity: 0.35,
    metalness: 0.9,
    roughness: 0.25,
  });
  const outline = [
    [0.0, 0],
    [0.17, 0],
    [0.17, 0.05],
    [0.12, 0.07],
    [0.05, 0.1],
    [0.04, 0.24],
    [0.07, 0.28],
    [0.17, 0.36],
    [0.21, 0.5],
    [0.22, 0.62],
  ].map(([x, y]) => new Vector2(x, y));
  trophy.add(new Mesh(new LatheGeometry(outline, 20), metal));
  for (const side of [-1, 1]) {
    const handle = new Mesh(
      new TorusGeometry(0.08, 0.018, 6, 14, Math.PI),
      metal,
    );
    handle.position.set(side * 0.22, 0.5, 0);
    handle.rotation.set(0, 0, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    trophy.add(handle);
  }
  return trophy;
}

export interface Parade {
  readonly root: Group;
  show(state: DayState, at: Subject, seconds: number): void;
}

export function buildParade(): Parade {
  const root = new Group();
  root.name = "parade";
  const confetti = new InstancedMesh(
    new PlaneGeometry(0.16, 0.1),
    new MeshBasicMaterial({ side: DoubleSide }),
    flakes,
  );
  const fireworks = new InstancedMesh(
    new SphereGeometry(0.45, 6, 4),
    new MeshBasicMaterial(),
    sparks,
  );
  const tint = new Color();
  for (let index = 0; index < flakes; index += 1)
    confetti.setColorAt(
      index,
      tint.set(colours[index % colours.length] ?? "#ffffff"),
    );
  for (let index = 0; index < sparks; index += 1)
    fireworks.setColorAt(
      index,
      tint.set(colours[Math.floor(index / 50) % colours.length] ?? "#ffffff"),
    );
  const trophy = buildTrophy();
  trophy.scale.setScalar(1.3);
  root.add(confetti, fireworks, trophy);
  const matrix = new Matrix4();
  const spin = new Quaternion();
  const turn = new Euler();
  const place = new Vector3();
  const size = new Vector3();
  let started = -1;
  return {
    root,
    show(state, at, seconds) {
      root.visible = paradeOn(state);
      if (!root.visible) {
        started = -1;
        return;
      }
      if (started < 0) started = seconds;
      const time = seconds - started;
      const archX = metres(dashArch.x);
      const archZ = metres(dashArch.z);
      for (let index = 0; index < flakes; index += 1) {
        const fall = 1.2 + scatter(index, 1) * 1.4;
        const drop = (time * fall + scatter(index, 2) * 16) % 16;
        const sway = Math.sin(time * 2 + index) * 0.6;
        place.set(
          archX + (scatter(index, 3) - 0.5) * 30 + sway,
          16 - drop,
          archZ + (scatter(index, 4) - 0.5) * 30,
        );
        turn.set(time * 3 + index, time * 2 + index * 0.5, 0);
        spin.setFromEuler(turn);
        matrix.compose(place, spin, size.setScalar(1));
        confetti.setMatrixAt(index, matrix);
      }
      for (let index = 0; index < sparks; index += 1) {
        const burst = Math.floor(index / 50);
        const age = (time - burst * 0.9) % 2.7;
        const reach = age < 0 ? 0 : 7 * (1 - Math.exp(-2.5 * age));
        const up = Math.acos(1 - 2 * scatter(index, 5));
        const around = scatter(index, 6) * Math.PI * 2;
        place.set(
          archX + (burst - 1) * 9 + Math.sin(up) * Math.cos(around) * reach,
          10 + burst * 1.5 + Math.cos(up) * reach - age * age,
          archZ - 24 + Math.sin(up) * Math.sin(around) * reach,
        );
        matrix.compose(
          place,
          spin.identity(),
          size.setScalar(age < 0 || age > 1.9 ? 0 : 1 - age / 2),
        );
        fireworks.setMatrixAt(index, matrix);
      }
      confetti.instanceMatrix.needsUpdate = true;
      fireworks.instanceMatrix.needsUpdate = true;
      trophy.position.set(at.x, at.y + 2.5 + Math.sin(time * 2) * 0.1, at.z);
      trophy.rotation.y = time * 1.5;
    },
  };
}
