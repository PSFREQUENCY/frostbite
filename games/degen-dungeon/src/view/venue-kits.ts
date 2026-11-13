import { MeshBasicMaterial } from "three";

import type { Frame } from "./frame.ts";

// How each landmark is built, in its lot's own frame (`frame.ts`). Each kind is an original design; nothing copies a real building or
// brand.
export type Venue =
  | "arcade"
  | "bank"
  | "club"
  | "dome"
  | "gallery"
  | "library"
  | "museum"
  | "park"
  | "records"
  | "skate"
  | "studio";
const columns = (
  frame: Frame,
  from: number,
  to: number,
  w: number,
  height: number,
  colour: string,
): void => {
  for (let u = from; u <= to; u += 4)
    frame.shape("post", u, w, height / 2, [0.7, height, 0.7], colour);
};
const steps = (frame: Frame, colour: string): void => {
  for (let k = 0; k < 3; k += 1)
    frame.box(
      21,
      39 + k * 0.8,
      0.2 + (2 - k) * 0.3,
      [30 - k * 2, 0.4 + (2 - k) * 0.6, 0.8],
      colour,
    );
};
const tree = (frame: Frame, u: number, w: number): void => {
  frame.shape("post", u, w, 1.6, [0.3, 3.2, 0.3], "#8a6a4a");
  frame.shape("ball", u, w, 4.2, [2.2, 2.4, 2.2], "#3fae6b");
};

