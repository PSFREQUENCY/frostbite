import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";

// What the Starlight Cinema shows: three short films of its own, drawn as they play on a canvas that is the screen's picture, each half
// a minute with its title card first. "Moon Run" is a snowball hopping the rooftops under a big moon while a rocket goes by; "The Big
// Melt" an ice cube sliding down a sunny hill into the sea; "Night Market" a cat on a scooter riding past neon stalls while lanterns
// float up. All of it is original. The picture is drawn twelve times a second, and only while someone is near enough to see it.
export const films = ["MOON RUN", "THE BIG MELT", "NIGHT MARKET"] as const;
export const filmLength = 30;
const width = 384;
const height = 144;
const fps = 12;

// Which film is on at a time (seconds), and how far into it.
export function filmAt(seconds: number): {
  readonly at: number;
  readonly index: number;
} {
  const loop = seconds % (films.length * filmLength);
  return { at: loop % filmLength, index: Math.floor(loop / filmLength) };
}

type Pen = CanvasRenderingContext2D;
const disc = (pen: Pen, x: number, y: number, r: number, colour: string) => {
  pen.fillStyle = colour;
  pen.beginPath();
  pen.arc(x, y, r, 0, Math.PI * 2);
  pen.fill();
};
const sky = (pen: Pen, top: string, bottom: string): void => {
  const fade = pen.createLinearGradient(0, 0, 0, height);
  fade.addColorStop(0, top);
  fade.addColorStop(1, bottom);
  pen.fillStyle = fade;
  pen.fillRect(0, 0, width, height);
};
// A face on a round body: two eyes that blink now and then, and a smile.
const face = (pen: Pen, x: number, y: number, r: number, t: number) => {
  const open = t % 3 < 0.12 ? 0.3 : 1;
  pen.fillStyle = "#1b1e2d";
  for (const side of [-1, 1])
    pen.fillRect(x + side * r * 0.35 - 1.5, y - r * 0.25, 3, 4 * open);
  pen.strokeStyle = "#1b1e2d";
  pen.lineWidth = 1.5;
  pen.beginPath();
  pen.arc(x, y + r * 0.1, r * 0.35, 0.2, Math.PI - 0.2);
  pen.stroke();
};

function titleCard(pen: Pen, name: string, at: number): void {
  pen.fillStyle = "#07060f";
  pen.fillRect(0, 0, width, height);
  pen.globalAlpha = Math.min(1, at * 2, (3 - at) * 2);
  pen.fillStyle = "#ffd166";
  pen.font = "bold 30px monospace";
  pen.textAlign = "center";
  pen.fillText(name, width / 2, height / 2 + 8);
  pen.font = "11px monospace";
  pen.fillStyle = "#9fd8ff";
  pen.fillText("A STARLIGHT PICTURE", width / 2, height / 2 + 30);
  pen.globalAlpha = 1;
}

function moonRun(pen: Pen, t: number): void {
  sky(pen, "#0b1030", "#3a1d5c");
  for (let star = 0; star < 36; star += 1) {
    pen.fillStyle = `rgba(255,255,255,${(0.3 + 0.7 * Math.abs(Math.sin(t * 1.7 + star))).toFixed(2)})`;
    pen.fillRect(
      (star * 97 + star * star * 13) % width,
      (star * 29 + star * star * 7) % 80,
      2,
      2,
    );
  }
  disc(pen, 300, 42, 24, "#f4f1d0");
  disc(pen, 292, 36, 5, "#e0dcb4");
  // Two rows of rooftops sliding by, the near one faster.
  for (const [speed, base, colour] of [
    [20, 104, "#1f1740"],
    [55, 118, "#120d26"],
  ] as const)
    for (let roof = -1; roof < 9; roof += 1) {
      const x = roof * 52 - ((t * speed) % 52);
      const rise = 14 + ((roof * 37 + Math.floor((t * speed) / 52) * 11) % 23);
      pen.fillStyle = colour;
      pen.fillRect(x, base - rise, 48, height);
    }
  const hop = Math.abs(Math.sin(t * 5)) * 20;
  disc(pen, 120, 96 - hop, 10, "#ffffff");
  face(pen, 120, 96 - hop, 10, t);
  const flight = (t % 9) / 9;
  if (flight > 0.4) {
    const x = (flight - 0.4) * 640 - 20;
    pen.fillStyle = "#ff5d5d";
    pen.fillRect(x, 70 - x * 0.12, 18, 6);
    disc(pen, x - 4, 73 - x * 0.12, 4, "#ffd166");
  }
}

