import type { PerspectiveCamera } from "three";

// The camera, as poses to cut or glide between. While walking it follows from the south and above, so up on the stick is always north.
// When something matters it cuts in close, the way the plan's shot list says: a face while an offer waits, hands when a spot is used.
// A new kind of shot is a new intent here; the scene only says which intent the moment calls for.
export type Vec = readonly [number, number, number];
export interface Pose {
  readonly fov: number;
  readonly from: Vec;
  readonly look: Vec;
}
export type Intent = "follow" | "hands" | "ride" | "sky" | "talk";
// Who the camera is on: where they stand (metres) and the way they face (radians from east toward south).
export interface Subject {
  readonly heading: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const closeUps: readonly Intent[] = ["hands", "talk"];

export function poseFor(intent: Intent, { heading, x, y, z }: Subject): Pose {
  const ahead = Math.cos(heading);
  const aside = Math.sin(heading);
  switch (intent) {
    case "follow":
      return {
        fov: 50,
        from: [x, y + 6.5, z + 9],
        look: [x, y + 1.2, z - 1.5],
      };
    case "hands":
      return {
        fov: 26,
        from: [
          x + ahead * 1.6 + aside * 0.5,
          y + 1.1,
          z + aside * 1.6 - ahead * 0.5,
        ],
        look: [x + ahead * 0.3, y + 0.8, z + aside * 0.3],
      };
    case "ride":
      return { fov: 55, from: [x, y + 9, z + 13], look: [x, y + 1, z - 3] };
    case "sky":
      return { fov: 60, from: [x, y + 16, z + 18], look: [x, y, z - 4] };
    case "talk":
      return {
        fov: 30,
        from: [
          x + ahead * 2.6 - aside * 0.9,
          y + 1.5,
          z + aside * 2.6 + ahead * 0.9,
        ],
        look: [x, y + 1.3, z],
      };
  }
}

const blend = (from: Vec, to: Vec, part: number): Vec => [
  from[0] + (to[0] - from[0]) * part,
  from[1] + (to[1] - from[1]) * part,
  from[2] + (to[2] - from[2]) * part,
];

export interface Rig {
  // Points the camera for this moment: a cut into or out of a close-up, a glide otherwise.
  aim(intent: Intent, subject: Subject, dt: number): void;
  apply(camera: PerspectiveCamera): void;
  cut(pose: Pose): void;
  pose(): Pose;
}

// A camera that would stand inside a building is pulled in toward the subject until it is over open ground, and lifted as it comes in,
// so the subject stays in view. `inside` says whether a ground point (metres) is inside a building.
export function pulledIn(
  pose: Pose,
  inside: (x: number, z: number) => boolean,
): Pose {
  const [x, y, z] = pose.from;
  const [lx, , lz] = pose.look;
  for (let part = 1; part > 0.05; part -= 0.05) {
    const at: Vec = [
      lx + (x - lx) * part,
      y + (1 - part) * 6,
      lz + (z - lz) * part,
    ];
    if (!inside(at[0], at[2])) return part === 1 ? pose : { ...pose, from: at };
  }
  return pose;
}

export function createRig(
  inside: (x: number, z: number) => boolean = () => false,
): Rig {
  let now: Pose = { fov: 50, from: [0, 10, 10], look: [0, 0, 0] };
  let last: Intent | null = null;
  return {
    aim(intent, subject, dt) {
      const want = closeUps.includes(intent)
        ? poseFor(intent, subject)
        : pulledIn(poseFor(intent, subject), inside);
      const cuts =
        last === null ||
        (intent !== last &&
          (closeUps.includes(intent) || closeUps.includes(last)));
      last = intent;
      if (cuts) {
        now = want;
        return;
      }
      const part = 1 - Math.exp(-6 * Math.max(0, dt));
      now = {
        fov: now.fov + (want.fov - now.fov) * part,
        from: blend(now.from, want.from, part),
        look: blend(now.look, want.look, part),
      };
    },
    apply(camera) {
      camera.position.set(...now.from);
      camera.fov = now.fov;
      camera.lookAt(...now.look);
      camera.updateProjectionMatrix();
    },
    cut(pose) {
      now = pose;
      last = null;
    },
    pose: () => now,
  };
}
