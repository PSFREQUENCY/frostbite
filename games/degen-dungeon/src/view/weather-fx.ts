import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  Group,
  Points,
  PointsMaterial,
  type Scene,
} from "three";

import type { Weather } from "../rules/types.ts";
import { hash } from "./hash.ts";

// The weather on the screen: snow drifting down, a blizzard driven sideways, rain and lightning in a thunderstorm, leaves and grit in a
// gale, heat shimmer rising in a heatwave, and fog (or a blizzard's or storm's murk) closing in. All of it hangs round the hero; the
// rules say which weather it is.
export interface WeatherFx {
  readonly root: Group;
  show(
    weather: Weather,
    x: number,
    z: number,
    seconds: number,
    scene: Scene,
  ): void;
}

const most = 1_800;
const box = 60;
const tall = 30;
// Each weather's flakes: how many, their size and colour, how fast they fall (metres a second, below zero to rise), how fast they blow
// sideways, how far the fog lets the eye see (metres; 0 leaves it alone), and the colour the sky and the distance turn, and how far.
const looks: Readonly<
  Record<
    Weather,
    readonly [
      count: number,
      size: number,
      colour: string,
      fall: number,
      drift: number,
      sight: number,
      tint: string,
      amount: number,
    ]
  >
> = {
  blizzard: [1_800, 0.36, "#f4f8ff", 3, 10, 70, "#e4e9f2", 0.75],
  clear: [0, 0.1, "#ffffff", 0, 0, 0, "#ffffff", 0],
  fog: [0, 0.1, "#ffffff", 0, 0, 45, "#c9cbd6", 0.8],
  gale: [600, 0.26, "#c08a4a", 0.6, 15, 0, "#9c8f74", 0.35],
  heat: [420, 0.16, "#ffcf8a", -0.7, 0.3, 0, "#ffb067", 0.45],
  snow: [1_200, 0.32, "#ffffff", 1.4, 0.6, 140, "#cfd6e2", 0.5],
  storm: [1_800, 0.14, "#b8d8ff", 24, 1.8, 120, "#3b4252", 0.7],
};
const tinted = new Color();
const wrap = (value: number, size: number): number =>
  ((value % size) + size) % size;

export function buildWeatherFx(): WeatherFx {
  const root = new Group();
  root.name = "weather";
  const spots = new Float32Array(most * 3);
  const geometry = new BufferGeometry();
  const where = new BufferAttribute(spots, 3);
  geometry.setAttribute("position", where);
  const material = new PointsMaterial({
    color: "#ffffff",
    depthWrite: false,
    opacity: 0.85,
    size: 0.2,
    transparent: true,
  });
  const flakes = new Points(geometry, material);
  flakes.name = "flakes";
  flakes.frustumCulled = false;
  // A flash for lightning, and a warm cast for a heatwave.
  const flash = new AmbientLight("#e8f0ff", 0);
  const warm = new AmbientLight("#ff9a3c", 0);
  root.add(flakes, flash, warm);
  return {
    root,
    show(weather, x, z, seconds, scene) {
      const [count, size, colour, fall, drift, sight, tint, amount] =
        looks[weather];
      flakes.visible = count > 0;
      material.size = size;
      material.color.set(colour);
      for (let at = 0; at < count; at += 1) {
        const sway = Math.sin(seconds * 1.3 + at) * 0.4;
        spots[at * 3] =
          x -
          box / 2 +
          wrap(hash(at, 1, 2) * box + drift * seconds + sway, box);
        spots[at * 3 + 1] = wrap(hash(at, 3, 4) * tall - fall * seconds, tall);
        spots[at * 3 + 2] =
          z - box / 2 + wrap(hash(at, 5, 6) * box + sway, box);
      }
      geometry.setDrawRange(0, count);
      where.needsUpdate = true;
      const beat = Math.floor(seconds / 3.1);
      const into = seconds - beat * 3.1;
      flash.intensity =
        weather === "storm" &&
        hash(beat, 7, 8) < 0.4 &&
        (into < 0.1 || (into > 0.2 && into < 0.27))
          ? 2.4
          : 0;
      warm.intensity = weather === "heat" ? 0.45 : 0;
      if (amount > 0 && scene.background instanceof Color) {
        scene.background.lerp(tinted.set(tint), amount);
        if (scene.fog instanceof Fog) scene.fog.color.copy(scene.background);
      }
      if (sight > 0 && scene.fog instanceof Fog) {
        scene.fog.near = Math.min(scene.fog.near, 2);
        scene.fog.far = Math.min(scene.fog.far, sight);
      }
    },
  };
}
