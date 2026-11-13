import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  SphereGeometry,
  type Scene,
} from "three";

import { box, hash } from "./hash.ts";

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
  // The story day's mood, the clock (seconds), where the hero is (metres), and the time of day: `sun` from 0 (morning) to 1 (dusk), and
  // `dark` from 0 (day) to 1 (night). The sun crosses the sky from east to west and the moon rises after it; the stars come out.
  set(
    scene: Scene,
    day: number,
    beach: boolean,
    seconds: number,
    x: number,
    z: number,
    sun?: number,
    dark?: number,
    space?: boolean,
  ): void;
  readonly root: Group;
}
const nightSky = new Color("#0b1030");
const moonlight = new Color("#9fb8ff");

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
  const disc = (colour: string, size: number): Mesh => {
    const made = new Mesh(
      new SphereGeometry(size, 20, 14),
      new MeshBasicMaterial({ color: colour, fog: false }),
    );
    made.name = colour === "#fff3c4" ? "sun-disc" : "moon-disc";
    return made;
  };
  const sunDisc = disc("#fff3c4", 16);
  const moonDisc = disc("#e8eeff", 10);
  const starAt: number[] = [];
  for (let index = 0; index < 700; index += 1) {
    const angle = hash(index, 3, 1) * Math.PI * 2;
    const rise = 0.15 + hash(index, 4, 1) * 0.85;
    starAt.push(
      Math.cos(angle) * Math.cos(rise) * 480,
      Math.sin(rise) * 480,
      Math.sin(angle) * Math.cos(rise) * 480,
    );
  }
  const starField = new BufferGeometry();
  starField.setAttribute("position", new Float32BufferAttribute(starAt, 3));
  const stars = new Points(
    starField,
    new PointsMaterial({
      color: "#ffffff",
      fog: false,
      opacity: 0,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
    }),
  );
  stars.name = "stars";
  root.add(
    hemisphere,
    ambient,
    sun,
    sun.target,
    flakes,
    sunDisc,
    moonDisc,
    stars,
  );
  let shown = "";
  let mood: Mood = sunrise;
  const sky = new Color();
  return {
    root,
    set(
      scene,
      day,
      beach,
      seconds,
      x,
      z,
      along = 0.3,
      dark = 0,
      space = false,
    ) {
      const key = `${String(day)}${String(beach)}`;
      if (key !== shown) {
        shown = key;
        mood = beach ? sunrise : (moods[day - 1] ?? moods[0] ?? sunrise);
        scene.fog = new Fog(mood.sky, 40, mood.fog);
        hemisphere.groundColor.set(mood.ground);
        const ground = scene.getObjectByName("ground");
        if (
          ground instanceof Mesh &&
          ground.material instanceof MeshToonMaterial
        )
          ground.material.color
            .set("#ffffff")
            .lerp(new Color(mood.ground), 0.25);
      }
      const night = beach ? 0 : space ? 1 : dark;
      sky.set(mood.sky).lerp(nightSky, night);
      if (space) sky.set("#000000");
      scene.background = sky;
      if (scene.fog instanceof Fog) {
        scene.fog.color.copy(sky);
        scene.fog.near = space ? 600 : 40;
        scene.fog.far = space ? 4_000 : mood.fog;
      }
      hemisphere.color.copy(sky);
      hemisphere.intensity = 2.5 - night * 1.7;
      ambient.intensity = 0.95 - night * 0.55;
      // The sun from east to west through the day; the moon after dark.
      const arc = night > 0.5 ? 0.2 + night * 0.4 : 0.12 + along * 0.8;
      const [dx, dy, dz] = [
        Math.cos(arc * Math.PI),
        Math.sin(arc * Math.PI),
        0.35,
      ];
      sun.position.set(180 + dx * 300, 40 + dy * 260, 180 + dz * 300);
      sun.color.set(mood.key).lerp(moonlight, night);
      sun.intensity =
        mood.power * 1.5 * (1 - night * 0.75) * (0.55 + dy * 0.45);
      sunDisc.visible = night < 0.5;
      moonDisc.visible = night >= 0.5;
      (night < 0.5 ? sunDisc : moonDisc).position.set(
        x + dx * 450,
        dy * 380 + 20,
        z + dz * 450,
      );
      stars.position.set(x, 0, z);
      stars.visible = night > 0.05;
      stars.material.opacity = night;
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
