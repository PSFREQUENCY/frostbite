import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshToonMaterial,
} from "three";

import { block } from "../rules/constants.ts";
import { boardLines, painted } from "./boards.ts";
import { hash } from "./hash.ts";
import { kerbs, type Kerb } from "./kerbs.ts";
import { posters } from "./prints.ts";
import { createShell } from "./shell.ts";
import { toonSteps } from "./textures.ts";

// What is pasted and posted along the streets: posters on the walls (just in front of the shop fronts), flyers on the lamp posts, and a
// billboard on a pole over every borough's crossroads, one facing each way, low enough to read from the street.
export function buildNotices(lamps: readonly Kerb[]): Group {
  const root = new Group();
  root.name = "notices";
  // Posters on the walls (just in front of the shop fronts) and flyers on the lamp posts, from one sheet of eight.
  const sheet = createShell();
  const pick = (index: number) => {
    const kind = Math.floor(hash(index, 7, 7) * 8);
    const u0 = (kind % 4) / 4;
    const v0 = kind < 4 ? 0.5 : 0;
    return [u0, v0, u0 + 0.25, v0 + 0.5] as const;
  };
  kerbs(13, -0.1, 5).forEach(({ turn, x, z }, index) => {
    if (hash(index, 2, 5) > 0.55) return;
    const [dx, dz] = [Math.cos(turn) * 0.6, -Math.sin(turn) * 0.6];
    sheet.quad([x - dx, z - dz, x + dx, z + dz], 0.9, 2.7, pick(index));
  });
  lamps.forEach(({ turn, x, z }, index) => {
    if (index % 3 !== 0) return;
    const [dx, dz] = [Math.cos(turn) * 0.2, -Math.sin(turn) * 0.2];
    const [ox, oz] = [Math.sin(turn) * 0.1, Math.cos(turn) * 0.1];
    sheet.quad(
      [x - dx + ox, z - dz + oz, x + dx + ox, z + dz + oz],
      1.3,
      1.9,
      pick(index + 99),
    );
  });
  const print = posters();
  const sheetMaterial = new MeshToonMaterial({
    color: print === null ? "#ffd166" : "#ffffff",
    gradientMap: toonSteps,
    map: print,
  });
  const pasted = new Mesh(sheet.geometry(), sheetMaterial);
  pasted.name = "posters";
  root.add(pasted);
  // A billboard on a pole over each borough's crossroads, one facing each way along the middle streets.
  const frame = new MeshToonMaterial({
    color: "#2a2f45",
    gradientMap: toonSteps,
  });
  for (let borough = 0; borough < 9; borough += 1) {
    const cx = (block * (borough % 3)) / 100 + 60;
    const cz = (block * Math.floor(borough / 3)) / 100 + 60;
    const lines = boardLines[borough % boardLines.length] ?? [];
    for (const [index, [x, z, turn]] of (
      [
        [cx - 14, cz - 12, Math.PI / 2],
        [cx + 12, cz + 14, 0],
      ] as const
    ).entries()) {
      const face = new Mesh(new BoxGeometry(7, 3.2, 0.2), [
        frame,
        frame,
        frame,
        frame,
        painted(lines[(borough + index) % lines.length] ?? "GM", "#5beac6"),
        frame,
      ]);
      face.name = "street-board";
      face.position.set(x, 7.2, z);
      face.rotation.y = turn;
      const pole = new Mesh(new CylinderGeometry(0.2, 0.25, 5.6, 6), frame);
      pole.position.set(x, 2.8, z);
      root.add(face, pole);
    }
  }
  return root;
}
