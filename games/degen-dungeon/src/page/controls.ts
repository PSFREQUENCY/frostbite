import { attachKeys, standardKeys } from "@frostbite/game-sdk/controls";
import { attachZones, type Where } from "@frostbite/game-sdk/touch-zones";

import { attachRingTouch } from "./ring-touch.ts";
import { attachStick } from "./stick.ts";

// What the player's hands can do. Keys: arrows or WASD walk (eight ways, by the screen: up is the way the camera looks), Shift held runs,
// C crouches and Z crawls (each again to stand), Space jumps (or gives the first answer while one waits), E acts and says yes, X or Escape
// says no, 1 to 5 pick an answer, B or I opens the backpack, V is frost vision, G fires the freeze ray, R and F climb (or take a
// helicopter) up and down, Enter starts, P pauses; before a day, left and right turn the hero ring. Fingers: before a day a swipe or a tap on either side turns the ring and a tap
// in the middle starts (`ring-touch.ts`); during one a thumb anywhere on the left of the screen is a stick (`stick.ts`, sixteen ways)
// and a tap on the right acts, or answers yes on the right and no on the left while an offer waits. The buttons do the rest.
export interface Hands {
  readonly act: () => void;
  readonly answer: (choice: number) => void;
  readonly bag: () => void;
  // A way of moving: Shift gives `held` (true while down); a key or button without it switches the way on, or back to walking.
  readonly gait: (mode: number, held?: boolean) => void;
  readonly jump: () => void;
  readonly look: () => void;
  readonly lift: (by: number) => void;
  // The freeze ray's trigger (for a statue come to life holding it).
  readonly shoot: () => void;
  // A heading by the screen (0 right, 4 down, 8 left, 12 up), or -1 to stand.
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
export type Zone = "act" | "no";

const keys = {
  ...standardKeys,
  ArrowDown: "south",
  ArrowLeft: "west",
  ArrowRight: "east",
  ArrowUp: "north",
  Escape: "no",
  KeyA: "west",
  KeyB: "bag",
  KeyC: "crouch",
  KeyD: "east",
  KeyE: "act",
  KeyF: "fall",
  KeyG: "shoot",
  KeyI: "bag",
  KeyR: "rise",
  KeyS: "south",
  Digit1: "answer0",
  Digit2: "answer1",
  Digit3: "answer2",
  Digit4: "answer3",
  Digit5: "answer4",
  KeyV: "look",
  KeyW: "north",
  KeyX: "no",
  KeyZ: "crawl",
  ShiftLeft: "run",
  ShiftRight: "run",
  Space: "jump",
} as const;

// The heading for a pair of -1, 0 or 1 (east and south are 1), or -1 for none.
export const headingOf = (east: number, south: number): number =>
  east === 0 && south === 0
    ? -1
    : (Math.round(Math.atan2(south, east) / (Math.PI / 8)) + 16) % 16;

// The screen's zones once a day is on: no and yes while an offer waits, and otherwise an act on the right. Before a day the ring's own
// touch takes every finger, and during one the stick takes the left half, each before the zones see it.
export function zoneAt(mode: Mode, where: Where): Zone | null {
  if (mode === "waiting") return null;
  if (mode === "asked") return where.x < 0.5 ? "no" : "act";
  return where.x < 0.5 ? null : "act";
}

// What a finger does on entering a zone: the zones are the hands' own names.
export function enterZone(hands: Hands, zone: Zone): void {
  hands[zone]();
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
    if (action === "run") {
      hands.gait(1, phase === "down");
      return;
    }
    if (phase !== "down") return;
    if (action === "rise") hands.lift(1);
    else if (action === "fall") hands.lift(-1);
    else if (action === "crouch" || action === "crawl")
      hands.gait(action === "crouch" ? 2 : 3);
    else if (action.startsWith("answer")) hands.answer(Number(action.slice(6)));
    else if (
      action === "act" ||
      action === "bag" ||
      action === "jump" ||
      action === "look" ||
      action === "no" ||
      action === "pause" ||
      action === "shoot" ||
      action === "start"
    )
      hands[action]();
  });
  // The ring's touch and the stick listen first, so a finger either takes never reaches the zones.
  const stopRing = attachRingTouch(screen, {
    start: hands.tapStart,
    turn: hands.turn,
    waiting: () => mode() === "waiting",
  });
  const stopStick = attachStick(screen, {
    move: hands.move,
    ring: document.querySelector<HTMLElement>("#stick"),
    steering: () => mode() === "playing",
  });
  const stopZones = attachZones<Zone>(screen, {
    enter: (zone) => enterZone(hands, zone),
    fingersOnly: true,
    leave: () => undefined,
    slide: true,
    zoneAt: (where) => zoneAt(mode(), where),
  });
  return () => {
    stopKeys();
    stopRing();
    stopStick();
    stopZones();
  };
}
