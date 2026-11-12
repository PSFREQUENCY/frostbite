import { attachKeys, standardKeys } from "@frostbite/game-sdk/controls";
import { attachZones, type Where } from "@frostbite/game-sdk/touch-zones";

// What the player's hands can do. Keys: arrows or WASD walk (eight ways), Space or E acts and says yes, X or Escape says no, R and F take
// a helicopter up and down, Enter starts, P pauses; before a day, left and right turn the hero ring. Fingers: before a day a tap on
// either side turns the ring and a tap in the middle starts; during one the left of the screen is a stick (sixteen ways) and a tap on the
// right acts, or answers yes on the right and no on the left while an offer waits.
export interface Hands {
  readonly act: () => void;
  readonly lift: (by: number) => void;
  readonly move: (dir: number) => void;
  readonly no: () => void;
  readonly pause: () => void;
  readonly start: () => void;
  // A tap in the middle of the waiting screen, which is Enter's start for a finger.
  readonly tapStart: () => void;
  readonly turn: (by: number) => void;
}
// Whether a day is being played, and whether an offer is waiting in it.
export type Mode = "asked" | "playing" | "waiting";
export type Zone = number | "act" | "next" | "no" | "prev" | "start";

const keys = {
  ...standardKeys,
  ArrowDown: "south",
  ArrowLeft: "west",
  ArrowRight: "east",
  ArrowUp: "north",
  Escape: "no",
  KeyA: "west",
  KeyD: "east",
  KeyE: "act",
  KeyF: "fall",
  KeyR: "rise",
  KeyS: "south",
  KeyW: "north",
  KeyX: "no",
  Space: "act",
} as const;

// The heading for a pair of -1, 0 or 1 (east and south are 1), or -1 for none.
export const headingOf = (east: number, south: number): number =>
  east === 0 && south === 0
    ? -1
    : (Math.round(Math.atan2(south, east) / (Math.PI / 8)) + 16) % 16;

// The stick sits in the lower left of the screen. A finger away from its middle steers that way; on its middle it steers nowhere.
const stick = { x: 0.22, y: 0.62 };
export function steer(where: Where): number | null {
  const east = (where.x - stick.x) * 16;
  const south = (where.y - stick.y) * 9;
  if (Math.hypot(east, south) < 0.5) return null;
  return (Math.round(Math.atan2(south, east) / (Math.PI / 8)) + 16) % 16;
}

export function zoneAt(mode: Mode, where: Where): Zone | null {
  if (mode === "waiting")
    return where.x < 0.25 ? "prev" : where.x > 0.75 ? "next" : "start";
  if (mode === "asked") return where.x < 0.5 ? "no" : "act";
  return where.x < 0.5 ? steer(where) : "act";
}

// What a finger does on entering a zone: a heading is held, a side turns the ring, and the rest are the hands' own names.
export function enterZone(hands: Hands, zone: Zone): void {
  if (typeof zone === "number") hands.move(zone);
  else if (zone === "prev") hands.turn(-1);
  else if (zone === "next") hands.turn(1);
  else if (zone === "start") hands.tapStart();
  else hands[zone]();
}

export function attachControls(
  screen: HTMLElement,
  hands: Hands,
  mode: () => Mode,
): () => void {
  const held = new Set<string>();
  const walk = (): void => {
    const east = (held.has("east") ? 1 : 0) - (held.has("west") ? 1 : 0);
    const south = (held.has("south") ? 1 : 0) - (held.has("north") ? 1 : 0);
    hands.move(headingOf(east, south));
  };
  const stopKeys = attachKeys(window, keys, (action, phase) => {
    if (
      action === "north" ||
      action === "south" ||
      action === "east" ||
      action === "west"
    ) {
      if (phase === "down") held.add(action);
      else held.delete(action);
      if (mode() !== "waiting") walk();
      else if (phase === "down" && action === "east") hands.turn(1);
      else if (phase === "down" && action === "west") hands.turn(-1);
      return;
    }
    if (phase !== "down") return;
    if (action === "rise") hands.lift(1);
    else if (action === "fall") hands.lift(-1);
    else hands[action]();
  });
  const stopZones = attachZones<Zone>(screen, {
    enter: (zone) => {
      enterZone(hands, zone);
    },
    fingersOnly: true,
    leave: (zone) => {
      if (typeof zone === "number") hands.move(-1);
    },
    slide: true,
    zoneAt: (where) => zoneAt(mode(), where),
  });
  return () => {
    stopKeys();
    stopZones();
  };
}
