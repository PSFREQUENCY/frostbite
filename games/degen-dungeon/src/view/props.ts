import {
  AdditiveBlending,
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshToonMaterial,
  NormalBlending,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from "three";

import { toonSteps } from "./textures.ts";

// Many small things of a few shapes, drawn a shape at a time however many there are: boxes, balls, pills (rounded bars), posts, discs
// lying flat, cones and rings. Each is solid (cartoon-shaded) or glowing; a glowing one keeps its colour at night. Each shape is the
// size of a unit box, so a thing's size is its size in metres.
export type Shape = "ball" | "box" | "cone" | "disc" | "pill" | "post" | "ring";
export interface Handle {
  readonly index: number;
  readonly key: string;
}
export interface Props {
  add(
    shape: Shape,
    at: readonly [number, number, number],
    size: readonly [number, number, number],
    colour: string,
    glow?: boolean,
    turn?: readonly [number, number, number],
  ): Handle;
  // Builds every shape into the group; `paint` changes one thing's colour afterwards.
  build(): Group;
  paint(handle: Handle, colour: Color): void;
}

const geometryOf = (shape: Shape): BufferGeometry => {
  switch (shape) {
    case "ball":
      return new SphereGeometry(0.5, 16, 12);
    case "box":
      return new BoxGeometry(1, 1, 1);
    case "cone":
      return new ConeGeometry(0.5, 1, 16);
    case "disc":
      return new CircleGeometry(0.5, 24).rotateX(-Math.PI / 2);
    case "pill":
      return new CapsuleGeometry(0.5, 1, 6, 14)
        .rotateZ(Math.PI / 2)
        .scale(0.5, 1, 1);
    case "post":
      return new CylinderGeometry(0.5, 0.5, 1, 16);
    case "ring":
      return new TorusGeometry(0.45, 0.05, 8, 32);
  }
};

export function createProps(name: string): Props {
  const lists = new Map<
    string,
    {
      readonly glow: boolean;
      readonly items: { matrix: Matrix4; colour: string }[];
      readonly shape: Shape;
    }
  >();
  const meshes = new Map<string, InstancedMesh>();
  const rotation = new Quaternion();
  const euler = new Euler();
  return {
    add(
      shape,
      [x, y, z],
      [w, h, d],
      colour,
      glow = false,
      [rx, ry, rz] = [0, 0, 0],
    ) {
      const key = `${shape}:${glow ? "glow" : "solid"}`;
      const list = lists.get(key) ?? { glow, items: [], shape };
      lists.set(key, list);
      list.items.push({
        colour,
        matrix: new Matrix4().compose(
          new Vector3(x, y, z),
          rotation.setFromEuler(euler.set(rx, ry, rz)),
          new Vector3(w, h, d),
        ),
      });
      return { index: list.items.length - 1, key };
    },
    build() {
      const root = new Group();
      root.name = name;
      for (const [key, { glow, items, shape }] of lists) {
        // A glowing cone is a beam of light: see-through and adding to what is behind it.
        const beam = glow && shape === "cone";
        const material = glow
          ? new MeshBasicMaterial({
              blending: beam ? AdditiveBlending : NormalBlending,
              color: "#ffffff",
              depthWrite: !beam,
              opacity: beam ? 0.35 : 1,
              transparent: beam,
            })
          : new MeshToonMaterial({ color: "#ffffff", gradientMap: toonSteps });
        const mesh = new InstancedMesh(
          geometryOf(shape),
          material,
          items.length,
        );
        mesh.name = `${name}-${key}`;
        items.forEach(({ colour, matrix }, index) => {
          mesh.setMatrixAt(index, matrix);
          mesh.setColorAt(index, new Color(colour));
        });
        meshes.set(key, mesh);
        root.add(mesh);
      }
      return root;
    },
    paint({ index, key }, colour) {
      const mesh = meshes.get(key);
      if (mesh === undefined) return;
      mesh.setColorAt(index, colour);
      if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    },
  };
}
