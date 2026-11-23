import {
  BoxGeometry,
  BufferAttribute,
  Color,
  DataTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PlaneGeometry,
  RGBAFormat,
  SphereGeometry,
  SRGBColorSpace,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { DayState } from "../rules/types.ts";
import { venues } from "../rules/venues.ts";
import { paint } from "./pixel-art.ts";
import { addNeon, glowMap, lightOf } from "./neon.ts";
import { toonSteps } from "./textures.ts";
import { tint } from "./venue-kits.ts";

// The Pixel Vault Gallery's art (the hall is `venues.ts`'s, its walls vault-dark so the light shows): round the wall, twelve original
// pieces of pixel art (`pixel-art.ts`), each in a frame of neon tube pulsing its own colour, its light spread on the wall round it, a gold
// plate below; and on an easel at the back of the floor, where a print is bought, the piece of the day, lit gold with sparkles circling
// it until it is bought, when a red dot goes on its plate, as galleries mark what has sold. The walls take four draws.
export interface GalleryArt {
  readonly root: Group;
  show(day: DayState | null, seconds: number): void;
}

const cell = 16;
const across = 4;
const side = cell * across;
export const pieceCount = 12;
// The square of the atlas that the easel's piece is painted in.
const featured = pieceCount;
const tube = 0.16;
const canvasSize = 2.6;
const wallRadius = 18.25;
const hang = 3.4;
const easelB = -7.8;
export const soldId = "did-print";

// Every piece in one picture, four across and four down, painted pixel by pixel, sharp when near.
export function atlas(): DataTexture {
  const data = new Uint8Array(side * side * 4).fill(255);
  for (let index = 0; index <= featured; index += 1) {
    const [col, row] = [index % across, Math.floor(index / across)];
    paint((x, y, [r, g, b]) => {
      const at = ((side - 1 - (row * cell + y)) * side + col * cell + x) * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
    }, index);
  }
  const map = new DataTexture(data, side, side, RGBAFormat);
  map.magFilter = NearestFilter;
  map.minFilter = NearestFilter;
  map.colorSpace = SRGBColorSpace;
  map.needsUpdate = true;
  return map;
}

// A square showing piece `index` of the atlas.
const canvasOf = (index: number, size: number): PlaneGeometry => {
  const plane = new PlaneGeometry(size, size);
  const uv = plane.getAttribute("uv");
  const [col, row] = [index % across, Math.floor(index / across)];
  for (let k = 0; k < uv.count; k += 1)
    uv.setXY(
      k,
      (col + 0.002 + uv.getX(k) * 0.996) / across,
      (across - 1 - row + 0.002 + uv.getY(k) * 0.996) / across,
    );
  return plane;
};
// The four tubes of a frame round a square of `size`, in front of it, coloured white for the frame's colour to be painted on.
const frameOf = (size: number): BufferGeometry[] =>
  [
    [size + 2 * tube, tube, 0, size / 2 + tube / 2],
    [size + 2 * tube, tube, 0, -size / 2 - tube / 2],
    [tube, size, -size / 2 - tube / 2, 0],
    [tube, size, size / 2 + tube / 2, 0],
  ].map(([w = 0, h = 0, x = 0, y = 0]) =>
    new BoxGeometry(w, h, tube).translate(x, y, 0.04),
  );
const coloured = (geometry: BufferGeometry): BufferGeometry => {
  const count = geometry.getAttribute("position").count;
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(count * 3).fill(1), 3),
  );
  return geometry;
};
const merged = (parts: BufferGeometry[]): BufferGeometry =>
  mergeGeometries(parts) ?? new BoxGeometry(0, 0, 0);

