import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  type Material,
} from "three";

import { painted } from "./boards.ts";
import { buildLookout, frameFor } from "./frame.ts";
import { box } from "./hash.ts";
import { coreOf, cornerOf } from "./lots.ts";
import { murals } from "./prints.ts";
import { toonSteps } from "./textures.ts";
import { buildVenue } from "./venue-kits.ts";
import { crowns, venueLots } from "./venue-lots.ts";

// The landmarks of Nakasato (`venue-lots.ts` says which lot holds which): a library, a bank, a museum, an art gallery of glowing frames, a
// virtual-reality dome, a giant arcade, three night clubs with searchlights, a record label's tower with an equaliser down its front, a
// creator studio with an on-air light, a skate park, and a green. Lookout posts stand in the parks, NFT vending machines glow on the
// pavements outside the landmarks, the tallest tower in most boroughs wears a company's name on its crown, and murals and graffiti cover
// the skate park's wall. At night the neon brightens, the searchlights sweep and the equaliser dances.
export interface Venues {
  readonly root: Group;
  show(seconds: number, night: number): void;
}

const lookouts: readonly (readonly [string, number, number])[] = [
  ["2-0", 21, 21],
  ["2-2", 30, 12],
  ["8-2", 34, 34],
];

export function buildVenues(): Venues {
  const root = new Group();
  root.name = "venues";
  const glows: Material[] = [];
  const beams: Mesh[] = [];
  const bars: Mesh[] = [];
  const machines: [number, number][] = [];
  for (const [lot, [kind, name]] of Object.entries(venueLots)) {
    const [borough = 0, corner = 0] = lot.split("-").map(Number);
    const [x0, z0] = cornerOf(borough, corner);
    // Corner 1 faces the street to its south, corner 2 the one to its north.
    const front = corner === 1 ? 1 : -1;
    const group = new Group();
    group.name = `venue-${kind}`;
    buildVenue(kind, name, frameFor(group, x0, z0, front, glows));
    for (const child of group.children)
      if (child instanceof Mesh) {
        if (child.name === "beam") {
          child.material = new MeshBasicMaterial({
            blending: AdditiveBlending,
            color: "#bfe9ff",
            depthWrite: false,
            opacity: 0.22,
            transparent: true,
          });
          beams.push(child);
        }
        if (child.name === "equalizer") bars.push(child);
        if (child.name === "mural-wall") {
          const art = murals();
          if (art !== null)
            child.material = new MeshToonMaterial({
              gradientMap: toonSteps,
              map: art,
            });
        }
      }
    root.add(group);
    const kerb = front === 1 ? z0 + 43.2 : z0 - 1.2;
    machines.push([x0 + 6, kerb], [x0 + 36, kerb]);
  }
  for (const [lot, u, w] of lookouts) {
    const [borough = 0, corner = 0] = lot.split("-").map(Number);
    const [x0, z0] = cornerOf(borough, corner);
    buildLookout(frameFor(root, x0, z0, 1, glows), u, w);
  }
  // NFT vending machines: a glowing front, a dark body.
  const bodies = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    new MeshToonMaterial({ color: "#2a2350", gradientMap: toonSteps }),
    machines.length,
  );
  bodies.name = "nft-vending";
  const screens = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    new MeshBasicMaterial({ color: "#ffffff" }),
    machines.length,
  );
  screens.name = "nft-screens";
  machines.forEach(([x, z], index) => {
    bodies.setMatrixAt(index, box(x, 1, z, 1, 2, 0.8));
    screens.setMatrixAt(index, box(x, 1.2, z, 0.8, 1.2, 0.86));
    screens.setColorAt(
      index,
      new Color(["#ff3df2", "#5beac6", "#ffd166"][index % 3] ?? "#ffffff"),
    );
  });
  root.add(bodies, screens);
  // A company's name on the crown of the tallest tower in most boroughs.
  for (const [borough, name] of Object.entries(crowns)) {
    const core = [0, 3]
      .map((corner) => coreOf(Number(borough), corner))
      .find((found) => found !== null);
    if (core === undefined || core === null) continue;
    const [x0, x1, z0, z1] = core.box;
    const crown = new Mesh(
      new BoxGeometry(x1 - x0 + 0.6, 1.2, z1 - z0 + 0.6),
      new MeshBasicMaterial({ color: "#fff1b8" }),
    );
    glows.push(crown.material);
    crown.position.set((x0 + x1) / 2, core.height + 0.6, (z0 + z1) / 2);
    const sign = new Mesh(
      new BoxGeometry(14, 4, 0.4),
      painted(name, "#ffd166"),
    );
    sign.name = "crown-sign";
    sign.position.set((x0 + x1) / 2, core.height + 3.6, z1 + 0.4);
    root.add(crown, sign);
  }
  const bases = glows.map((material) =>
    material instanceof MeshBasicMaterial ? material.color.clone() : null,
  );
  return {
    root,
    show(seconds, night) {
      const bright = 0.55 + night * 0.45;
      glows.forEach((material, index) => {
        const base = bases[index];
        if (material instanceof MeshBasicMaterial && base != null)
          material.color.copy(base).multiplyScalar(bright);
      });
      beams.forEach((beam, index) => {
        beam.visible = night > 0.3;
        beam.rotation.z = Math.sin(seconds * 0.8 + index) * 0.5;
        beam.rotation.x = Math.cos(seconds * 0.6 + index * 2) * 0.4;
      });
      bars.forEach((bar, index) => {
        bar.scale.y =
          12 +
          (Math.sin(seconds * (3 + index * 0.7) + index) * 0.5 + 0.5) *
            22 *
            (0.4 + night);
      });
    },
  };
}
