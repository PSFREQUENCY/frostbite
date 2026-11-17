import { paceOf } from "../rules/move.ts";
import type { DayState } from "../rules/types.ts";
import type { Actor } from "./actor.ts";
import type { Seat } from "./body.ts";
import type { Subject } from "./camera.ts";
import type { Way } from "./poses.ts";
import { seatsOf } from "./seats.ts";

// How the hero moves this frame: the clock and the frame's time (seconds), how high a jump has them (metres) and how far through it
// they are (-1 on the ground), and what they are doing on foot (`poses.ts`).
export interface Motion {
  readonly air: number;
  readonly dt: number;
  readonly hop: number;
  readonly seconds: number;
  readonly way: Way;
}

// How far each ride reaches out to either side (metres), so anyone running alongside keeps clear of it.
const halfWidth: Readonly<Record<string, number>> = {
  bike: 0.35,
  moto: 0.4,
  scooter: 0.3,
  semi: 1.25,
};

// The hero where the rules put them, facing their heading, and the crew a step behind on either side, all walking at the hero's pace.
// On a ride each takes a seat (`seats.ts`) and sits, pedals or stands as it says; whoever has no seat runs alongside. On foot the hero
// crouches, crawls, climbs, hangs, sits or jumps as they are doing, and the crew walk upright on the street, waiting below a hero up a
// wall.
export function placeCast(
  cast: readonly Actor[],
  state: DayState,
  at: Subject & { readonly ground?: number },
  { air, dt, hop, seconds, way }: Motion,
): Actor | undefined {
  const riding = state.ride !== "foot";
  const seats = state.ride === "foot" ? [] : seatsOf[state.ride];
  const going = state.dir >= 0 && state.talk === null ? paceOf(state) : 0;
  const { heading } = at;
  const across = 0.8 + (halfWidth[state.ride] ?? 1);
  // An actor at a point in the ride's own frame (x across, z forward), its feet at a height, moving at a pace and sitting as told; the
  // hero alone takes the way and the jump.
  const put = (
    actor: Actor,
    x: number,
    y: number,
    z: number,
    pace: number,
    seat: Seat,
    lead = false,
  ): void => {
    actor.root.visible = true;
    actor.root.position.set(
      at.x + Math.sin(heading) * x + Math.cos(heading) * z,
      y,
      at.z - Math.cos(heading) * x + Math.sin(heading) * z,
    );
    actor.root.rotation.set(0, Math.PI / 2 - heading, 0);
    actor.root.scale.setScalar(1);
    actor.seat(seat);
    actor.move(
      pace,
      seconds,
      dt,
      state.talk !== null,
      state.ended && state.cause === "beach",
      lead && seat === null ? way : "upright",
      lead && seat === null ? air : -1,
    );
    if (lead && seat === null) actor.root.position.y += hop;
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
  };
  const lead = cast[state.hero];
  if (lead !== undefined) {
    if (riding) board(lead, 0, -1);
    // On a WAGMI letter's top the hero sits on its front edge, legs over the face.
    else if (way === "sit") put(lead, 0, at.y - lead.hip(), 0.16, 0, "ledge");
    else put(lead, 0, at.y, 0, going, null, true);
  }
  // Up a wall the hero has climbed away from the crew, who stay on the ground (at the foot of the wall, a step back from it; under a
  // letter's seat, on the terrace in front of it).
  const up = way === "climb" || way === "hang" || way === "sit";
  const ground = up ? (at.ground ?? 0) : at.y;
  const back = !up ? -0.5 : way === "sit" ? 2.6 : -1.6;
  state.crew.forEach((hero, slot) => {
    const mate = cast[hero];
    if (mate === undefined) return;
    if (riding) board(mate, slot + 1, slot);
    else put(mate, slot === 0 ? 1.7 : -1.7, ground, back, going, null);
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
