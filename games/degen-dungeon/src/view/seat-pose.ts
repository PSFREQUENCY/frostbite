// How a body rides: astride a saddle pedalling (a bike), astride with its feet up on pegs (a motorbike), in a seat with its knees bent
// (inside a car, minivan, pickup or cab), or standing on a deck with a hand on the bar (a scooter); low on a skateboard, knees bent and
// arms out for balance; or sitting on a ledge, legs dangling over the edge and hands resting beside the hips (a WAGMI letter's top).
export type Seat =
  "board" | "deck" | "ledge" | "pedal" | "saddle" | "seat" | null;

// The joint angles (radians) of a ride's pose: hip, knee and a spread for each leg; shoulder and elbow for the arms; the lean forward.
// A pedalling body turns its legs round a crank, opposite each other; legs dangling from a ledge swing a little.
const seated: Readonly<
  Record<
    Exclude<Seat, null>,
    readonly [number, number, number, number, number, number]
  >
> = {
  // elbow, hip, knee, lean, shoulder, spread
  board: [-0.6, -0.55, 0.95, 0.22, -0.35, 0.2],
  deck: [-0.45, -0.2, 0.3, 0.12, -0.7, 0.04],
  ledge: [-0.25, -1.45, 1.35, -0.06, 0.3, 0.1],
  pedal: [-0.45, -1.0, 1.05, 0.34, -1.0, 0.14],
  saddle: [-0.45, -1.2, 1.6, 0.34, -1.0, 0.14],
  seat: [-0.7, -1.45, 1.4, 0.04, -0.75, 0.04],
};
export function seatAngles(
  seat: Exclude<Seat, null>,
  side: number,
  crank: number,
): {
  readonly elbow: number;
  readonly hip: number;
  readonly knee: number;
  readonly lean: number;
  readonly shoulder: number;
  readonly spread: number;
} {
  const turn = crank + (side === 0 ? 0 : Math.PI);
  const [elbow, hip, knee, lean, shoulder, spread] = seated[seat];
  return {
    elbow,
    hip:
      seat === "deck" && side === 1
        ? 0.25
        : seat === "pedal"
          ? hip + Math.sin(turn) * 0.4
          : hip,
    knee:
      seat === "pedal"
        ? knee + Math.cos(turn) * 0.45
        : seat === "ledge"
          ? knee + Math.sin(turn * 2) * 0.12
          : knee,
    lean,
    shoulder,
    spread,
  };
}