export function buildGalleryArt(): GalleryArt {
  const root = new Group();
  root.name = "gallery-art";
  const venue = venues.find((one) => one.kind === "gallery");
  const map = atlas();
  if (venue === undefined) return { root, show: () => undefined };
  const [cx, cz, out] = [venue.middle.x / 100, venue.middle.z / 100, venue.out];
  const canvases: BufferGeometry[] = [];
  const frames: BufferGeometry[] = [];
  const halos: BufferGeometry[] = [];
  const plates: BufferGeometry[] = [];
  const colours: Color[] = [];
  for (let index = 0; index < pieceCount; index += 1) {
    const angle = 0.6 + ((Math.PI * 2 - 1.2) * (index + 0.5)) / pieceCount;
    const [x, z] = [
      cx + Math.sin(angle) * wallRadius * out,
      cz + Math.cos(angle) * wallRadius * out,
    ];
    const facing = Math.atan2(cx - x, cz - z);
    const hung = (geometry: BufferGeometry): BufferGeometry =>
      geometry.rotateY(facing).translate(x, hang, z);
    canvases.push(hung(canvasOf(index, canvasSize)));
    frames.push(...frameOf(canvasSize).map((bar) => hung(coloured(bar))));
    halos.push(
      hung(coloured(new PlaneGeometry(5.6, 5.6).translate(0, 0, -0.06))),
    );
    plates.push(
      hung(new BoxGeometry(0.6, 0.14, 0.05).translate(0, -1.75, 0.03)),
    );
    colours.push(new Color(tint(index * 5 + 1)));
  }
  const art = new MeshBasicMaterial({ map, toneMapped: false });
  const lit = new MeshBasicMaterial({ toneMapped: false, vertexColors: true });
  const glow = lightOf("#ffffff", false, glowMap);
  glow.vertexColors = true;
  const gold = new MeshToonMaterial({
    color: "#e0b341",
    gradientMap: toonSteps,
  });
  const tubes = new Mesh(merged(frames), lit);
  tubes.name = "gallery-frames";
  const light = new Mesh(merged(halos), glow);
  light.name = "gallery-glow";
  root.add(
    new Mesh(merged(canvases), art),
    tubes,
    light,
    new Mesh(merged(plates), gold),
  );
  // The easel at the back of the floor, facing the doorway, with the piece of the day.
  const easel = new Group();
  easel.name = "gallery-easel";
  easel.position.set(cx, 0, cz + easelB * out);
  easel.rotation.y = out === 1 ? 0 : Math.PI;
  const wood = new MeshToonMaterial({
    color: "#8a5a3a",
    gradientMap: toonSteps,
  });
  // Two legs behind the canvas leaning back, and a third behind them leaning in.
  const leg = (x: number, z: number, lean: number): Mesh => {
    const mesh = new Mesh(new BoxGeometry(0.07, 3, 0.07), wood);
    mesh.position.set(x, 1.45, z);
    mesh.rotation.set(lean, 0, -x * 0.12);
    return mesh;
  };
  const ledge = new Mesh(new BoxGeometry(1.8, 0.08, 0.24), wood);
  ledge.position.set(0, 1.05, 0.12);
  const plate = new Mesh(new BoxGeometry(0.6, 0.14, 0.04), gold);
  plate.position.set(0, 0.98, 0.25);
  const dot = new Mesh(
    new SphereGeometry(0.06, 10, 8),
    new MeshBasicMaterial({ color: "#ff2d3d", toneMapped: false }),
  );
  dot.name = "gallery-sold";
  dot.position.set(0.22, 0.98, 0.28);
  const piece = new Group();
  piece.position.set(0, 2.25, 0.1);
  piece.rotation.x = -0.1;
  const canvas = new Mesh(canvasOf(featured, 2.2), art);
  const rim = new Mesh(
    merged(frameOf(2.2)),
    new MeshBasicMaterial({ color: "#ffd166", toneMapped: false }),
  );
  piece.add(canvas, rim);
  easel.add(
    leg(-0.55, -0.08, -0.1),
    leg(0.55, -0.08, -0.1),
    leg(0, -0.75, 0.25),
    ledge,
    plate,
    dot,
    piece,
  );
  const neon = addNeon(piece, {
    colour: "#ffd166",
    edge: 0.04,
    edged: (mesh) => mesh === rim,
    halo: 4.4,
    ring: 1.8,
    sparkles: 10,
  });
  const sparkles = neon.root.getObjectByName("neon-sparkles");
  root.add(easel);
  const shade = new Color();
  return {
    root,
    show(day, seconds) {
      const colour = tubes.geometry.getAttribute("color");
      const spread = light.geometry.getAttribute("color");
      const bars = colour.count / pieceCount;
      const corners = spread.count / pieceCount;
      colours.forEach((base, index) => {
        const beat = 0.5 + 0.5 * Math.sin(seconds * 2.2 + index * 1.3);
        shade.copy(base).multiplyScalar(0.55 + 0.45 * beat);
        for (let k = 0; k < bars; k += 1)
          colour.setXYZ(index * bars + k, shade.r, shade.g, shade.b);
        shade.copy(base).multiplyScalar(0.35 + 0.3 * beat);
        for (let k = 0; k < corners; k += 1)
          spread.setXYZ(index * corners + k, shade.r, shade.g, shade.b);
      });
      colour.needsUpdate = true;
      spread.needsUpdate = true;
      const sold = day !== null && day.done.includes(soldId);
      dot.visible = sold;
      if (sparkles !== undefined) sparkles.visible = !sold;
      neon.show(seconds, sold ? 0.35 : 1);
    },
  };
}
