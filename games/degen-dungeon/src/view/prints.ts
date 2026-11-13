import type { CanvasTexture } from "three";

import { hash } from "./hash.ts";
import { canvasOf } from "./textures.ts";

// The city's printed things: posters and flyers for the walls and the lamp posts, the streets themselves, and the paper of a lantern with
// the player's message on it. Painted once on a canvas each, where the page has one (`textures.ts`).
// Posters and flyers, eight to an atlas: original gags for the walls and the lamp posts.
export const posterLines = [
  ["LOST:", "SEED PHRASE", "REWARD"],
  ["TONIGHT", "THE RUG", "PULLS"],
  ["GM", "SAY IT", "BACK"],
  ["ROOM", "FOR RENT", "2 DUN/WK"],
  ["FREE", "FROST", "!!!"],
  ["NEVER", "SHARE", "YOUR KEYS"],
  ["WEN", "MOON", "?"],
  ["LANTERNS", "AFTER", "DARK"],
] as const;
const papers = [
  "#ffd166",
  "#ff9ecf",
  "#9fd8ff",
  "#f4f8ff",
  "#ff5d5d",
  "#7be36b",
  "#c9b6ff",
  "#ff8a5b",
] as const;

export function posters(): CanvasTexture | null {
  return canvasOf(512, 384, (context) => {
    posterLines.forEach((lines, index) => {
      const x = (index % 4) * 128;
      const y = Math.floor(index / 4) * 192;
      context.fillStyle = papers[index] ?? "#ffffff";
      context.fillRect(x + 4, y + 4, 120, 184);
      context.fillStyle = "#11131c";
      context.textAlign = "center";
      context.textBaseline = "middle";
      lines.forEach((line, row) => {
        context.font = `bold ${String(row === 1 ? 26 : 20)}px sans-serif`;
        context.fillText(line, x + 64, y + 50 + row * 44, 112);
      });
      context.fillRect(x + 20, y + 168, 88, 4);
    });
  });
}

// One borough's ground (120 metres a side): asphalt with lane lines, kerbs and pavements along the buildings, and zebra crossings.
export function streets(): CanvasTexture | null {
  const scale = 512 / 120;
  return canvasOf(512, 512, (context) => {
    const m = (metres: number): number => metres * scale;
    context.fillStyle = "#454b5c";
    context.fillRect(0, 0, 512, 512);
    for (let speck = 0; speck < 1_400; speck += 1) {
      context.fillStyle = hash(speck, 1, 2) < 0.5 ? "#4d5366" : "#3d4250";
      context.fillRect(hash(speck, 3, 4) * 512, hash(speck, 5, 6) * 512, 2, 2);
    }
    const lots: readonly (readonly [number, number])[] = [
      [8, 50],
      [70, 112],
    ];
    context.fillStyle = "#9097aa";
    for (const [a, b] of lots)
      for (const [c, d] of lots)
        context.fillRect(
          m(a - 1.6),
          m(c - 1.6),
          m(b - a + 3.2),
          m(d - c + 3.2),
        );
    context.fillStyle = "#b9bfcf";
    for (const [a, b] of lots)
      for (const [c, d] of lots) {
        context.fillRect(m(a - 1.6), m(c - 1.6), m(b - a + 3.2), 2);
        context.fillRect(m(a - 1.6), m(d + 1.6) - 2, m(b - a + 3.2), 2);
        context.fillRect(m(a - 1.6), m(c - 1.6), 2, m(d - c + 3.2));
        context.fillRect(m(b + 1.6) - 2, m(c - 1.6), 2, m(d - c + 3.2));
      }
    context.fillStyle = "#ffd166";
    for (let along = 0; along < 120; along += 6) {
      if (along > 46 && along < 74) continue;
      context.fillRect(m(along), m(60) - 1, m(3), 2);
      context.fillRect(m(60) - 1, m(along), 2, m(3));
    }
    // Zebra crossings beside every crossroads, over the middle streets and the avenues.
    context.fillStyle = "#e8ecf5";
    for (const at of [8.5, 46.5, 70.5, 108.5])
      for (let stripe = 52; stripe < 68; stripe += 2) {
        context.fillRect(m(at), m(stripe), m(3), m(1));
        context.fillRect(m(stripe), m(at), m(1), m(3));
      }
    for (const at of [46.5, 70.5])
      for (const start of [0.5, 112.5])
        for (let stripe = start; stripe < start + 7; stripe += 2) {
          context.fillRect(m(stripe), m(at), m(1), m(3));
          context.fillRect(m(at), m(stripe), m(3), m(1));
        }
  });
}

