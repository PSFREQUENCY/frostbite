import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from "three";

import { venues } from "../rules/venues.ts";
import { podium } from "./dex.ts";
import { settle } from "./settle.ts";

// The Global DEX's trading floor, built like the island's grandest stock exchange and guarded like a vault. Through the doorway: two
// metal detector arches with their lights, turnstiles, glass barriers, guards; cameras on every wall. Inside: four round trading posts,
// each crowned with a ring of screens, the traders packed round them (`insiders.ts`); the big board across the back wall and a ticker
// band right round the hall, scrolling the island's coins (all of them made up); the bell balcony; a navy floor inlaid with gold.
export interface DexFloor {
  readonly root: Group;
  show(seconds: number): void;
}

const coins = [
  ["DUN", "+2.4%"],
  ["FROST", "+9.1%"],
  ["MAXX", "-1.2%"],
  ["WAGMI", "+4.8%"],
  ["HODL", "+0.6%"],
  ["MOON", "-3.3%"],
  ["GLOW", "+1.9%"],
  ["FUZZY", "-0.4%"],
  ["GENESIS", "+12.0%"],
  ["PIZZA", "+0.8%"],
] as const;

// A strip of tickers that repeats along its width: green up, red down.
function tickerTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 64;
  const pen = canvas.getContext("2d");
  if (pen === null) return null;
  pen.fillStyle = "#04070f";
  pen.fillRect(0, 0, 1024, 64);
  pen.font = "bold 34px monospace";
  pen.textBaseline = "middle";
  let x = 12;
  for (const [name, move] of coins) {
    pen.fillStyle = "#e8ecf5";
    pen.fillText(name, x, 32);
    x += pen.measureText(name).width + 10;
    pen.fillStyle = move.startsWith("-") ? "#ff4d5e" : "#39e27d";
    pen.fillText(`${move.startsWith("-") ? "▼" : "▲"}${move}`, x, 32);
    x += pen.measureText(move).width + 52;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  return texture;
}

