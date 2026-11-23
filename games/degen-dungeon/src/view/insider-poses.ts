import type { Plan } from "./insider-plans.ts";

// How the people inside the landmarks move (`insiders.ts` draws them): where each is along their ring or line just now, which way they
// face, and the swing of their arms and legs for what they are doing.
// Where someone is just now, which way they face, and how far through a stride they are (radians), from their plan and the clock.
export function placeOf(
  plan: Plan,
  seconds: number,
): {
  readonly face: number;
  readonly stride: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
} {
  const { doing, pace, phase } = plan;
  if (doing === "ring" || (doing === "skate" && plan.r > 0)) {
    const angle = phase + (pace * seconds) / Math.max(1, plan.r);
    return {
      face: Math.atan2(
        Math.cos(angle) * Math.sign(pace),
        -Math.sin(angle) * Math.sign(pace),
      ),
      stride: seconds * 6 * Math.abs(pace) + phase,
      x: plan.x + Math.sin(angle) * plan.r,
      y: plan.y,
      z: plan.z + Math.cos(angle) * plan.r,
    };
  }
  if (doing === "line" || doing === "ride" || doing === "skate") {
    const [tx, tz] = plan.to;
    const length = Math.max(1, Math.hypot(tx - plan.x, tz - plan.z));
    const run = (phase + (pace * seconds) / length) % 2;
    // Up and back along an aisle; an escalator only ever goes one way, and its riders start again at the bottom.
    const part = doing === "ride" ? run % 1 : run < 1 ? run : 2 - run;
    const back = doing !== "ride" && run >= 1;
    return {
      face: Math.atan2(
        (tx - plan.x) * (back ? -1 : 1),
        (tz - plan.z) * (back ? -1 : 1),
      ),
      stride: doing === "ride" ? 0 : seconds * 6 * pace + phase,
      x: plan.x + (tx - plan.x) * part,
      y: plan.y + plan.rise * part,
      z: plan.z + (tz - plan.z) * part,
    };
  }
  return { face: plan.face, stride: 0, x: plan.x, y: plan.y, z: plan.z };
}

// The limbs' swing (radians, forward is below zero) and spread for what someone is doing, and how far their body bobs and sinks.
export function poseOf(
  plan: Plan,
  stride: number,
  seconds: number,
): {
  readonly arms: readonly [number, number];
  readonly bob: number;
  readonly legs: readonly [number, number];
  readonly sink: number;
  readonly spread: number;
} {
  const t = seconds + plan.phase;
  switch (plan.doing) {
    case "ring":
    case "line": {
      const swing = Math.sin(stride) * 0.55;
      return {
        arms: [swing * 0.8, -swing * 0.8],
        bob: Math.abs(Math.cos(stride)) * 0.05,
        legs: [-swing, swing],
        sink: 0,
        spread: 0.08,
      };
    }
    case "skate":
      return {
        arms: [-0.2, 0.2],
        bob: 0,
        legs: [-0.25, 0.3],
        sink: 0.12,
        spread: 1.1,
      };
    case "trade":
      return {
        arms: [
          -2.5 + Math.sin(t * 8) * 0.45,
          -2.1 + Math.sin(t * 7 + 1) * 0.55,
        ],
        bob: Math.abs(Math.sin(t * 4)) * 0.08,
        legs: [0, 0],
        sink: 0,
        spread: 0.2,
      };
    case "dance":
      return {
        arms: [-2.6 + Math.sin(t * 6) * 0.6, -2.6 - Math.sin(t * 6) * 0.6],
        bob: Math.abs(Math.sin(t * 6)) * 0.18,
        legs: [Math.sin(t * 6) * 0.3, -Math.sin(t * 6) * 0.3],
        sink: 0,
        spread: 0.35,
      };
    case "sit":
      return {
        arms: [-0.5, -0.5],
        bob: 0,
        legs: [-1.5, -1.5],
        sink: 0.42,
        spread: 0.1,
      };
    case "ride":
      return {
        arms: [-0.3, -0.3],
        bob: 0,
        legs: [0, 0],
        sink: 0,
        spread: 0.12,
      };
    case "stand":
      return {
        arms: [Math.sin(t * 0.8) * 0.08, -0.25],
        bob: 0,
        legs: [0, 0],
        sink: 0,
        spread: 0.08,
      };
  }
}

// Whether someone who is only there for a while (a driver at a pump) is there just now.
export const there = (plan: Plan, seconds: number, period: number): boolean => {
  if (plan.when === undefined) return true;
  const now = ((seconds % period) + period) % period;
  const [from, to] = plan.when.map((at) => ((at % period) + period) % period);
  return from === undefined || to === undefined
    ? true
    : from <= to
      ? now >= from && now < to
      : now >= from || now < to;
};
