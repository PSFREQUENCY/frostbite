import {
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  type BufferGeometry,
  type Material,
} from "three";

import { tillCap, tillOf } from "../rules/business.ts";
import { evicted } from "../rules/lofts.ts";
import { lofts, type Room } from "../rules/rooms.ts";
import type { DayState } from "../rules/types.ts";
import { frameOf, front } from "./shops.ts";
import { toonSteps } from "./textures.ts";

// The hero's own loft, as the rules have it today (`rules/lofts.ts`; the room and its living room are `shops.ts`'s): the bed at the back
// facing the door and the freezer by the kitchen counter, or, once the landlord has put them out, the mattress, the freezer, the lamp and
// a stack of boxes on the pavement by the door. The upgrades bought stand where they belong: a patio of decking, chairs and a sunshade
// under string lights beside the door, a balcony with a glass rail and a lit window on the floor above, and on the roof the top floor's
// glass room with the view of the city. On the desk by the door, the laptop that runs the hero's shop shows what is in its till, live,
// with a bar that fills toward a full till.
export interface Lofts {
  readonly root: Group;
  show(day: DayState | null): void;
}

type Part = readonly [
  u: number,
  w: number,
  y: number,
  width: number,
  height: number,
  deep: number,
  colour: string,
  glow?: boolean,
];
const bed: readonly Part[] = [
  [5.6, 1.2, 0.25, 1.8, 0.5, 2.3, "#5a3a2f"],
  [5.6, 1.2, 0.6, 1.7, 0.2, 2.2, "#f4f1ea"],
  [5.6, 1.65, 0.74, 1.74, 0.08, 1.3, "#6a5acd"],
  [5.15, 0.4, 0.78, 0.6, 0.16, 0.4, "#ffffff"],
  [6.05, 0.4, 0.78, 0.6, 0.16, 0.4, "#ffffff"],
  [10.3, 0.6, 1, 0.9, 2, 0.8, "#dfe6ee"],
  [10.3, 1.02, 1.3, 0.05, 0.9, 0.02, "#9fd8ff", true],
];
// On the pavement outside: the mattress on its side, the freezer, three boxes and the lamp.
const out = front + 1.4;
const pile: readonly Part[] = [
  [1.4, out, 0.85, 0.2, 1.7, 2, "#f4f1ea"],
  [2.6, out, 1, 0.9, 2, 0.8, "#dfe6ee"],
  [3.8, out - 0.3, 0.25, 0.8, 0.5, 0.6, "#c98a4b"],
  [3.8, out + 0.4, 0.25, 0.7, 0.5, 0.6, "#b37a40"],
  [3.8, out, 0.7, 0.6, 0.4, 0.5, "#c98a4b"],
  [4.7, out, 0.8, 0.08, 1.6, 0.08, "#2a2f45"],
  [4.7, out, 1.7, 0.4, 0.3, 0.4, "#ffe2b0", true],
];
const patio: readonly Part[] = [
  [9, front + 1.5, 0.08, 3.4, 0.16, 2.6, "#a0703f"],
  [8.1, front + 1.5, 0.45, 0.5, 0.6, 0.5, "#2a2f45"],
  [9.9, front + 1.5, 0.45, 0.5, 0.6, 0.5, "#2a2f45"],
  [9, front + 1.5, 0.55, 0.7, 0.06, 0.7, "#f3e3c3"],
  [9, front + 1.5, 1.4, 0.06, 2.4, 0.06, "#5a3a2f"],
  ...[7.6, 8.5, 9.4, 10.3].map((u): Part => [
    u,
    front + 2.6,
    2.5,
    0.16,
    0.16,
    0.16,
    "#ffd166",
    true,
  ]),
];
// On the flats' second floor, above the name over the door.
const balcony: readonly Part[] = [
  [5.6, front + 0.7, 7, 5.2, 0.2, 1.4, "#c7d2e0"],
  [5.6, front + 1.35, 7.6, 5.2, 1, 0.06, "#9fd8ff"],
  [5.6, front - 0.05, 8.1, 2, 1.6, 0.06, "#ffe2b0", true],
  [3.4, front + 0.7, 7.4, 0.5, 0.8, 0.5, "#3fae6b"],
];
const roof = 10.5;
const view: readonly Part[] = [
  [5.6, 6, roof + 1.5, 6, 3, 6, "#ffe2b0", true],
  [5.6, 6, roof + 3.1, 6.6, 0.2, 6.6, "#2a2f45"],
  [5.6, 11.6, roof + 0.5, 10.6, 1, 0.08, "#9fd8ff"],
];