function bigMelt(pen: Pen, t: number): void {
  sky(pen, "#6ec6ff", "#c9f0ff");
  disc(pen, 60, 30, 18, "#ffe066");
  pen.fillStyle = "#3a8fd9";
  pen.fillRect(0, 118, width, height);
  pen.fillStyle = "#5fc456";
  pen.beginPath();
  pen.moveTo(0, 50);
  pen.quadraticCurveTo(200, 60, 300, 120);
  pen.lineTo(0, 120);
  pen.fill();
  // The cube slides down the hill, smaller the further it melts, and splashes at the bottom.
  const share = Math.min(1, (t % 12) / 9);
  const x = 20 + share * 270;
  const y = 50 + share * share * 62;
  const size = 22 - share * 8;
  pen.fillStyle = "#e8f6ff";
  pen.fillRect(x - size / 2, y - size, size, size);
  face(pen, x, y - size / 2, size / 2, t);
  pen.fillStyle = "#9fd8ff";
  for (let drop = 0; drop < 3; drop += 1)
    disc(
      pen,
      x - size / 2 - drop * 6,
      y - 4 + ((t * 20 + drop * 7) % 8),
      2,
      "#9fd8ff",
    );
  if (share === 1) {
    const splash = (t % 12) - 9;
    for (let bit = 0; bit < 6; bit += 1)
      disc(
        pen,
        296 + (bit - 2.5) * 10 * splash,
        116 - Math.sin(bit) * 30 * splash,
        3,
        "#ffffff",
      );
  }
}

function nightMarket(pen: Pen, t: number): void {
  sky(pen, "#140b26", "#2a1d4c");
  const signs = ["#ff3df2", "#5beac6", "#ffd166", "#6aa8ff", "#ff8a5b"];
  for (let stall = -1; stall < 8; stall += 1) {
    const x = stall * 60 - ((t * 25) % 60);
    const lit = Math.sin(t * 4 + stall) > -0.6;
    pen.fillStyle = "#2a2350";
    pen.fillRect(x, 60, 54, 70);
    pen.fillStyle = lit
      ? (signs[(stall + Math.floor((t * 25) / 60) + 10) % signs.length] ??
        "#ffffff")
      : "#3a3f47";
    pen.fillRect(x + 6, 64, 42, 12);
  }
  pen.fillStyle = "#0b0b10";
  pen.fillRect(0, 128, width, height);
  for (let lantern = 0; lantern < 6; lantern += 1) {
    const rise = (t * 12 + lantern * 23) % 140;
    disc(
      pen,
      30 + lantern * 64 + Math.sin(t + lantern) * 6,
      140 - rise,
      4,
      "#ffb347",
    );
  }
  // The cat's scooter crosses the screen every eight seconds.
  const x = ((t % 8) / 8) * (width + 60) - 30;
  pen.fillStyle = "#5beac6";
  pen.fillRect(x - 14, 118, 28, 4);
  disc(pen, x - 12, 124, 4, "#e8ecf5");
  disc(pen, x + 12, 124, 4, "#e8ecf5");
  disc(pen, x, 106, 8, "#ff9ecf");
  pen.fillStyle = "#ff9ecf";
  pen.beginPath();
  pen.moveTo(x - 7, 100);
  pen.lineTo(x - 3, 93);
  pen.lineTo(x - 1, 100);
  pen.moveTo(x + 7, 100);
  pen.lineTo(x + 3, 93);
  pen.lineTo(x + 1, 100);
  pen.fill();
  face(pen, x, 106, 8, t);
}

const reels = [moonRun, bigMelt, nightMarket] as const;

// One frame of the programme at a time (seconds), drawn onto a pen.
export function drawFilm(pen: Pen, seconds: number): void {
  const { at, index } = filmAt(seconds);
  if (at < 3) titleCard(pen, films[index] ?? "", at);
  else reels[index]?.(pen, at - 3);
  // The frame's edges darken, as a picture on a cinema screen does.
  const edge = pen.createRadialGradient(
    width / 2,
    height / 2,
    60,
    width / 2,
    height / 2,
    220,
  );
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,0.45)");
  pen.fillStyle = edge;
  pen.fillRect(0, 0, width, height);
}

export interface Movie {
  readonly mesh: Mesh;
  play(seconds: number): void;
}

// A screen of `across` by `up` metres showing the programme; where the browser cannot draw on a canvas it is a plain lit screen.
export function buildMovie(across: number, up: number): Movie {
  const canvas =
    typeof document === "undefined" ? null : document.createElement("canvas");
  if (canvas !== null) {
    canvas.width = width;
    canvas.height = height;
  }
  const pen = canvas?.getContext("2d") ?? null;
  const picture =
    pen === null || canvas === null ? null : new CanvasTexture(canvas);
  if (picture !== null) picture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(
    new PlaneGeometry(across, up),
    new MeshBasicMaterial({
      color: picture === null ? "#6aa8ff" : "#ffffff",
      map: picture,
      toneMapped: false,
    }),
  );
  mesh.name = "movie";
  let shown = -1;
  return {
    mesh,
    play(seconds) {
      const frame = Math.floor(seconds * fps);
      if (pen === null || picture === null || frame === shown) return;
      shown = frame;
      drawFilm(pen, seconds);
      picture.needsUpdate = true;
    },
  };
}
