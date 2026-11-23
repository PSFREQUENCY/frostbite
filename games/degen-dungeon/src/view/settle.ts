import {
  InstancedMesh,
  Matrix4,
  Mesh,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Scenery that never moves, made cheap to draw: under a group, the plain meshes that share a material become one mesh (one draw call
// instead of dozens), and nothing unnamed under the group has its place worked out again each frame. A mesh with a name of its own
// (something looked up or moved later), an instanced one, or one that `keep` holds back stays as it is, and so does any set of meshes
// that cannot be joined. Returns how many meshes were drawn before and after.
export function settle(
  root: Object3D,
  keep: (mesh: Mesh) => boolean = () => false,
): readonly [number, number] {
  root.updateMatrixWorld(true);
  const back = new Matrix4().copy(root.matrixWorld).invert();
  const shared = new Map<Material, Mesh[]>();
  let before = 0;
  root.traverse((part) => {
    if (!(part instanceof Mesh)) return;
    before += 1;
    const material: unknown = part.material;
    if (
      part instanceof InstancedMesh ||
      part.name !== "" ||
      Array.isArray(material) ||
      keep(part)
    )
      return;
    shared.set(part.material, [...(shared.get(part.material) ?? []), part]);
  });
  let after = before;
  for (const [material, parts] of shared) {
    if (parts.length < 2) continue;
    const pieces: BufferGeometry[] = parts.map((part) =>
      part.geometry
        .clone()
        .applyMatrix4(new Matrix4().multiplyMatrices(back, part.matrixWorld)),
    );
    const whole = mergeGeometries(pieces);
    if (whole === null) continue;
    for (const part of parts) part.removeFromParent();
    root.add(new Mesh(whole, material));
    after -= parts.length - 1;
  }
  root.traverse((part) => {
    if (part === root || part.name !== "") return;
    part.matrixAutoUpdate = false;
    part.updateMatrix();
  });
  return [before, after];
}
