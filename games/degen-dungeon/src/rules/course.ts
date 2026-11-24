import type { Point } from "./types.ts";

// The Degen Dash's course, round the Exchange's borough: Miss Mirinda's arch (the start and the finish) on the avenue north of Ticker
// Square, then eight gates, each won by a skill, in order. The Dash car waits for the seventh, and her desk is the eighth. Only places: the
// rules of a run are in `dash.ts`.
export type Trial =
  | "car"
  | "crawl"
  | "duck"
  | "finish"
  | "look"
  | "quiz"
  | "roof"
  | "run"
  | "wall";
export interface Stage extends Point {
  readonly trial: Trial;
}
export const dashArch: Point = { x: 18_000, z: 17_300 };
export const dashDesk: Point = { x: 18_900, z: 17_300 };
export const dashCar: Point = { x: 19_500, z: 12_400 };
export const stages: readonly Stage[] = [
  { trial: "run", x: 13_600, z: 17_500 },
  { trial: "duck", x: 12_400, z: 15_200 },
  { trial: "crawl", x: 12_400, z: 13_800 },
  { trial: "wall", x: 14_200, z: 12_700 },
  { trial: "roof", x: 16_200, z: 12_890 },
  { trial: "look", x: 17_400, z: 12_300 },
  { trial: "car", x: 23_400, z: 19_600 },
  { trial: "quiz", ...dashDesk },
  { trial: "finish", ...dashArch },
];
export const quizStage = 8;
