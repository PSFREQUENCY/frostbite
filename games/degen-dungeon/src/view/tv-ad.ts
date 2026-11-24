import { linesOf, moonSlogan, shuttlePrint } from "../script/ads.ts";

// The commercial the island's TVs loop (`tvs.ts`), painted frame by frame on a canvas: a night sky and a rising moon, a rocket that waits
// on its pad and then climbs toward the moon on a trail of fire, a flash where it lands, and then the slogan in gold, line by line, with
// the shuttle's small print; TV scan lines over all of it. And for ADOR's big screen a band where the slogan scrolls past, again and
// again. Both are pure drawing: the same moment always paints the same frame.
export const adSeconds = 9;
type Pen = CanvasRenderingContext2D;

const circle = (
  pen: Pen,
  x: number,
  y: number,
  radius: number,
  fill: string,
): void => {
  pen.fillStyle = fill;
  pen.beginPath();
  pen.arc(x, y, radius, 0, Math.PI * 2);
  pen.fill();
};
const ease = (part: number): number => {
  const clamped = Math.max(0, Math.min(1, part));
  return clamped * clamped * (3 - 2 * clamped);
};

export function paintAd(
  pen: Pen,
  wide: number,
  high: number,
  seconds: number,
): void {
  const time = ((seconds % adSeconds) + adSeconds) % adSeconds;
  const sky = pen.createLinearGradient(0, 0, 0, high);
  sky.addColorStop(0, "#05031a");
  sky.addColorStop(1, "#2a1250");
  pen.fillStyle = sky;
  pen.fillRect(0, 0, wide, high);
  for (let star = 0; star < 48; star += 1) {
    pen.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 2.5 + star * 1.7));
    pen.fillStyle = "#ffffff";
    pen.fillRect((star * 97) % wide, (star * 53) % (high * 0.75), 1.5, 1.5);
  }
  pen.globalAlpha = 1;
  // The moon rises, and stays.
  const [mx, my, mr] = [
    wide * 0.74,
    high * (0.42 - 0.14 * ease(time / 2)),
    high * 0.19,
  ];
  circle(pen, mx, my, mr * 1.5, "rgba(255, 241, 168, 0.12)");
  circle(pen, mx, my, mr, "#f4f1ea");
  circle(pen, mx - mr * 0.35, my - mr * 0.2, mr * 0.18, "#d8d2c4");
  circle(pen, mx + mr * 0.3, my + mr * 0.3, mr * 0.12, "#d8d2c4");
  // The rocket: on its pad, then up toward the moon (2 to 4.5 seconds), then a flash where it lands.
  const flight = ease((time - 2) / 2.5);
  const [px, py] = [wide * 0.18, high * 0.86];
  const [rx, ry] = [
    px + (mx - px) * flight,
    py + (my + mr - py) * flight - Math.sin(flight * Math.PI) * high * 0.12,
  ];
  pen.fillStyle = "#3a3f47";
  pen.fillRect(px - wide * 0.06, py + 6, wide * 0.12, 4);
  if (time < 4.6) {
    if (time > 1.8)
      for (let puff = 0; puff < 6; puff += 1)
        circle(
          pen,
          rx - (rx - px) * puff * 0.08,
          ry + 8 + puff * 3,
          3 + puff,
          puff % 2 === 0 ? "#ff8a5b" : "#ffd166",
        );
    pen.save();
    pen.translate(rx, ry);
    pen.rotate(flight * 0.9);
    pen.fillStyle = "#f4f8ff";
    pen.fillRect(-4, -14, 8, 18);
    pen.fillStyle = "#ff3df2";
    pen.beginPath();
    pen.moveTo(-4, -14);
    pen.lineTo(0, -21);
    pen.lineTo(4, -14);
    pen.fill();
    pen.restore();
  } else if (time < 5.2)
    circle(
      pen,
      mx,
      my + mr * 0.6,
      (time - 4.6) * 40,
      "rgba(255, 255, 255, 0.8)",
    );
  // The slogan, line by line, and the small print.
  if (time >= 4.8) {
    pen.textAlign = "center";
    pen.textBaseline = "middle";
    pen.shadowColor = "#ffd166";
    pen.shadowBlur = 10;
    pen.font = `bold ${String(Math.round(high * 0.14))}px sans-serif`;
    const lines = linesOf(moonSlogan.toUpperCase(), 12);
    lines.forEach((line, index) => {
      pen.globalAlpha = ease((time - 4.8 - index * 0.45) / 0.4);
      pen.fillStyle = index === lines.length - 1 ? "#ff3df2" : "#ffd166";
      pen.fillText(line, wide * 0.38, high * (0.25 + index * 0.17));
    });
    pen.shadowBlur = 0;
    pen.globalAlpha = ease((time - 6.6) / 0.5);
    pen.font = `${String(Math.round(high * 0.065))}px sans-serif`;
    pen.fillStyle = "#cfe8ff";
    pen.fillText(shuttlePrint.toUpperCase(), wide / 2, high * 0.9);
    pen.globalAlpha = 1;
  }
  // Scan lines.
  pen.fillStyle = "rgba(0, 0, 0, 0.18)";
  for (let line = 0; line < high; line += 3) pen.fillRect(0, line, wide, 1);
}

// The band under ADOR's big screen: the slogan and the small print scrolling right to left, stars between them.
export function paintBand(
  pen: Pen,
  wide: number,
  high: number,
  seconds: number,
): void {
  pen.fillStyle = "#07051a";
  pen.fillRect(0, 0, wide, high);
  pen.font = `bold ${String(Math.round(high * 0.62))}px sans-serif`;
  pen.textBaseline = "middle";
  pen.textAlign = "left";
  const message = `${moonSlogan.toUpperCase()}  ★  ${shuttlePrint.toUpperCase()}  ★  `;
  const span = Math.max(1, pen.measureText(message).width);
  const offset = (seconds * high * 1.6) % span;
  pen.shadowColor = "#ffd166";
  pen.shadowBlur = 8;
  for (let x = -offset; x < wide; x += span) {
    pen.fillStyle = "#ffd166";
    pen.fillText(message, x, high / 2);
  }
  pen.shadowBlur = 0;
  pen.fillStyle = "rgba(0, 0, 0, 0.2)";
  for (let line = 0; line < high; line += 3) pen.fillRect(0, line, wide, 1);
}
