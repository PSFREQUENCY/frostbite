import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";

import { nextStop, stopAt } from "../rules/business.ts";
import { haus, inLobby, penthouseFloor } from "../rules/haus.ts";
import { lofts } from "../rules/rooms.ts";
import type { DayState } from "../rules/types.ts";
import { venues } from "../rules/venues.ts";
import { loop } from "../rules/world.ts";
import { storeyHeight } from "./haus-floors.ts";
import { frameOf } from "./shops.ts";
import { toonSteps } from "./textures.ts";
import { paintAd, paintBand } from "./tv-ad.ts";

// The island's TVs, every one looping the same commercial (`tv-ad.ts`): on the wall of the hero's loft, a big one in the sky penthouse
// facing the sofa, one on a post at every Green Line station, and over ADOR's doorway a great curved screen wrapping its drum, with a
// band under it where the slogan scrolls past. One picture, painted eight times a second, feeds all the TVs; the band has its own.
export interface Tvs {
  readonly root: Group;
  show(day: DayState | null, seconds: number): void;
}

type Painter = (
  pen: CanvasRenderingContext2D,
  wide: number,
  high: number,
  seconds: number,
) => void;
interface Screen {
  readonly material: MeshBasicMaterial;
  paint(seconds: number): void;
}
export const paintings = 8;

// A picture to paint again and again, or a plain glow where the page has no canvas.
function screenOf(wide: number, high: number, painter: Painter): Screen {
  const canvas =
    typeof document === "undefined" ? null : document.createElement("canvas");
  const pen = canvas?.getContext("2d") ?? null;
  if (canvas === null || pen === null)
    return {
      material: new MeshBasicMaterial({ color: "#2a1250", toneMapped: false }),
      paint: () => undefined,
    };
  canvas.width = wide;
  canvas.height = high;
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return {
    material: new MeshBasicMaterial({ map, toneMapped: false }),
    paint(seconds) {
      painter(pen, wide, high, seconds);
      map.needsUpdate = true;
    },
  };
}

export function buildTvs(): Tvs {
  const root = new Group();
  root.name = "tvs";
  const ad = screenOf(192, 108, paintAd);
  const band = screenOf(512, 48, paintBand);
  const shell = new MeshToonMaterial({
    color: "#11131c",
    gradientMap: toonSteps,
  });
  // A TV: a dark case with the picture on its front, facing +z.
  const tv = (wide: number, name: string): Group => {
    const set = new Group();
    set.name = name;
    const box = new Mesh(
      new BoxGeometry(wide + 0.12, wide * 0.5625 + 0.12, 0.1),
      shell,
    );
    const picture = new Mesh(
      new PlaneGeometry(wide, wide * 0.5625),
      ad.material,
    );
    picture.position.z = 0.06;
    set.add(box, picture);
    root.add(set);
    return set;
  };
  const loftTv = tv(2.2, "tv-loft");
  const penthouseTv = tv(3.4, "tv-penthouse");
  penthouseTv.position.set(
    haus.x / 100 - 3.5,
    penthouseFloor * storeyHeight + 1.6,
    haus.z / 100 - 10.5,
  );
  // At the stations: on a post beside the lift, facing the same way as the station's sign.
  for (const borough of loop) {
    const at = stopAt(borough);
    const next = stopAt(nextStop(borough));
    const across = Math.abs(next.x - at.x) > Math.abs(next.z - at.z);
    const set = tv(1.6, `tv-station-${String(borough)}`);
    const [sx, sz] = across ? [0.9, 2.6] : [2.6, 0.9];
    set.position.set(at.x / 100 + sx, 2.3, at.z / 100 + sz);
    set.rotation.y = across ? Math.PI / 2 : 0;
    const post = new Mesh(new CylinderGeometry(0.06, 0.06, 1.5, 6), shell);
    post.position.set(at.x / 100 + sx, 0.75, at.z / 100 + sz);
    root.add(post);
  }
  // ADOR's great screen over its doorway, curved round its drum, and the band where the slogan scrolls.
  const ador = venues.find((venue) => venue.kind === "store");
  const front = ador === undefined || ador.out === 1 ? 0 : Math.PI;
  const curved = (
    high: number,
    arc: number,
    y: number,
    material: MeshBasicMaterial,
    name: string,
  ): void => {
    const radius = 18.9;
    const mesh = new Mesh(
      new CylinderGeometry(
        radius,
        radius,
        high,
        32,
        1,
        true,
        front - arc / radius / 2,
        arc / radius,
      ),
      material,
    );
    mesh.name = name;
    mesh.position.set(
      (ador?.middle.x ?? 0) / 100,
      y,
      (ador?.middle.z ?? 0) / 100,
    );
    root.add(mesh);
  };
  curved(4, 12, 11.6, ad.material, "tv-ador");
  curved(1, 18, 5, band.material, "tv-ador-band");
  let painted = -1;
  return {
    root,
    show(day, seconds) {
      root.visible = day !== null;
      if (day === null) return;
      // In the hero's own loft, on the wall across from the desk.
      const loft = lofts[day.hero];
      loftTv.visible = loft !== undefined;
      if (loft !== undefined) {
        const { toX, toZ } = frameOf(loft);
        loftTv.position.set(toX(0.12), 1.7, toZ(5.2));
        loftTv.rotation.y = Math.PI / 2;
      }
      // Up in the tower, the penthouse's TV only shows on its own floor (the floors above the hero are cut away).
      const inside =
        day.floor > 0 || day.elevator !== null || inLobby(day.x, day.z);
      penthouseTv.visible = !inside || day.floor === penthouseFloor;
      const frame = Math.floor(seconds * paintings);
      if (frame === painted) return;
      painted = frame;
      ad.paint(seconds);
      band.paint(seconds);
    },
  };
}
