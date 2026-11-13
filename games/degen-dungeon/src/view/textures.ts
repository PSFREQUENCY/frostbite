import {
  CanvasTexture,
  DataTexture,
  NearestFilter,
  RedFormat,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

import { hash } from "./hash.ts";

// Pictures painted in code for the city's surfaces: the window bays of each borough (lit, curtained, cracked or boarded), the fronts of
// the little shops, posters and flyers, and the streets with their kerbs and crossings. Each is a canvas made once; where the page has no
// canvas (the tests, a browser without one) there is no picture and the surfaces keep their plain colours. Every word is an original gag.
type Paint = (context: CanvasRenderingContext2D) => void;

export function canvasOf(
  width: number,
  height: number,
  paint: Paint,
): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) return null;
  paint(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

// Three bands of light and shade, so every surface reads as a cartoon.
export const toonSteps: Texture = (() => {
  const steps = new DataTexture(
    new Uint8Array([125, 180, 228, 255]),
    4,
    1,
    RedFormat,
  );
  steps.minFilter = NearestFilter;
  steps.magFilter = NearestFilter;
  steps.needsUpdate = true;
  return steps;
})();

// A bay is one window and the wall round it; the atlas is four bays by four. The wall is the borough's own colour.
const bay = 64;
type Window = "boarded" | "broken" | "curtain" | "glass";
const windowOf = (seed: number, index: number): Window => {
  const roll = hash(seed, index, 41);
  return roll < 0.06
    ? "boarded"
    : roll < 0.14
      ? "broken"
      : roll < 0.34
        ? "curtain"
        : "glass";
};
const curtains = [
  "#ff9ecf",
  "#ffd166",
  "#5beac6",
  "#c9b6ff",
  "#ff8a5b",
] as const;

function paintBay(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: Window,
  seed: number,
  night: boolean,
): void {
  const [wx, wy, ww, wh] = [x + 14, y + 10, 36, 40];
  if (night) {
    const lit =
      (kind === "glass" || kind === "curtain") && hash(seed, x, y) < 0.45;
    context.fillStyle = lit
      ? kind === "curtain"
        ? "#ffcf8a"
        : "#fff1b8"
      : "#000000";
    context.fillRect(wx, wy, ww, wh);
    return;
  }
  context.fillStyle = "rgba(255,255,255,0.35)";
  context.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
  if (kind === "boarded") {
    context.fillStyle = "#8a6a4a";
    for (let plank = 0; plank < 4; plank += 1)
      context.fillRect(wx, wy + plank * 10, ww, 8);
    return;
  }
  const glass = context.createLinearGradient(wx, wy, wx + ww, wy + wh);
  glass.addColorStop(0, "#9fd8ff");
  glass.addColorStop(0.45, "#2c4f7a");
  glass.addColorStop(1, "#1b2440");
  context.fillStyle = glass;
  context.fillRect(wx, wy, ww, wh);
  if (kind === "curtain") {
    context.fillStyle =
      curtains[Math.floor(hash(seed, x, y) * curtains.length)] ?? "#ffd166";
    context.fillRect(wx, wy, 12, wh);
    context.fillRect(wx + ww - 12, wy, 12, wh);
  }
  context.fillStyle = "rgba(255,255,255,0.28)";
  context.beginPath();
  context.moveTo(wx + 4, wy + wh - 4);
  context.lineTo(wx + 16, wy + 4);
  context.lineTo(wx + 22, wy + 4);
  context.lineTo(wx + 10, wy + wh - 4);
  context.fill();
  if (kind === "broken") {
    context.strokeStyle = "#f4f8ff";
    context.lineWidth = 1.5;
    const [cx, cy] = [wx + 20, wy + 16];
    for (let crack = 0; crack < 7; crack += 1) {
      const angle = crack * 0.9 + hash(seed, crack, 3);
      context.beginPath();
      context.moveTo(cx, cy);
      context.lineTo(cx + Math.cos(angle) * 22, cy + Math.sin(angle) * 22);
      context.stroke();
    }
    context.fillStyle = "#05070d";
    context.beginPath();
    context.arc(cx, cy, 5, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "rgba(0,0,0,0.35)";
  context.fillRect(wx - 4, wy + wh + 3, ww + 8, 4);
}

// A borough's walls, and the same bays as light at night (lit windows white, the rest black), for the emissive map.
export function facade(
  seed: number,
  wall: string,
  trim: string | null,
  night: boolean,
): CanvasTexture | null {
  return canvasOf(bay * 4, bay * 4, (context) => {
    context.fillStyle = night ? "#000000" : wall;
    context.fillRect(0, 0, bay * 4, bay * 4);
    for (let row = 0; row < 4; row += 1)
      for (let column = 0; column < 4; column += 1) {
        const index = row * 4 + column;
        if (!night) {
          context.fillStyle = `rgba(0,0,0,${String(0.04 + hash(seed, index, 5) * 0.08)})`;
          context.fillRect(column * bay, row * bay, bay, bay);
        }
        paintBay(
          context,
          column * bay,
          row * bay,
          windowOf(seed, index),
          seed + index,
          night,
        );
      }
    if (trim === null) return;
    context.fillStyle = night ? trim : "rgba(255,255,255,0.5)";
    for (let row = 0; row < 4; row += 1)
      context.fillRect(0, row * bay, bay * 4, 3);
  });
}

// The little shops' fronts: eight to an atlas (four across, two down), each a sign over a display window, a door and an awning.
export const shopNames = [
  "LUCKY DELI",
  "MOON NAILS",
  "PHONE FIX",
  "TACO SHACK",
  "KICKS 4 U",
  "FLOWERS",
  "RECORDS",
  "BAKERY",
] as const;
const awnings = [
  "#ff5d5d",
  "#5beac6",
  "#ffd166",
  "#6aa8ff",
  "#ff9ecf",
  "#7be36b",
  "#c9b6ff",
  "#ff8a5b",
] as const;
const front = { height: 160, width: 256 };

export function shopfronts(night: boolean): CanvasTexture | null {
  return canvasOf(front.width * 4, front.height * 2, (context) => {
    shopNames.forEach((name, index) => {
      const x = (index % 4) * front.width;
      const y = Math.floor(index / 4) * front.height;
      const ink = awnings[index] ?? "#ffffff";
      context.fillStyle = night ? "#000000" : "#3a3346";
      context.fillRect(x, y, front.width, front.height);
      context.fillStyle = night ? "#ffe9b0" : "#2c4f7a";
      context.fillRect(x + 16, y + 62, 150, 82);
      context.fillStyle = night ? "#fff6d6" : "#9fd8ff";
      context.fillRect(x + 186, y + 58, 54, 102);
      if (!night) {
        for (let item = 0; item < 5; item += 1) {
          context.fillStyle = awnings[(index + item) % awnings.length] ?? ink;
          context.fillRect(
            x + 24 + item * 28,
            y + 110 - (item % 2) * 14,
            20,
            30 + (item % 2) * 14,
          );
        }
        for (let stripe = 0; stripe < 8; stripe += 1) {
          context.fillStyle = stripe % 2 === 0 ? ink : "#f4f8ff";
          context.fillRect(x + stripe * 32, y + 40, 32, 18);
        }
      }
      context.fillStyle = night ? ink : "#11131c";
      context.fillRect(x + 8, y + 6, front.width - 16, 30);
      context.fillStyle = night ? "#ffffff" : ink;
      context.font = "bold 22px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(name, x + front.width / 2, y + 22, front.width - 24);
    });
  });
}
