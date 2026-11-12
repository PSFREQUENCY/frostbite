import { block, island, lots } from "../rules/constants.ts";
import type { DayState } from "../rules/types.ts";
import { boroughs, spots } from "../rules/world.ts";

// The island from above, drawn on the game screen: the whole picture where the browser has no WebGL, and the corner map where it has.
export const colour = {
  hero: "#ffd166",
  lot: "#31406b",
  sea: "#0a2a44",
  spot: "#5beac6",
  street: "#141a2e",
  tux: "#ff5d5d",
} as const;

export interface Box {
  readonly size: number;
  readonly x: number;
  readonly y: number;
}

export function drawMap(
  context: CanvasRenderingContext2D,
  day: DayState | null,
  box: Box,
): void {
  const scale = box.size / island;
  const square = (tint: string, x: number, z: number, side: number): void => {
    context.fillStyle = tint;
    context.fillRect(
      Math.round(box.x + x * scale - side / 2),
      Math.round(box.y + z * scale - side / 2),
      side,
      side,
    );
  };
  context.fillStyle = colour.street;
  context.fillRect(box.x, box.y, box.size, box.size);
  context.fillStyle = colour.lot;
  boroughs.forEach((_, borough) => {
    for (const [west, east] of lots)
      for (const [north, south] of lots)
        context.fillRect(
          Math.round(box.x + (block * (borough % 3) + west) * scale),
          Math.round(box.y + (block * Math.floor(borough / 3) + north) * scale),
          Math.ceil((east - west) * scale),
          Math.ceil((south - north) * scale),
        );
  });
  for (const spot of spots) square(colour.spot, spot.x, spot.z, 2);
  if (day === null) return;
  if (day.tux !== null) square(colour.tux, day.tux.x, day.tux.z, 4);
  square(colour.hero, day.x, day.z, 4);
}

// The screen over the three-dimensional picture is clear but for the map in its corner; with no picture behind it, the map is the game.
export function drawScreen(
  context: CanvasRenderingContext2D,
  day: DayState | null,
  layered: boolean,
): void {
  const { height, width } = context.canvas;
  if (!layered) {
    context.fillStyle = colour.sea;
    context.fillRect(0, 0, width, height);
    drawMap(context, day, {
      size: height - 16,
      x: (width - height) / 2 + 8,
      y: 8,
    });
    return;
  }
  context.clearRect(0, 0, width, height);
  drawMap(context, day, { size: 72, x: width - 80, y: 8 });
}
