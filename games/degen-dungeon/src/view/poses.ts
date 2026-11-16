// How a body on foot holds every joint, by what it is doing: upright (standing, walking or running, by its pace), crouched low with bent
// knees, crawling on hands and knees, climbing a wall hand over hand, or hanging on one; a jump tucks the legs and throws the arms up.
// Angles are radians in the code-built body's own sense (`body.ts`): a leg or an arm turned negative swings forward, a knee bends
// positive and an elbow negative, the spine leans forward positive, and the neck looks down positive. The models bend their bones by the
// same numbers (`models/bend.ts`).
export type Way = "climb" | "crawl" | "crouch" | "hang" | "upright";

export interface Leg {
  readonly hip: number;
  readonly knee: number;
  readonly spread: number;
}
export interface Arm {
  readonly elbow: number;
  readonly out: number;
  readonly shoulder: number;
}
export interface Pose {
  readonly arms: readonly [Arm, Arm];
  readonly legs: readonly [Leg, Leg];
  readonly lean: number;
  readonly neck: number;
  // Whether the body stands on its legs (its hips then sit as high as its lowest leg reaches) or hangs from its hands, or is in the air.
  readonly planted: boolean;
  readonly twist: number;
}

// The way a gait shows, on a wall or not: 2 crouches and 3 crawls; up a wall the body climbs while it is moving and hangs while it is not.
export const wayOf = (
  gait: number,
  wall: "climbing" | "hanging" | null,
): Way =>
  wall === "climbing"
    ? "climb"
    : wall === "hanging"
      ? "hang"
      : gait === 2
        ? "crouch"
        : gait === 3
          ? "crawl"
          : "upright";

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));
const both = <T>(make: (side: number) => T): readonly [T, T] => [
  make(0),
  make(1),
];
// A beat of a stride for one side: the other side is half a beat on.
const beat = (step: number, side: number): number =>
  Math.sin(step + side * Math.PI);

function upright(pace: number, seconds: number): Pose {
  const moving = clamp(pace / 12, 0, 1);
  const running = clamp((pace - 15) / 6, 0, 1);
  const step = seconds * (4 + pace * 0.35);
  const reach = (0.6 + 0.25 * running) * moving;
  const lean = 0.08 * moving + 0.22 * running;
  return {
    arms: both((side) => ({
      elbow: -0.25 - 0.35 * moving - 1.0 * running,
      out: 0.08 + 0.03 * Math.sin(seconds * 1.3),
      shoulder:
        beat(step, side) * reach * (0.8 + 0.2 * running) - 0.15 * running,
    })),
    legs: both((side) => ({
      hip: -beat(step, side) * reach,
      knee:
        0.05 +
        Math.max(0, beat(step + Math.PI / 2, side)) *
          (0.9 + 0.7 * running) *
          moving,
      spread: 0,
    })),
    lean,
    neck: -lean * 0.5 + (moving === 0 ? Math.sin(seconds * 0.4) * 0.05 : 0),
    planted: true,
    twist: Math.sin(step) * reach * 0.2,
  };
}

function crouch(pace: number, seconds: number): Pose {
  const moving = clamp(pace / 7, 0, 1);
  const step = seconds * (3 + pace * 0.45);
  const reach = 0.3 * moving;
  return {
    arms: both((side) => ({
      elbow: -1.05,
      out: 0.18,
      shoulder: -0.55 + beat(step, side) * reach * 0.6,
    })),
    legs: both((side) => ({
      hip: -0.95 - beat(step, side) * reach,
      knee: 1.55 + Math.max(0, beat(step + Math.PI / 2, side)) * 0.45 * moving,
      spread: 0.12,
    })),
    lean: 0.45,
    neck: -0.4,
    planted: true,
    twist: Math.sin(step) * reach * 0.15,
  };
}

