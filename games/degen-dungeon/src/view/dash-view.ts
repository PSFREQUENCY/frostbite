import type { Scene } from "three";

import { dashArch, dashDesk, quizStage } from "../rules/course.ts";
import { openTo, spotNamed } from "../rules/places.ts";
import type { DayState } from "../rules/types.ts";
import type { Subject } from "./camera.ts";
import { metres } from "./city.ts";
import { buildCourse } from "./dash-course.ts";
import { buildParade, paradeOn } from "./parade.ts";
import { buildZuri } from "./zuri.ts";

// The Degen Dash in the city: its course (`dash-course.ts`), a champion's parade (`parade.ts`), and Zuri herself: beside her arch, at
// her desk while a run is on (until its question is answered), or walking up to a hero with a ticket from down the street they came
// along, and waiting beside them. She walks at a stroll, faces whoever she is talking to, and is shown only near the hero.
const sight = 70;
const stroll = 2.2;
const talks = ["zuri", "dash-won", "dash-done", "dash-out"];

export interface DashView {
  hide(): void;
  show(state: DayState, at: Subject, seconds: number, dt: number): void;
}

export function createDashView(scene: Scene): DashView {
  const course = buildCourse();
  const parade = buildParade();
  const zuri = buildZuri();
  scene.add(course.root, parade.root, zuri.root);
  const arch = spotNamed("dash");
  let x = metres(dashArch.x);
  let z = metres(dashArch.z);
  let waiting = "";
  // Where she means to be (metres), or null on a day without the Dash.
  const goalOf = (state: DayState): { x: number; z: number } | null => {
    if (state.zuri !== null)
      return { x: metres(state.zuri.x) + 1.2, z: metres(state.zuri.z) + 0.5 };
    if (state.dash > 0 && state.dash <= quizStage)
      return { x: metres(dashDesk.x) - 1.1, z: metres(dashDesk.z) };
    if (arch !== undefined && openTo(arch, state))
      return { x: metres(dashArch.x) + 1, z: metres(dashArch.z) - 4.4 };
    return null;
  };
  return {
    hide() {
      course.root.visible = false;
      parade.root.visible = false;
      zuri.root.visible = false;
    },
    show(state, at, seconds, dt) {
      course.root.visible = true;
      course.show(state, seconds);
      parade.show(state, at, seconds);
      const goal = goalOf(state);
      const key =
        state.zuri === null
          ? ""
          : `${String(state.zuri.x)},${String(state.zuri.z)}`;
      if (key !== waiting && key !== "" && goal !== null) {
        // A new walk-up: she sets off from a few metres back along the way the hero came.
        x = goal.x - Math.cos(at.heading) * 7;
        z = goal.z - Math.sin(at.heading) * 7;
      }
      waiting = key;
      zuri.root.visible =
        goal !== null && Math.hypot(x - at.x, z - at.z) < sight;
      if (goal === null) return;
      const gap = Math.hypot(goal.x - x, goal.z - z);
      if (gap > 40) {
        x = goal.x;
        z = goal.z;
      }
      const walking = gap > 0.05 && gap <= 40;
      if (walking) {
        const step = Math.min(gap, stroll * dt);
        x += ((goal.x - x) / gap) * step;
        z += ((goal.z - z) / gap) * step;
      }
      zuri.root.position.set(x, 0, z);
      zuri.root.rotation.y = walking
        ? Math.atan2(goal.x - x, goal.z - z)
        : Math.atan2(at.x - x, at.z - z);
      const talking =
        talks.includes(state.talk ?? "") ||
        (state.talk ?? "").startsWith("quiz-") ||
        paradeOn(state);
      zuri.pose(walking ? 7 : 0, seconds, talking);
    },
  };
}