export function buildLofts(): Lofts {
  const root = new Group();
  root.name = "lofts";
  const unit: BufferGeometry = new BoxGeometry(1, 1, 1);
  const toon = (color: string): Material =>
    new MeshToonMaterial({ color, gradientMap: toonSteps });
  const glass = new MeshBasicMaterial({
    color: "#9fd8ff",
    depthWrite: false,
    opacity: 0.35,
    transparent: true,
  });
  let built: Room | null = null;
  // The laptop's screen, drawn again whenever the till's number changes.
  const canvas =
    typeof document === "undefined" ? null : document.createElement("canvas");
  const pen = canvas?.getContext("2d") ?? null;
  const screen = new Mesh(
    new PlaneGeometry(0.46, 0.29),
    new MeshBasicMaterial({ color: "#0b0d18" }),
  );
  screen.name = "till-screen";
  if (canvas !== null) {
    canvas.width = 256;
    canvas.height = 160;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    screen.material.map = texture;
    screen.material.color.set("#ffffff");
  }
  root.add(screen);
  let drawn = -1;
  const draw = (till: number): void => {
    if (till === drawn || pen === null || canvas === null) return;
    drawn = till;
    pen.fillStyle = "#0b0d18";
    pen.fillRect(0, 0, 256, 160);
    pen.fillStyle = "#5beac6";
    pen.font = "bold 26px sans-serif";
    pen.fillText("MY SHOP · SALES", 14, 36);
    pen.fillStyle = "#ffd166";
    pen.font = "bold 46px sans-serif";
    pen.fillText(`${till.toLocaleString("en-US")} DUN`, 14, 96);
    pen.fillStyle = "#22304d";
    pen.fillRect(14, 120, 228, 22);
    pen.fillStyle = "#3fae6b";
    pen.fillRect(14, 120, Math.round((228 * till) / tillCap), 22);
    if (screen.material.map !== null) screen.material.map.needsUpdate = true;
  };
  const groups = ["bed", "pile", "patio", "balcony", "view"].map((name) => {
    const group = new Group();
    group.name = `loft-${name}`;
    root.add(group);
    return group;
  });
  const [inside, kerb, terrace, upstairs, top] = groups;
  const furnish = (room: Room): void => {
    const { toX, toZ } = frameOf(room);
    const fill = (group: Group | undefined, parts: readonly Part[]): void => {
      group?.traverse((part) => {
        if (!(part instanceof Mesh)) return;
        const { material } = part;
        for (const one of Array.isArray(material) ? material : [material])
          if (one !== glass) one.dispose();
      });
      group?.clear();
      for (const [u, w, y, width, height, deep, colour, glow] of parts) {
        const material =
          glow === true
            ? new MeshBasicMaterial({ color: colour })
            : colour === "#9fd8ff"
              ? glass
              : toon(colour);
        const mesh = new Mesh(unit, material);
        mesh.scale.set(width, height, deep);
        mesh.position.set(toX(u), y, toZ(w));
        group?.add(mesh);
      }
    };
    fill(inside, bed);
    fill(kerb, pile);
    fill(terrace, patio);
    fill(upstairs, balcony);
    fill(top, view);
    // Over the desk's glowing screen, facing the chair.
    screen.position.set(toX(9.9), 0.93, toZ(9.4));
    screen.rotation.y = room.north ? 0 : Math.PI;
    // The patio's sunshade, and a telescope on the top floor's terrace.
    const shade = new Mesh(new ConeGeometry(1.5, 0.7, 12), toon("#ff5d5d"));
    shade.position.set(toX(9), 2.8, toZ(front + 1.5));
    terrace?.add(shade);
    const scope = new Mesh(new SphereGeometry(0.3, 10, 8), toon("#c9b38a"));
    scope.position.set(toX(9.6), roof + 0.6, toZ(10.4));
    top?.add(scope);
    built = room;
  };
  return {
    root,
    show(day) {
      const room = day === null ? undefined : lofts[day.hero];
      root.visible = day !== null && room !== undefined;
      if (day === null || room === undefined) return;
      if (built !== room) furnish(room);
      draw(tillOf(day));
      const out = evicted(day);
      for (const [group, shown] of [
        [inside, !out],
        [kerb, out],
        [terrace, day.loft >= 1],
        [upstairs, day.loft >= 2],
        [top, day.loft >= 3],
      ] as const)
        if (group !== undefined) group.visible = shown;
    },
  };
}