// On hands and knees: the back flat, the thighs hanging under the hips, the shins along the ground, and the arms straight down from the
// shoulders, a hand and the opposite knee going forward together.
function crawl(pace: number, seconds: number): Pose {
  const moving = clamp(pace / 4, 0, 1);
  const step = seconds * (3 + pace * 0.7);
  const reach = 0.3 * moving;
  const lean = 1.25 + Math.sin(step * 2) * 0.03 * moving;
  return {
    arms: both((side) => ({
      elbow: -0.15 - Math.max(0, beat(step, side)) * 0.35 * moving,
      out: 0.1,
      shoulder: -lean - beat(step, side) * reach,
    })),
    legs: both((side) => ({
      hip: 0.12 + beat(step, side) * reach,
      knee: 1.6 + Math.max(0, -beat(step, side)) * 0.2 * moving,
      spread: 0.1,
    })),
    lean,
    neck: -1.05,
    planted: true,
    twist: Math.sin(step) * reach * 0.25,
  };
}

// Up a wall: a hand reaches high and straight while the other pulls down with its elbow bent, and the foot under the reaching hand's
// other side steps up with it.
function climb(seconds: number): Pose {
  const step = seconds * 5;
  return {
    arms: both((side) => ({
      elbow: -0.3 - Math.max(0, beat(step, side)) * 0.9,
      out: 0.28,
      shoulder: -2.75 + beat(step, side) * 0.35,
    })),
    legs: both((side) => ({
      hip: -0.75 - Math.max(0, beat(step, side)) * 0.6,
      knee: 0.9 + Math.max(0, beat(step, side)) * 0.7,
      spread: 0.16,
    })),
    lean: 0.08,
    neck: -0.4,
    planted: false,
    twist: 0,
  };
}

function hang(seconds: number): Pose {
  const sway = Math.sin(seconds * 1.4) * 0.05;
  return {
    arms: both((side) => ({
      elbow: -0.45,
      out: 0.3,
      shoulder: -2.7 + (side === 0 ? sway : -sway),
    })),
    legs: both((side) => ({
      hip: side === 0 ? -0.55 : -0.2,
      knee: side === 0 ? 0.95 : 0.45,
      spread: 0.16,
    })),
    lean: 0.05,
    neck: -0.25,
    planted: false,
    twist: sway,
  };
}

// A jump's tuck at a share of its flight (0 to 1): knees up and arms high at the top, and back to the ground pose at either end.
function airborne(pose: Pose, air: number): Pose {
  const high = Math.sin(Math.PI * clamp(air, 0, 1));
  const mix = (from: number, to: number): number => from + (to - from) * high;
  return {
    arms: both((side) => {
      const arm = pose.arms[side] ?? pose.arms[0];
      return {
        elbow: mix(arm.elbow, -0.35),
        out: mix(arm.out, 0.35),
        shoulder: mix(arm.shoulder, -2.3),
      };
    }),
    legs: both((side) => {
      const leg = pose.legs[side] ?? pose.legs[0];
      return {
        hip: mix(leg.hip, side === 0 ? -0.9 : -0.55),
        knee: mix(leg.knee, side === 0 ? 1.5 : 1.1),
        spread: mix(leg.spread, 0.08),
      };
    }),
    lean: mix(pose.lean, 0.05),
    neck: mix(pose.neck, -0.15),
    planted: false,
    twist: pose.twist * (1 - high),
  };
}

// The pose for a way, a pace (centimetres a tick), the clock (seconds) and a jump's share of its flight (-1 on the ground).
export function poseFor(
  way: Way,
  pace: number,
  seconds: number,
  air = -1,
): Pose {
  const ground =
    way === "crouch"
      ? crouch(pace, seconds)
      : way === "crawl"
        ? crawl(pace, seconds)
        : way === "climb"
          ? climb(seconds)
          : way === "hang"
            ? hang(seconds)
            : upright(pace, seconds);
  return air < 0 || way === "climb" || way === "hang"
    ? ground
    : airborne(ground, air);
}

// How far below the hip a leg reaches (body units) for its thigh and shin lengths and the shin's thickness: the knee or the sole,
// whichever is lower, so a kneeling body rests on its knees.
export function legReach(
  leg: Leg,
  thigh: number,
  shin: number,
  thickness: number,
): number {
  const knee = thigh * Math.cos(leg.hip);
  return Math.max(knee + thickness, knee + shin * Math.cos(leg.hip + leg.knee));
}
