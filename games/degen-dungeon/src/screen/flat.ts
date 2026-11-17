import { block, island, lots } from "../rules/constants.ts";
import { echoAt, risen, statue } from "../rules/machine.ts";
import type { DayState } from "../rules/types.ts";
import { watcherAt } from "../rules/mystery.ts";
import { openTo, spots } from "../rules/places.ts";
import { questAt } from "../quest.ts";
import { beatOf } from "../rules/story.ts";
import { boroughs } from "../rules/world.ts";

// The island from above, drawn on the game screen: the whole picture where the browser has no WebGL, and the corner map where it has.
export const colour = {
  beat: "#ffb000",
  cop: "#6aa8ff",
  echo: "#c9b6ff",
  letter: "#ffffff",
  hero: "#ffd166",
  lot: "#31406b",
  quest: "#ff3df2",
  sea: "#0a2a44",
  spot: "#5beac6",
  statue: "#bfe9ff",
  street: "#141a2e",
  tux: "#ff5d5d",
  vests: "#ff9a3c",
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
  // Only what is open today shows, letters in white; before a day, the places that are always there. Parked rides and the moon are not
  // on the island's map.
  for (const spot of spots)
    if (
      onMap(spot) &&
      (day === null ? spot.on === undefined : openTo(spot, day))
    )
      square(
        spot.kind === "letter" ? colour.letter : colour.spot,
        spot.x,
        spot.z,
        2,
      );
  // The statue is bigger on the map once it has risen, and the newbie of a trip back is where the rules say.
  const up = day !== null && risen(day);
  square(colour.statue, statue.x, statue.z, up ? 5 : 3);
  if (day === null) return;
  const echo = echoAt(day);
  if (echo !== null) square(colour.echo, echo.x, echo.z, 4);
  const beat = beatOf(day);
  if (beat !== null) square(colour.beat, beat.at.x, beat.at.z, 5);
  if (day.looking) {
    const watcher = watcherAt(day.seed, day.day);
    square(colour.echo, watcher.x, watcher.z, 4);
  }
  for (const [chaser, tint] of [
    [day.cop, colour.cop],
    [day.tux, colour.tux],
    [day.vests, colour.vests],
  ] as const)
    if (chaser !== null) square(tint, chaser.x, Math.max(0, chaser.z), 4);
  // Where to go next glows: a ring that swells and a dotted line to it from the hero.
  const goal = questAt(day);
  if (goal !== null) {
    const [gx, gz] = [clamp(goal.x), clamp(goal.z)];
    const [hx, hz] = [clamp(day.x), clamp(day.z)];
    const dots = Math.floor((Math.hypot(gx - hx, gz - hz) * scale) / 5);
    for (let dot = 1; dot < dots; dot += 1)
      square(
        colour.quest,
        hx + ((gx - hx) * dot) / dots,
        hz + ((gz - hz) * dot) / dots,
        1,
      );
    const ring = 6 + (Math.floor(day.tick / 3) % 10) / 2;
    const [cx, cy] = [box.x + gx * scale, box.y + gz * scale];
    context.fillStyle = colour.quest;
    for (const [x, y, w, h] of [
      [cx - ring, cy - ring, ring * 2, 1],
      [cx - ring, cy + ring, ring * 2, 1],
      [cx - ring, cy - ring, 1, ring * 2],
      [cx + ring, cy - ring, 1, ring * 2 + 1],
    ] as const)
      context.fillRect(Math.round(x), Math.round(y), w, h);
    square(colour.quest, gx, gz, 4);
  }
  // In the oldest tunnel and on SHA Beach the hero is north of the island, and on the moon far east, so the dot waits at the edge.
  square(colour.hero, clamp(day.x), clamp(day.z), 4);
}

const clamp = (at: number): number => Math.max(0, Math.min(island, at));
// Whether a spot belongs on the island's map.
export const onMap = (spot: (typeof spots)[number]): boolean =>
  spot.kind !== "parked" && spot.x <= island && spot.z <= island;

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
