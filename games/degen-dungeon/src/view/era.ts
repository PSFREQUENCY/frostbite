import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  type Scene,
} from "three";

import { box, hash } from "./blocks.ts";

// The light of each story day: a cold dawn for the riot morning, a hot neon dusk for the mania, grey snow for the winter, a clean bright
// Launch Day, and Moon Night under a huge moon; SHA Beach gets the first sunrise of the game. Snow falls round the camera in the winter.
interface Mood {
  readonly fog: number;
  readonly ground: string;
  readonly key: string;
  readonly power: number;
  readonly sky: string;
}
const moods: readonly Mood[] = [
  { fog: 420, ground: "#3a4466", key: "#ffc6a8", power: 1.6, sky: "#3b4a7a" },
  { fog: 460, ground: "#3b2f52", key: "#ff9ecf", power: 1.5, sky: "#2a1648" },
  { fog: 260, ground: "#c9d7e3", key: "#e8f6ff", power: 1.1, sky: "#9aaec4" },
  { fog: 520, ground: "#4a5468", key: "#ffffff", power: 2.0, sky: "#7fc4ff" },
  { fog: 480, ground: "#262d45", key: "#c9d7ff", power: 1.2, sky: "#070a1a" },
];
const sunrise: Mood = {
  fog: 500,
  ground: "#ffb36b",
  key: "#ffd2a1",
  power: 2.2,
  sky: "#ff9a6b",
};

export interface Light {
  set(
    scene: Scene,
    day: number,
    beach: boolean,
    seconds: number,
    x: number,
    z: number,
  ): void;
  readonly root: Group;
}

export function buildLight(): Light {
  const root = new Group();
  root.name = "light";
  const hemisphere = new HemisphereLight("#ffffff", "#334", 1.8);
  const ambient = new AmbientLight("#ffffff", 0.6);
  const sun = new DirectionalLight("#ffffff", 2.4);
  sun.position.set(120, 220, 260);
  sun.target.position.set(180, 0, 180);
  const flakes = new InstancedMesh(
    new PlaneGeometry(0.15, 0.15),
    new MeshBasicMaterial({ color: "#ffffff" }),
    900,
  );
  flakes.name = "snow";
  root.add(hemisphere, ambient, sun, sun.target, flakes);
  let shown = "";
  return {
    root,
    set(scene, day, beach, seconds, x, z) {
      const mood = beach ? sunrise : (moods[day - 1] ?? moods[0] ?? sunrise);
      const key = `${String(day)}${String(beach)}`;
      if (key !== shown) {
        shown = key;
        scene.background = new Color(mood.sky);
        scene.fog = new Fog(mood.sky, 40, mood.fog);
        hemisphere.color.set(mood.sky);
        hemisphere.groundColor.set(mood.ground);
        sun.color.set(mood.key);
        sun.intensity = mood.power * 1.5;
        const ground = scene.getObjectByName("ground");
        if (
          ground instanceof Mesh &&
          ground.material instanceof MeshStandardMaterial
        )
          ground.material.color.set(mood.ground);
      }
      flakes.visible = day === 3 && !beach;
      if (!flakes.visible) return;
      for (let index = 0; index < 900; index += 1) {
        const fall = 30 - ((seconds * 2 + hash(index, 8, 1) * 30) % 30);
        flakes.setMatrixAt(
          index,
          box(
            x + (hash(index, 1, 8) - 0.5) * 60,
            fall,
            z + (hash(index, 2, 9) - 0.5) * 60,
            1,
            1,
            1,
          ),
        );
      }
      flakes.instanceMatrix.needsUpdate = true;
    },
  };
}