// One landmark: its building and its sign, facing the street.
export function buildVenue(kind: Venue, name: string, frame: Frame): void {
  switch (kind) {
    case "library":
    case "museum":
    case "bank": {
      const stone =
        kind === "library"
          ? "#e8dcc3"
          : kind === "museum"
            ? "#f2efe6"
            : "#d9d4c7";
      frame.box(21, 22, 7, [32, 14, 22], stone);
      frame.box(21, 35.5, 12.6, [32, 1.4, 5], stone);
      frame.box(21, 35.5, 13.8, [24, 1, 4.4], stone);
      columns(frame, 7, 35, 35.5, 11.9, "#ffffff");
      steps(frame, stone);
      if (kind === "bank") {
        frame.shape("ball", 21, 22, 14, [7, 6, 7], "#e0b341");
        frame.shape("post", 21, 37.9, 3, [2.2, 0.4, 2.2], "#e0b341", true);
      }
      if (kind === "museum")
        for (const u of [9, 33])
          frame.box(
            u,
            33.2,
            7,
            [3, 8, 0.2],
            u < 21 ? "#ff5d5d" : "#5beac6",
            true,
          );
      if (kind === "library") for (const u of [4, 38]) tree(frame, u, 38);
      frame.sign(name, 16.2, kind === "bank" ? "#ffd166" : "#f4f8ff");
      return;
    }
    case "gallery":
      frame.box(21, 20, 0.3, [34, 0.6, 30], "#f4f8ff");
      frame.box(21, 20, 8.6, [30, 16, 26], "#9fd8ff").material =
        new MeshBasicMaterial({
          color: "#9fd8ff",
          opacity: 0.25,
          transparent: true,
        });
      for (let k = 0; k < 6; k += 1)
        frame.box(
          9 + k * 4.8,
          12,
          4 + (k % 2) * 4,
          [3.4, 3.4, 0.2],
          ["#ff3df2", "#5beac6", "#ffd166", "#6aa8ff", "#ff8a5b", "#7be36b"][
            k
          ] ?? "#ffffff",
          true,
        );
      frame.sign(name, 18, "#ff3df2");
      return;
    case "dome":
      frame.shape("ball", 21, 21, 0, [16, 14, 16], "#2a2350");
      frame.shape(
        "ball",
        21,
        21,
        0,
        [16.2, 14.2, 16.2],
        "#5beac6",
        true,
      ).material = new MeshBasicMaterial({ color: "#5beac6", wireframe: true });
      frame.box(21, 37, 2, [6, 4, 10], "#1d1b33");
      frame.sign(name, 6.5, "#5beac6", 12);
      return;
    case "arcade":
    case "club": {
      const neon =
        kind === "arcade"
          ? "#ffd166"
          : name.length % 2 === 0
            ? "#ff3df2"
            : "#6aa8ff";
      frame.box(
        21,
        22,
        6,
        [34, 12, 28],
        kind === "arcade" ? "#2a2350" : "#11131c",
      );
      for (const y of [0.15, 11.9])
        frame.box(21, 36.1, y, [34.2, 0.3, 0.3], neon, true);
      for (const u of [4.1, 37.9])
        frame.box(u, 36.1, 6, [0.3, 12, 0.3], neon, true);
      frame.box(
        21,
        36.2,
        2.4,
        [6, 4.6, 0.2],
        kind === "arcade" ? "#ff5d5d" : "#000000",
        true,
      );
      if (kind === "arcade")
        for (let k = 0; k < 8; k += 1)
          frame.box(
            6 + k * 4.3,
            36.15,
            7.5,
            [2.2, 2.2, 0.1],
            ["#ff5d5d", "#5beac6", "#ffd166", "#6aa8ff"][k % 4] ?? "#ffffff",
            true,
          );
      if (kind === "club")
        frame.box(3.6, 22, 3.2, [0.3, 6.4, 24], "#3a3f47").name = "mural-wall";
      for (let k = 0; k < 3; k += 1)
        frame.shape(
          "cone",
          10 + k * 11,
          22,
          22,
          [1.6, 20, 1.6],
          neon,
          true,
        ).name = "beam";
      frame.sign(name, 14.5, neon);
      return;
    }
    case "records":
      frame.box(21, 20, 35, [18, 70, 18], "#1d1b33");
      for (let k = 0; k < 7; k += 1)
        frame.box(
          14 + k * 2.3,
          29.2,
          20,
          [1.4, 30, 0.3],
          ["#ff3df2", "#6aa8ff", "#5beac6"][k % 3] ?? "#ffffff",
          true,
        ).name = "equalizer";
      frame.shape("post", 21, 20, 71.5, [8, 3, 8], "#2a2f45");
      frame.shape("post", 21, 20, 73.2, [5, 0.4, 5], "#ff3df2", true);
      frame.box(21, 33, 2.5, [26, 5, 8], "#2a2350");
      frame.sign(name, 6.5, "#ff3df2");
      return;
    case "studio":
      frame.box(21, 22, 5, [34, 10, 26], "#f4f8ff");
      frame.box(21, 35.2, 5, [30, 7, 0.3], "#2c4f7a");
      frame.shape("post", 30, 35.6, 6, [3.2, 1.4, 3.2], "#11131c").rotation.x =
        Math.PI / 2;
      frame.shape(
        "post",
        30,
        36.4,
        6,
        [2.2, 0.3, 2.2],
        "#6aa8ff",
        true,
      ).rotation.x = Math.PI / 2;
      frame.box(12, 35.6, 8.4, [5, 1.6, 0.3], "#ff3b3b", true).name = "on-air";
      frame.shape("ball", 9, 14, 11, [2.4, 0.6, 2.4], "#c0c6d0");
      frame.sign(name, 12.5, "#6aa8ff");
      return;
    case "skate":
      frame.box(21, 21, 0.1, [40, 0.2, 40], "#b9bfcc");
      for (const w of [8, 34])
        frame.box(21, w, 1.2, [26, 0.3, 6], "#9aa3b5").rotation.x =
          w < 21 ? 0.42 : -0.42;
      frame.box(21, 21, 0.5, [8, 0.8, 4], "#8a90a3");
      for (const u of [6, 36])
        frame.box(u, 21, 0.6, [0.12, 0.12, 14], "#e0b341");
      frame.box(21, 1, 1.6, [42, 3.2, 0.4], "#5d6470").name = "mural-wall";
      frame.sign(name, 4.2, "#7be36b", 12);
      return;
    case "park":
      frame.box(21, 21, 0.05, [42, 0.1, 42], "#4f9d5d");
      frame.box(21, 41, 1.3, [24, 2.6, 0.4], "#3a3f47").name = "mural-wall";
      for (let k = 0; k < 9; k += 1)
        tree(frame, 6 + (k % 3) * 15, 6 + Math.floor(k / 3) * 14);
      frame.sign(name, 2.4, "#7be36b", 8);
      return;
  }
}
