import type { Scene } from "three";

import { echoAt } from "../rules/machine.ts";
import type { DayState } from "../rules/types.ts";
import { buildActor, heightOf, type Actor } from "./actor.ts";
import type { Subject } from "./camera.ts";
import { metres } from "./city.ts";
import { modelOf, rigged, type Model } from "./models/load.ts";
import type { ModelName } from "./models/packed.ts";

// The hero's newbie self on a trip back through the Time Machine: a second, smaller body of the hero who is travelling, standing where the
// rules say and turned to face them. While it is being answered, the close-up is on it.
export function createNewbie(
  scene: Scene,
  loaded: ReadonlyMap<ModelName, Model>,
) {
  let echo: { readonly actor: Actor; readonly hero: number } | null = null;
  return {
    hide(): void {
      if (echo !== null) echo.actor.root.visible = false;
    },
    show(
      state: DayState,
      at: Subject,
      seconds: number,
      dt: number,
    ): Subject | null {
      const past = echoAt(state);
      if (past === null) return null;
      if (echo?.hero !== state.hero) {
        if (echo !== null) scene.remove(echo.actor.root);
        echo = { actor: buildActor(state.hero), hero: state.hero };
        echo.actor.root.name = "echo";
        echo.actor.root.scale.multiplyScalar(0.85);
        const name = modelOf[state.hero];
        const model =
          name === undefined || name === null ? undefined : loaded.get(name);
        if (model !== undefined)
          echo.actor.wear(rigged(model, heightOf(state.hero)));
        scene.add(echo.actor.root);
      }
      const body = echo.actor.root;
      body.visible = true;
      body.position.set(metres(past.x) + 1.2, 0, metres(past.z));
      body.rotation.y = Math.atan2(
        at.x - body.position.x,
        at.z - body.position.z,
      );
      echo.actor.move(0, seconds, dt, state.talk === past.id);
      const { x, z } = body.position;
      return state.talk === past.id
        ? { heading: Math.atan2(at.z - z, at.x - x), x, y: 0, z }
        : null;
    },
  };
}
