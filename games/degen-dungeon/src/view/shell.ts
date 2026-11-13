import { BufferGeometry, Float32BufferAttribute } from "three";

// Many boxes and quads in one geometry, with their texture coordinates in metres, so a wall of window bays tiles at the right size on a
// building of any width and height, and a whole borough is one draw. Roofs and floors take one point of the texture (its wall colour).
export interface Shell {
  // A building: its walls tiled by `bay` metres across and `floor` metres up, shifted by `shift` bays, its roof plain.
  block(
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    height: number,
    shade: number,
    shift: number,
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
    block(x0, x1, z0, z1, height, shade, shift) {
      const up = height / floor;
      const side = (from: number, to: number) =>
        [shift, 0, shift + (to - from) / bay, up] as const;
      quad([x0, z1, x1, z1], 0, height, side(x0, x1), shade);
      quad([x1, z0, x0, z0], 0, height, side(x0, x1), shade);
      quad([x0, z0, x0, z1], 0, height, side(z0, z1), shade);
      quad([x1, z1, x1, z0], 0, height, side(z0, z1), shade);
      const plain: readonly [number, number] = [0.005, 0.995];
      face(
        [
          [x0, height, z0],
          [x0, height, z1],
          [x1, height, z1],
          [x1, height, z0],
        ],
        [0, 1, 0],
        [plain, plain, plain, plain],
        shade * 0.8,
      );
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
