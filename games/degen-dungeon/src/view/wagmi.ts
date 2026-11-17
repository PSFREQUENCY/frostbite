import {
  BoxGeometry,
  Color,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
} from "three";

import { letters, scaffold, signFace, signThick } from "../rules/mountain.ts";
import { hash } from "./hash.ts";
import { letterHeight, outlines, topOf } from "./letters.ts";
import { canvasOf } from "./textures.ts";

// The WAGMI sign on Mount WAGMI's ridge (`rules/mountain.ts`): five tall block letters of white-painted sheet, panel by panel and
// weathered at the foot, each ten metres tall (about six heroes) and standing on the terrace facing the city, held up from behind by a
// scaffold of wooden planks: posts behind every stroke, braces down to the hillside, ties between the posts and struts to the braces.
// It is an original sign in the spirit of the great hillside letters, spelling the island's own word.
const tall = letterHeight;
const shapeOf = (char: string): Shape => {
  const { hole, outer } = outlines[char] ?? { outer: [] };
  const shape = new Shape(outer.map(([x, y]) => new Vector2(x, y)));
  if (hole !== undefined)
    shape.holes.push(new Shape(hole.map(([x, y]) => new Vector2(x, y))));
  return shape;
};

// White sheet in panels a metre wide, with the grime of the hillside rising up the foot.
const panels = canvasOf(128, 256, (ink) => {
  ink.fillStyle = "#f4f1ea";
  ink.fillRect(0, 0, 128, 256);
  const dirt = ink.createLinearGradient(0, 256, 0, 150);
  dirt.addColorStop(0, "rgba(140, 112, 76, 0.55)");
  dirt.addColorStop(1, "rgba(140, 112, 76, 0)");
  ink.fillStyle = dirt;
  ink.fillRect(0, 150, 128, 106);
  ink.fillStyle = "#d3ccbd";
  for (const x of [0, 32, 64, 96]) ink.fillRect(x, 0, 2, 256);
  for (let speck = 0; speck < 90; speck += 1) {
    ink.fillStyle = `rgba(120, 100, 80, ${String(0.1 + hash(speck, 4, 2) * 0.2)})`;
    ink.fillRect(hash(speck, 1, 7) * 128, hash(speck, 9, 3) * 256, 2, 2);
  }
});
if (panels !== null) panels.repeat.set(1 / 4, 1 / tall);

export interface Sign {
  readonly root: Group;
}

export function buildSign(ground: number): Sign {
  const root = new Group();
  root.name = "wagmi-sign";
  const face = new MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#fff6e6",
    emissiveIntensity: 0.06,
    map: panels,
    roughness: 0.75,
  });
  const edge = new MeshStandardMaterial({ color: "#d9d3c7", roughness: 0.8 });
  for (const letter of letters) {
    const mesh = new Mesh(
      new ExtrudeGeometry(shapeOf(letter.char), {
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: 0.04,
        bevelThickness: 0.04,
        depth: signThick / 100 - 0.08,
      }),
      [face, edge],
    );
    // The outline runs along the sign from north to south and up; its depth runs from the face back toward the scaffold.
    mesh.name = `letter-${letter.char}`;
    mesh.rotation.y = -Math.PI / 2;
    mesh.position.set(
      signFace / 100 + signThick / 100 - 0.04,
      ground,
      letter.z0 / 100,
    );
    mesh.castShadow = true;
    root.add(mesh);
  }
  root.add(buildScaffold(ground));
  return { root };
}

// The planks: a box's matrix from one end to the other (metres), this thick and this wide.
const along = new Vector3();
const middle = new Vector3();
const turn = new Quaternion();
const size = new Vector3();
const xAxis = new Vector3(1, 0, 0);
function plank(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  thick: number,
  wide: number,
): Matrix4 {
  along.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const length = along.length();
  middle.set(
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  );
  turn.setFromUnitVectors(xAxis, along.normalize());
  return new Matrix4().compose(middle, turn, size.set(length, thick, wide));
}

function buildScaffold(ground: number): InstancedMesh {
  const back = signFace / 100 + signThick / 100 + 0.2;
  const reach = signFace / 100 + scaffold / 100 - 0.4;
  const boards: Matrix4[] = [];
  for (const letter of letters) {
    const width = (letter.z1 - letter.z0) / 100;
    const count = Math.max(2, Math.round((width - 0.6) / 1.5) + 1);
    const posts = Array.from({ length: count }, (_, index) => {
      const at = 0.3 + ((width - 0.6) * index) / (count - 1);
      return {
        high: Math.max(2.4, topOf(letter.char, at) - 0.35),
        z: letter.z0 / 100 + at,
      };
    });
    for (const { high, z } of posts) {
      const brace = high * 0.8;
      boards.push(
        plank([back, ground, z], [back, ground + high, z], 0.24, 0.24),
        plank([back, ground + brace, z], [reach, ground, z], 0.18, 0.2),
        plank(
          [back, ground + high * 0.42, z],
          [back + (reach - back) * 0.48, ground + high * 0.42, z],
          0.16,
          0.16,
        ),
      );
    }
    posts.forEach((post, index) => {
      const next = posts[index + 1];
      if (next === undefined) return;
      for (const high of [1.5, Math.min(post.high, next.high) - 0.7])
        boards.push(
          plank(
            [back + 0.16, ground + high, post.z - 0.12],
            [back + 0.16, ground + high, next.z + 0.12],
            0.26,
            0.08,
          ),
        );
    });
    const first = letter.z0 / 100 + 0.1;
    const last = letter.z1 / 100 - 0.1;
    boards.push(
      plank([back, ground + 0.1, first], [back, ground + 0.1, last], 0.2, 0.4),
      plank(
        [reach, ground + 0.1, first],
        [reach, ground + 0.1, last],
        0.2,
        0.4,
      ),
    );
  }
  const wood = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ flatShading: true, roughness: 0.9 }),
    boards.length,
  );
  wood.name = "scaffold";
  const tint = new Color();
  boards.forEach((matrix, index) => {
    wood.setMatrixAt(index, matrix);
    wood.setColorAt(
      index,
      tint.set("#8a5d3b").offsetHSL(0, 0, (hash(index, 6, 1) - 0.5) * 0.12),
    );
  });
  wood.castShadow = true;
  return wood;
}
