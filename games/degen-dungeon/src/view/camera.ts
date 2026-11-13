import type { PerspectiveCamera } from "three";

// The camera, as poses to cut or glide between. While walking it rides behind the hero's shoulder and swings round behind them as they turn
// (a turn of more than a right angle, toward the camera, leaves it where it is), so what is in front of the hero is in front of the
// player. It comes in close in a narrow street or a shop and pulls back over a square, on a ride or at a run, and drops low with a crouch.
// When something matters it cuts in close: a face while an offer waits, hands when a spot is used. A new kind of shot is a new intent
// here; the scene only says which intent the moment calls for.
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
// What the camera knows of the place: how open it is round the hero (0 a narrow street, 1 a square), whether they are indoors, low (a
// crouch or a crawl), and how fast they go (0 to 1).
export interface Room {
  readonly indoors: boolean;
  readonly low: boolean;
  readonly open: number;
  readonly speed: number;
}

const closeUps: readonly Intent[] = ["hands", "talk"];
const anyRoom: Room = { indoors: false, low: false, open: 0.5, speed: 0 };
// The way the camera looks before the hero has turned it: north.
export const northward = -Math.PI / 2;

const mix = (from: number, to: number, part: number): number =>
  from + (to - from) * part;

export function poseFor(
  intent: Intent,
  { heading, x, y, z }: Subject,
  yaw = northward,
  room: Room = anyRoom,
): Pose {
  const ahead = Math.cos(heading);
  const aside = Math.sin(heading);
  const back = (far: number, high: number, lead: number, fov: number): Pose => {
    const fx = Math.cos(yaw);
    const fz = Math.sin(yaw);
    return {
      fov,
      // A little to the right of the hero, so they stand left of the middle and the way ahead is clear.
      from: [x - fx * far - fz * 0.6, y + high, z - fz * far + fx * 0.6],
      look: [x + fx * lead, y + (room.low ? 0.7 : 1.3), z + fz * lead],
    };
  };
  switch (intent) {
    case "follow": {
      if (room.indoors) return back(3.2, 1.9, 2, 58);
      const far = mix(4.4, 7.2, room.open) + room.speed * 1.4;
      const high = mix(2.2, 3.4, room.open) - (room.low ? 0.8 : 0);
      return back(far, high, 3, 52 + room.speed * 8);
    }
    case "hands":
      return {
        fov: 24,
        from: [
          x + ahead * 1.4 + aside * 0.55,
          y + 1.05,
          z + aside * 1.4 - ahead * 0.55,
        ],
        look: [x + ahead * 0.35, y + 0.85, z + aside * 0.35],
      };
    case "ride":
      return back(8.5 + room.speed * 2, 3.4, 6, 58 + room.speed * 6);
    case "sky":
      return back(18, 11, 8, 60);
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
// The turn from one angle to another, the short way round (-pi to pi).
export const turnTo = (from: number, to: number): number =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

export interface Rig {
  // Points the camera for this moment: a cut into or out of a close-up, a glide otherwise. `moving` lets it swing round behind the hero.
  aim(
    intent: Intent,
    subject: Subject,
    dt: number,
    moving?: boolean,
    room?: Room,
  ): void;
  apply(camera: PerspectiveCamera): void;
  cut(pose: Pose): void;
  // How open the ground is round a point (metres): the share of rays that run 14 metres without meeting a building.
  openness(x: number, z: number): number;
  pose(): Pose;
  // Puts the camera exactly at a pose (a clip's), keeping the way it looks for after.
  set(pose: Pose): void;
  // The way the camera looks, which the stick's "up" means (radians from east toward south).
  yaw(): number;
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
      y + (1 - part) * 3,
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
  let yaw = northward;
  return {
    aim(intent, subject, dt, moving = false, room = anyRoom) {
      const step = Math.max(0, dt);
      // The camera swings behind the hero while they go, unless they turned to face it.
      const turn = turnTo(yaw, subject.heading);
      if (moving && !closeUps.includes(intent) && Math.abs(turn) < 1.75)
        yaw += turn * (1 - Math.exp(-(intent === "follow" ? 1.8 : 2.6) * step));
      const want = closeUps.includes(intent)
        ? poseFor(intent, subject, yaw, room)
        : room.indoors
          ? poseFor(intent, subject, yaw, room)
          : pulledIn(poseFor(intent, subject, yaw, room), inside);
      const cuts =
        last === null ||
        (intent !== last &&
          (closeUps.includes(intent) || closeUps.includes(last)));
      last = intent;
      if (cuts) {
        now = want;
        return;
      }
      const part = 1 - Math.exp(-5 * step);
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
      yaw = northward;
    },
    openness(x, z) {
      let clear = 0;
      for (let ray = 0; ray < 8; ray += 1) {
        const angle = (ray * Math.PI) / 4;
        const far = [6, 10, 14].every(
          (reach) =>
            !inside(x + Math.cos(angle) * reach, z + Math.sin(angle) * reach),
        );
        if (far) clear += 1;
      }
      return clear / 8;
    },
    pose: () => now,
    set(pose) {
      now = pose;
    },
    yaw: () => yaw,
  };
}