// A lantern's paper, with the player's message written on it.
export function lanternPaper(message: string): CanvasTexture | null {
  return canvasOf(256, 256, (context) => {
    const glow = context.createRadialGradient(128, 128, 20, 128, 128, 160);
    glow.addColorStop(0, "#fff3c4");
    glow.addColorStop(1, "#ff9a3c");
    context.fillStyle = glow;
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = "#7a2e0e";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "bold 30px sans-serif";
    const words = message.split(/\s+/u).filter((word) => word.length > 0);
    const lines: string[] = [];
    for (const word of words) {
      const last = lines.at(-1);
      if (last !== undefined && `${last} ${word}`.length <= 12)
        lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    lines.slice(0, 5).forEach((line, row, all) => {
      context.fillText(line, 128, 128 + (row - (all.length - 1) / 2) * 36, 236);
    });
  });
}

// Murals and graffiti, four across a wall: bubble letters with drips, a sunset over palms, a moon with a face asking when, and tags.
export function murals(): CanvasTexture | null {
  return canvasOf(1024, 128, (context) => {
    const sky = context.createLinearGradient(256, 0, 256, 128);
    sky.addColorStop(0, "#ff5d8f");
    sky.addColorStop(1, "#ffd166");
    context.fillStyle = "#3a3f47";
    context.fillRect(0, 0, 1024, 128);
    context.fillStyle = "#7be36b";
    context.font = "bold 70px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeStyle = "#11131c";
    context.lineWidth = 6;
    context.strokeText("WAGMI", 128, 64);
    context.fillText("WAGMI", 128, 64);
    for (let drip = 0; drip < 9; drip += 1)
      context.fillRect(40 + drip * 20, 90, 4, 10 + hash(drip, 1, 1) * 30);
    context.fillStyle = sky;
    context.fillRect(256, 0, 256, 128);
    context.fillStyle = "#11131c";
    for (const x of [300, 380, 460]) {
      context.fillRect(x, 50, 6, 78);
      context.beginPath();
      context.arc(x + 3, 50, 24, Math.PI, 0);
      context.fill();
    }
    context.fillStyle = "#1b2440";
    context.fillRect(512, 0, 256, 128);
    context.fillStyle = "#f4f8ff";
    context.beginPath();
    context.arc(600, 64, 46, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#1b2440";
    context.fillRect(584, 50, 8, 8);
    context.fillRect(610, 50, 8, 8);
    context.fillRect(590, 80, 24, 5);
    context.fillStyle = "#ffd166";
    context.font = "bold 44px sans-serif";
    context.fillText("WEN?", 700, 64);
    context.fillStyle = "#2a2f45";
    context.fillRect(768, 0, 256, 128);
    const tags = ["GM", "HODL", "NGMI", "ZAP", "FROST"];
    tags.forEach((tag, index) => {
      context.fillStyle =
        ["#ff3df2", "#5beac6", "#ffd166", "#ff8a5b", "#9fd8ff"][index] ??
        "#ffffff";
      context.font = `bold ${String(26 + index * 4)}px sans-serif`;
      context.fillText(tag, 800 + hash(index, 2, 2) * 190, 24 + index * 22);
    });
  });
}