// The big board: rows of prices in a grid of panels.
function boardTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const pen = canvas.getContext("2d");
  if (pen === null) return null;
  pen.fillStyle = "#04070f";
  pen.fillRect(0, 0, 1024, 256);
  pen.font = "bold 26px monospace";
  coins.forEach(([name, move], index) => {
    const [col, row] = [index % 5, Math.floor(index / 5)];
    const [x, y] = [14 + col * 202, 20 + row * 118];
    pen.strokeStyle = "#1d2a44";
    pen.strokeRect(x - 6, y - 8, 192, 104);
    pen.fillStyle = "#ffd166";
    pen.fillText(name, x, y + 24);
    pen.fillStyle = move.startsWith("-") ? "#ff4d5e" : "#39e27d";
    pen.fillText(move, x, y + 62);
    pen.fillRect(x, y + 78, Math.abs(Number.parseFloat(move)) * 12, 8);
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function buildDexFloor(): DexFloor {
  const root = new Group();
  root.name = "dex-floor";
  const dex = venues.find(({ kind }) => kind === "bank");
  if (dex === undefined) return { root, show: () => undefined };
  const [cx, cz, out] = [dex.middle.x / 100, dex.middle.z / 100, dex.out];
  // A point of the hall: `a` across, `b` toward the doorway, `y` above the podium.
  const put = (mesh: Mesh, a: number, b: number, y: number): Mesh => {
    mesh.position.set(cx + a * out, podium + y, cz + b * out);
    root.add(mesh);
    return mesh;
  };
  // One material for each colour, so `settle` can join the meshes that share it.
  const made = new Map<string, MeshStandardMaterial>();
  const standard = (color: string, glow = false): MeshStandardMaterial => {
    const key = `${color}${glow ? "!" : ""}`;
    const known = made.get(key);
    if (known !== undefined) return known;
    const material = new MeshStandardMaterial({
      color,
      emissive: glow ? color : "#000000",
      emissiveIntensity: glow ? 0.8 : 0,
      metalness: 0.3,
      roughness: 0.5,
    });
    made.set(key, material);
    return material;
  };
  const steel = standard("#9aa3b5");
  const gold = standard("#e0b341");
  const black = standard("#11131c");
  const glass = new MeshBasicMaterial({
    color: "#bfe9ff",
    depthWrite: false,
    opacity: 0.25,
    side: DoubleSide,
    transparent: true,
  });
  const ticker = tickerTexture();
  const lit = (
    texture: CanvasTexture | null,
    color: string,
  ): MeshBasicMaterial =>
    new MeshBasicMaterial(
      texture === null ? { color } : { map: texture, side: DoubleSide },
    );
  const tickerLit = lit(ticker, "#39e27d");
  // The floor: navy, with a ring of gold.
  put(
    new Mesh(new CylinderGeometry(18.2, 18.2, 0.04, 64), standard("#16213e")),
    0,
    0,
    0.1,
  );
  const inlay = put(
    new Mesh(new TorusGeometry(12, 0.12, 6, 96), gold),
    0,
    0,
    0.13,
  );
  inlay.rotation.x = Math.PI / 2;
  // The trading posts: a round counter, a pole, a ring of screens on top, a glowing cap.
  for (const [a, b] of [
    [-10, -3],
    [10, -3],
    [-8, 7],
    [8, 7],
  ] as const) {
    put(
      new Mesh(new CylinderGeometry(1.6, 1.7, 1.1, 24), standard("#2a2f45")),
      a,
      b,
      0.55,
    );
    put(new Mesh(new CylinderGeometry(1.65, 1.65, 0.08, 24), gold), a, b, 1.12);
    put(new Mesh(new CylinderGeometry(0.18, 0.18, 2.4, 10), steel), a, b, 2.2);
    put(
      new Mesh(new CylinderGeometry(1.5, 1.5, 0.75, 24, 1, true), tickerLit),
      a,
      b,
      3.5,
    );
    put(
      new Mesh(new CylinderGeometry(1.55, 1.55, 0.12, 24), black),
      a,
      b,
      3.94,
    );
    put(
      new Mesh(new SphereGeometry(0.3, 12, 8), standard("#5beac6", true)),
      a,
      b,
      4.2,
    );
  }
  // The big board on the back wall, and the ticker band round the hall.
  const board = put(
    new Mesh(new BoxGeometry(15, 4.6, 0.2), lit(boardTexture(), "#1d2a44")),
    0,
    -16.6,
    5.2,
  );
  board.rotation.y = out === 1 ? 0 : Math.PI;
  put(
    new Mesh(new BoxGeometry(15.4, 5.2, 0.15), black),
    0,
    -16.75,
    5.2,
  ).rotation.y = board.rotation.y;
  const band = put(
    new Mesh(
      new CylinderGeometry(
        18.1,
        18.1,
        0.7,
        96,
        1,
        true,
        0.4,
        Math.PI * 2 - 0.8,
      ),
      tickerLit,
    ),
    0,
    0,
    7.3,
  );
  band.rotation.y = out === 1 ? 0 : Math.PI;
  // The bell balcony on the back wall's left, with its gold rail and the bell.
  put(
    new Mesh(new BoxGeometry(4.2, 0.3, 3), standard("#5d6470")),
    -12.6,
    -10,
    3.45,
  );
  put(new Mesh(new BoxGeometry(4.2, 0.9, 0.08), gold), -12.6, -8.5, 4.05);
  put(
    new Mesh(new CylinderGeometry(0.12, 0.12, 3.4, 8), steel),
    -12.6,
    -8.6,
    1.7,
  );
  put(
    new Mesh(
      new SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      gold,
    ),
    -13.8,
    -10.8,
    4.6,
  );
  // Security at the doorway: two metal detector arches with their lights, turnstiles, glass barriers either side.
  const lights: Mesh[] = [];
  for (const a of [-1.6, 1.6]) {
    put(new Mesh(new BoxGeometry(0.25, 2.3, 0.6), steel), a - 0.6, 13, 1.15);
    put(new Mesh(new BoxGeometry(0.25, 2.3, 0.6), steel), a + 0.6, 13, 1.15);
    put(new Mesh(new BoxGeometry(1.45, 0.25, 0.6), steel), a, 13, 2.35);
    lights.push(
      put(
        new Mesh(new SphereGeometry(0.09, 8, 6), standard("#39e27d", true)),
        a,
        13.32,
        2.35,
      ),
    );
    put(new Mesh(new BoxGeometry(0.3, 1, 0.3), black), a, 11.6, 0.5);
    put(new Mesh(new BoxGeometry(0.9, 0.06, 0.06), steel), a, 11.6, 0.95);
  }
  for (const side of [-1, 1])
    put(new Mesh(new BoxGeometry(9, 1.3, 0.06), glass), side * 7.4, 11.6, 0.65);
  // Cameras on brackets round the wall, each with a red light.
  for (let k = 0; k < 8; k += 1) {
    const angle = 0.5 + (k / 8) * (Math.PI * 2 - 1);
    const [a, b] = [Math.sin(angle) * 17.6, Math.cos(angle) * 17.6];
    const camera = put(
      new Mesh(new BoxGeometry(0.25, 0.25, 0.6), black),
      a,
      b,
      6.2,
    );
    camera.lookAt(cx, podium + 1, cz);
    lights.push(
      put(
        new Mesh(new SphereGeometry(0.05, 6, 4), standard("#ff4d5e", true)),
        a * 0.97,
        b * 0.97,
        6.2,
      ),
    );
  }
  // Everything but the blinking lights is joined by material.
  settle(root, (mesh) => lights.includes(mesh));
  return {
    root,
    show(seconds) {
      if (ticker !== null) ticker.offset.x = (seconds * 0.05) % 1;
      // The detectors blink green; the cameras' lights blink red.
      lights.forEach((light, index) => {
        light.visible = Math.sin(seconds * 3 + index) > -0.6;
      });
    },
  };
}
