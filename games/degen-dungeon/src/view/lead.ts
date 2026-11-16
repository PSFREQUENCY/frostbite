import { paceOf } from "../rules/move.ts";
import type { DayState } from "../rules/types.ts";
import type { Actor } from "./actor.ts";
import type { Seat } from "./body.ts";
import type { Subject } from "./camera.ts";
import { seatsOf } from "./seats.ts";

// How a body carries itself on foot, on top of its walk: crouched low (2), flat out crawling (3), or up in the air for a jump. A jump is
// only a hop on the screen; the rules never hear of it.
export function stance(
  actor: Actor,
  gait: number,
  riding: boolean,
  hop: number,
): void {
  const root = actor.root;
  root.rotation.order = "YXZ";
  const low = !riding && gait === 2;
  const flat = !riding && gait === 3;
  root.scale.set(1, low ? 0.7 : 1, 1);
  root.rotation.x = flat ? 1.42 : 0;
  root.position.y += (flat ? 0.3 : 0) + (riding ? 0 : hop);
}

// How high a jump is (metres) a time after it began (seconds): up and down in a little over half a second.
export const jumpLength = 0.6;
export const hopAt = (since: number): number =>
  since < 0 || since > jumpLength
    ? 0
    : 3.4 * (since / jumpLength) * (1 - since / jumpLength);

// How far each ride reaches out to either side (metres), so anyone running alongside keeps clear of it.
const halfWidth: Readonly<Record<string, number>> = {
  bike: 0.35,
  moto: 0.4,
  scooter: 0.3,
  semi: 1.25,
};

// The hero where the rules put them, facing their heading, and the crew a step behind on either side, all walking at the hero's pace.
// On a ride each takes a seat (`seats.ts`) and sits, pedals or stands as it says; whoever has no seat runs alongside. On foot the hero
// carries their stance and their hop; the crew walk upright.
export function placeCast(
  cast: readonly Actor[],
  state: DayState,
  at: Subject,
  seconds: number,
  dt: number,
  hop: number,
): Actor | undefined {
  const riding = state.ride !== "foot";
  const seats = state.ride === "foot" ? [] : seatsOf[state.ride];
  const going = state.dir >= 0 && state.talk === null ? paceOf(state) : 0;
  const { heading } = at;
  const across = 0.8 + (halfWidth[state.ride] ?? 1);
  // An actor at a point in the ride's own frame (x across, z forward), its feet at a height, moving at a pace and sitting as told.
  const put = (
    actor: Actor,
    x: number,
    y: number,
    z: number,
    pace: number,
    seat: Seat,
  ): void => {
    actor.root.visible = true;
    actor.root.position.set(
      at.x + Math.sin(heading) * x + Math.cos(heading) * z,
      y,
      at.z - Math.cos(heading) * x + Math.sin(heading) * z,
    );
    actor.root.rotation.y = Math.PI / 2 - heading;
    actor.seat(seat);
    actor.move(
      pace,
      seconds,
      dt,
      state.talk !== null,
      state.ended && state.cause === "beach",
    );
  };
  // Someone in a seat, or standing on board a boat or a helicopter, or (with no seat left) running beside the ride.
  const board = (actor: Actor, slot: number, crew: number): void => {
    const place = seats[slot];
    if (place !== undefined) {
      const feet = place.seat === "deck" ? place.y : place.y - actor.hip();
      put(actor, place.x, at.y + feet, place.z, going, place.seat);
    } else if (seats.length === 0)
      put(
        actor,
        crew < 0 ? 0 : crew === 0 ? 1.7 : -1.7,
        at.y + 0.7,
        crew < 0 ? 0 : -0.5,
        0,
        null,
      );
    else
      put(
        actor,
        crew % 2 === 0 ? across : -across,
        at.y,
        -0.6 - Math.floor(crew / 2) * 1.3,
        going,
        null,
      );
    stance(actor, 0, true, 0);
  };
  const lead = cast[state.hero];
  if (lead !== undefined) {
    if (riding) board(lead, 0, -1);
    else {
      put(lead, 0, at.y, 0, going, null);
      stance(lead, state.gait, false, hop);
    }
  }
  state.crew.forEach((hero, slot) => {
    const mate = cast[hero];
    if (mate === undefined) return;
    if (riding) board(mate, slot + 1, slot);
    else {
      put(mate, slot === 0 ? 1.7 : -1.7, at.y, -0.5, going, null);
      stance(mate, 0, false, 0);
    }
  });
  return lead;
}

// The cast as it is drawn: a hero wearing a statue's mask is that statue come to life.
export const castFor = (
  cast: readonly Actor[],
  forms: readonly Actor[],
  state: Pick<DayState, "form" | "hero">,
): readonly Actor[] =>
  state.form < 0
    ? cast
    : cast.map((actor, hero) =>
        hero === state.hero ? (forms[state.form] ?? actor) : actor,
      );
