import type { ClipKind } from "../script/clips.ts";
import type { Pose, Subject } from "./camera.ts";

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
