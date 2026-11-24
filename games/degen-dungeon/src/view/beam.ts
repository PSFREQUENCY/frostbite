import {
  AdditiveBlending,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
} from "three";

// A shot: a white-hot core and an ice-blue glow along the ray's reach, rings of bent light running down it (each a lens of clear glass
// that warps what is behind it, as gravity would), and frost lifting off it in a spiral. `show` draws it from a muzzle along a heading,
// for half a second after the trigger.
export interface Beam {
  readonly root: Group;
  show(from: Vector3, heading: number, reach: number, age: number): void;
}
const lifted = 60;

export function buildBeam(): Beam {
  const root = new Group();
  root.name = "freeze-beam";
  const glowing = (colour: string, opacity: number): MeshBasicMaterial =>
    new MeshBasicMaterial({
      blending: AdditiveBlending,
      color: colour,
      depthWrite: false,
      opacity,
      transparent: true,
    });
  const core = new Mesh(
    new CylinderGeometry(0.05, 0.05, 1, 8, 1, true),
    glowing("#f4ffff", 0.95),
  );
  const halo = new Mesh(
    new CylinderGeometry(0.17, 0.17, 1, 12, 1, true),
    glowing("#5fd8ff", 0.35),
  );
  const lens = new MeshPhysicalMaterial({
    color: "#ffffff",
    emissive: "#5fd8ff",
    emissiveIntensity: 0.3,
    ior: 1.9,
    roughness: 0,
    thickness: 0.8,
    transmission: 1,
  });
  const warps = Array.from(
    { length: 5 },
    () => new Mesh(new TorusGeometry(0.5, 0.07, 10, 28), lens),
  );
  const frost = new InstancedMesh(
    new OctahedronGeometry(0.03),
    glowing("#c9f6ff", 0.9),
    lifted,
  );
  root.add(core, halo, frost, ...warps);
  const matrix = new Matrix4();
  const spin = new Quaternion();
  const place = new Vector3();
  const size = new Vector3(1, 1, 1);
  const up = new Vector3(0, 1, 0);
  const way = new Vector3();
  return {
    root,
    show(from, heading, reach, age) {
      root.visible = age >= 0 && age < 0.5;
      if (!root.visible) return;
      way.set(Math.cos(heading), 0, Math.sin(heading));
      const fade = 1 - age / 0.5;
      spin.setFromUnitVectors(up, way);
      for (const ray of [core, halo]) {
        ray.position.copy(from).addScaledVector(way, reach / 2);
        ray.quaternion.copy(spin);
        ray.scale.set(fade, reach, fade);
      }
      warps.forEach((ring, index) => {
        const run = Math.min(1, age * 2.4 + index * 0.18);
        ring.position.copy(from).addScaledVector(way, run * reach);
        ring.quaternion.copy(spin);
        ring.rotateX(Math.PI / 2);
        ring.scale.setScalar(0.4 + run * 1.4);
      });
      for (let index = 0; index < lifted; index += 1) {
        const at = (index / lifted) * reach;
        const around = index * 0.9 + age * 9;
        place
          .copy(from)
          .addScaledVector(way, at)
          .add(
            new Vector3(
              -way.z * Math.cos(around) * 0.35,
              Math.sin(around) * 0.35 + age * 2.2,
              way.x * Math.cos(around) * 0.35,
            ),
          );
        frost.setMatrixAt(
          index,
          matrix.compose(place, spin.identity(), size.setScalar(fade)),
        );
      }
      frost.instanceMatrix.needsUpdate = true;
    },
  };
}
