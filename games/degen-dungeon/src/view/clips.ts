import { stage } from "../rules/concert.ts";
import type { ClipKind } from "../script/clips.ts";
import type { Pose, Subject, Vec } from "./camera.ts";
import { metres } from "./city.ts";

// Lux's show (thirty seconds): cut by cut round the stage, each a short move from one pose to another. Wide from the back of the bowl,
// a close-up on her, the band, her whole dance in an arc, the crowd from behind her, a low close-up, and a crane up and away.
const [sx, sz] = [metres(stage.x), metres(stage.z) + 3];
type Cut = readonly [from: Vec, to: Vec, look: Vec, fov: number];
const cuts: readonly Cut[] = [
  [[sx, 9, sz + 28], [sx, 7, sz + 22], [sx, 3, sz], 45],
  [[sx + 0.8, 2.9, sz + 2.6], [sx - 0.5, 2.8, sz + 2.3], [sx, 2.6, sz], 30],
  [[sx - 6, 3, sz + 3], [sx - 3.5, 3.2, sz + 2], [sx - 2, 2.2, sz - 3], 40],
  [[sx - 4.5, 2.4, sz + 3], [sx + 4.5, 2.4, sz + 3], [sx, 2, sz], 38],
  [[sx, 3.6, sz - 4], [sx + 0.6, 3.4, sz - 3], [sx, 3, sz + 25], 50],
  [[sx + 1.2, 1.7, sz + 2.4], [sx - 1.2, 1.9, sz + 2.4], [sx, 2.8, sz], 32],
  [[sx, 4, sz + 12], [sx, 16, sz + 26], [sx, 2, sz], 50],
];
function showPose(part: number): Pose {
  const at = Math.min(cuts.length - 1, Math.floor(part * cuts.length));
  const t = part * cuts.length - at;
  const [from, to, look, fov] = cuts[at] ?? [
    [sx, 9, sz + 28],
    [sx, 9, sz + 28],
    [sx, 3, sz],
    45,
  ];
  const mix = (axis: 0 | 1 | 2): number =>
    from[axis] + (to[axis] - from[axis]) * t;
  return { fov, from: [mix(0), mix(1), mix(2)], look };
}

// Where the camera is through a cinematic clip, from its start (0) to its end (1), round the hero: an orbit that swings round them, a
// push in to their hands and face, a crane that rises from the floor to show the whole place, a look up into the sky after something
// rising, and a fast spin for dancing, skating and plugging in. Each move eases in and out.
export function clipPose(
  kind: ClipKind,
  { heading, x, y, z }: Subject,
  part: number,
): Pose {
  const t = part * part * (3 - 2 * part);
  const round = (
    angle: number,
    far: number,
    high: number,
    look: number,
    fov: number,
  ): Pose => ({
    fov,
    from: [x + Math.cos(angle) * far, y + high, z + Math.sin(angle) * far],
    look: [x, y + look, z],
  });
  switch (kind) {
    case "orbit":
      return round(heading + Math.PI * (0.6 + t * 0.9), 4.6, 1.9, 1.2, 40);
    case "push":
      return round(heading + 0.5, 3.6 - t * 2.2, 1.5, 1.1, 34 - t * 8);
    case "crane":
      return round(heading + Math.PI + 0.4, 3 + t * 6, 0.8 + t * 8, 1, 50);
    case "show":
      return showPose(part);
    case "sky":
      return {
        fov: 55,
        from: [x - Math.cos(heading) * 5, y + 1.2, z - Math.sin(heading) * 5],
        look: [x, y + 2 + t * 30, z],
      };
    case "spin":
      return round(
        heading + t * Math.PI * 2.4,
        3.4,
        1.4 + Math.sin(t * Math.PI) * 1.2,
        1,
        46,
      );
  }
}
