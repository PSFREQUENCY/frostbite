import { flies, type DayState } from "../rules/types.ts";
import { hash } from "./hash.ts";

// What the street's people do when the hero runs into them. Walked into, a person is shoved a step aside and staggers; a running hero
// knocks them down, and they sit on the pavement a moment and get back up. In front of a ride most hop out of the way in time, and the
// rest are knocked over, roll, and get back up. Nobody is hurt, and nothing here touches the rules: the street's people are only drawn.
export type BumpKind = "dodge" | "fall" | "shove";
export interface Bump {
  readonly at: number;
  readonly kind: BumpKind;
  // The way they go, a unit on the ground (x east, z south).
  readonly x: number;
  readonly z: number;
}
// The hero as the street sees them: where (metres), which way they face (radians: 0 east, a quarter turn south), and how they come.
export interface Mover {
  readonly heading: number;
  readonly riding: boolean;
  readonly running: boolean;
  readonly x: number;
  readonly z: number;
}
// The hero as the street's people feel them, which is only on the ground: not from a wall or a roof, the sky or the water.
export const moverOf = (
  state: Pick<DayState, "dir" | "gait" | "level" | "ride">,
  x: number,
  z: number,
  heading: number,
): Mover | null =>
  state.level > 0 || state.ride === "boat" || flies(state.ride)
    ? null
    : {
        heading,
        riding: state.ride !== "foot",
        running: state.gait === 1 && state.dir >= 0,
        x,
        z,
      };

// How a reaction moves a person off their path just now: along the ground, up, and how far they lean over (radians) the way they go.
export interface Push {
  readonly lean: number;
  readonly lift: number;
  readonly x: number;
  readonly z: number;
}

// How long each reaction lasts (seconds), and how near the hero must come: a body's width on foot, a bonnet's length on a ride.
export const lasts: Readonly<Record<BumpKind, number>> = {
  dodge: 1.4,
  fall: 2.8,
  shove: 1,
};
const touch = 0.7;
const bonnet = 2.6;

// A reaction for a person at (x, z) with the hero this near, or null while they are clear. `index` keeps each person's own luck.
export function bumpFor(
  mover: Mover,
  x: number,
  z: number,
  index: number,
  seconds: number,
): Bump | null {
  const east = x - mover.x;
  const south = z - mover.z;
  const gap = Math.hypot(east, south);
  if (gap > (mover.riding ? bonnet : touch)) return null;
  // From the hero outwards, or straight ahead when right on top of them; a dodge goes sideways, clear of the ride's path.
  const ahead = [Math.cos(mover.heading), Math.sin(mover.heading)] as const;
  const [wx, wz] = gap < 0.05 ? ahead : [east / gap, south / gap];
  if (!mover.riding)
    return {
      at: seconds,
      kind: mover.running ? "fall" : "shove",
      x: wx,
      z: wz,
    };
  if (hash(index, 5, 11) >= 0.7)
    return { at: seconds, kind: "fall", x: wx, z: wz };
  const side = ahead[0] * south - ahead[1] * east >= 0 ? 1 : -1;
  return {
    at: seconds,
    kind: "dodge",
    x: -ahead[1] * side,
    z: ahead[0] * side,
  };
}

const ease = (t: number): number => 1 - (1 - t) * (1 - t);
// Out over `go` seconds, back over the reaction's last `back`.
const outAndBack = (
  t: number,
  go: number,
  back: number,
  end: number,
): number =>
  t < go ? ease(t / go) : t > end - back ? Math.max(0, (end - t) / back) : 1;

// Where a reaction puts a person `seconds` in, or null once it is over.
export function pushOf(bump: Bump, seconds: number): Push | null {
  const t = seconds - bump.at;
  const end = lasts[bump.kind];
  if (t < 0 || t >= end) return null;
  if (bump.kind === "shove") {
    const out = outAndBack(t, 0.2, 0.6, end) * 0.55;
    const sway = Math.sin(t * 14) * Math.max(0, 1 - t) * 0.25;
    return {
      lean: 0.3 * outAndBack(t, 0.15, 0.7, end) + sway,
      lift: 0,
      x: bump.x * out,
      z: bump.z * out,
    };
  }
  if (bump.kind === "dodge") {
    const out = outAndBack(t, 0.35, 0.7, end) * 1.9;
    return {
      lean: -0.25 * outAndBack(t, 0.2, 0.9, end),
      lift: t < 0.4 ? Math.sin((t / 0.4) * Math.PI) * 0.45 : 0,
      x: bump.x * out,
      z: bump.z * out,
    };
  }
  // Over, a roll along the ground, a moment sitting there, and up again.
  const out = outAndBack(t, 0.45, 0.9, end) * 1.6;
  const down =
    t < 0.3
      ? ease(t / 0.3)
      : t > 1.8
        ? Math.max(0, (end - t) / (end - 1.8))
        : 1;
  return {
    lean: (Math.PI / 2 - 0.1) * down,
    lift: 0,
    x: bump.x * out,
    z: bump.z * out,
  };
}

// Where a person of the street is drawn, bumped or not: off their path, lifted, and tipped the way they were pushed.
export interface Placed {
  readonly lift: number;
  readonly tip: {
    readonly lean: number;
    readonly x: number;
    readonly z: number;
  } | null;
  readonly x: number;
  readonly z: number;
}

// Each of `people` with their own reaction to the hero and a moment's calm after it, so one bump is not followed at once by another.
// The answer places a person whose path has them at (x, z) just now.
export function createBumps(
  people: number,
): (
  index: number,
  x: number,
  z: number,
  seconds: number,
  hero: Mover | null,
) => Placed {
  const bumps: (Bump | null)[] = Array.from({ length: people }, () => null);
  const calm = Array.from({ length: people }, () => 0);
  return (index, x, z, seconds, hero) => {
    const was = bumps[index] ?? null;
    let bump = was === null || seconds - was.at >= lasts[was.kind] ? null : was;
    if (bump === null && hero !== null && seconds >= (calm[index] ?? 0))
      bump = bumpFor(hero, x, z, index, seconds);
    if (bump !== null && bump !== was)
      calm[index] = seconds + lasts[bump.kind] + 0.4;
    bumps[index] = bump;
    const push = bump === null ? null : pushOf(bump, seconds);
    if (bump === null || push === null) return { lift: 0, tip: null, x, z };
    return {
      lift: push.lift,
      tip: { lean: push.lean, x: bump.x, z: bump.z },
      x: x + push.x,
      z: z + push.z,
    };
  };
}
