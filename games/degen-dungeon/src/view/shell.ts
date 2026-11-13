import { BufferGeometry, Float32BufferAttribute } from "three";

// Many boxes and quads in one geometry, with their texture coordinates in metres, so a wall of window bays tiles at the right size on a
// building of any width and height, and a whole borough is one draw. Roofs and floors take one point of the texture (its wall colour).
export interface Shell {
  // A building: its walls tiled by `bay` metres across and `floor` metres up, shifted by `shift` bays, its roof plain, its corners
  // rounded by `round` metres (half its width makes it a round tower).
  block(
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    height: number,
    shade: number,
    shift: number,
    round?: number,
  ): void;
  geometry(): BufferGeometry;
  // One upright face, from (x0, z0) to (x1, z1) and from y0 to y1, showing the texture's part from (u0, v0) to (u1, v1). It faces the side
  // from which (x0, z0) is on the left.
  quad(
    corners: readonly [x0: number, z0: number, x1: number, z1: number],
    y0: number,
    y1: number,
    uv: readonly [u0: number, v0: number, u1: number, v1: number],
    shade?: number,
  ): void;
}

// How many straight pieces make a rounded corner.
const corner = 4;

export function createShell(bay = 12, floor = 12.8): Shell {
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const colour: number[] = [];
  const face = (
    points: readonly (readonly [number, number, number])[],
    facing: readonly [number, number, number],
    marks: readonly (readonly [number, number])[],
    shade: number,
  ): void => {
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const point = points[index];
      const mark = marks[index];
      if (point === undefined || mark === undefined) continue;
      position.push(...point);
      normal.push(...facing);
      uv.push(...mark);
      colour.push(shade, shade, shade);
    }
  };
  const quad: Shell["quad"] = (
    [x0, z0, x1, z1],
    y0,
    y1,
    [u0, v0, u1, v1],
    shade = 1,
  ) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const length = Math.hypot(dx, dz) || 1;
    face(
      [
        [x0, y0, z0],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z0],
      ],
      [-dz / length, 0, dx / length],
      [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ],
      shade,
    );
  };
  return {
    block(x0, x1, z0, z1, height, shade, shift, round = 0) {
      const up = height / floor;
      const r = Math.max(0, Math.min(round, (x1 - x0) / 2, (z1 - z0) / 2));
      // The footprint, with its corners rounded: north side east to west, then down the west side, along the south and up the east.
      const path: (readonly [number, number])[] = [];
      const arc = (cx: number, cz: number, from: number): void => {
        for (let step = 0; step <= corner; step += 1) {
          const angle = from - (step / corner) * (Math.PI / 2);
          path.push([cx + r * Math.cos(angle), cz + r * Math.sin(angle)]);
        }
      };
      arc(x1 - r, z0 + r, 0);
      arc(x0 + r, z0 + r, -Math.PI / 2);
      arc(x0 + r, z1 - r, Math.PI);
      arc(x1 - r, z1 - r, Math.PI / 2);
      path.push(path[0] ?? [x1, z0]);
      let along = shift;
      for (let index = 0; index + 1 < path.length; index += 1) {
        const [ax, az] = path[index] ?? [0, 0];
        const [bx, bz] = path[index + 1] ?? [0, 0];
        const length = Math.hypot(bx - ax, bz - az);
        if (length < 0.01) continue;
        quad(
          [ax, az, bx, bz],
          0,
          height,
          [along, 0, along + length / bay, up],
          shade,
        );
        along += length / bay;
      }
      const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
      const plain: readonly [number, number] = [0.005, 0.995];
      for (let index = 0; index + 1 < path.length; index += 1) {
        const [ax, az] = path[index] ?? [0, 0];
        const [bx, bz] = path[index + 1] ?? [0, 0];
        face(
          [
            [cx, height, cz],
            [ax, height, az],
            [bx, height, bz],
            [cx, height, cz],
          ],
          [0, 1, 0],
          [plain, plain, plain, plain],
          shade * 0.8,
        );
      }
    },
    geometry() {
      const made = new BufferGeometry();
      made.setAttribute("position", new Float32BufferAttribute(position, 3));
      made.setAttribute("normal", new Float32BufferAttribute(normal, 3));
      made.setAttribute("uv", new Float32BufferAttribute(uv, 2));
      made.setAttribute("color", new Float32BufferAttribute(colour, 3));
      return made;
    },
    quad,
  };
}
