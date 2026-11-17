import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  EquirectangularReflectionMapping,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Texture,
} from "three";

// The freeze ray: a body of mirror-bright chrome that throws rainbow light (a holographic finish, from a painted world it reflects), a
// glass chamber on top where liquid nitrogen sloshes and bubbles, rings at the muzzle that glow ice-blue, and frost motes forever circling
// it. `animate` keeps the liquid moving, the bubbles running and the motes turning. Its muzzle points along +z.
let world: Texture | null | undefined;
function holographic(): Texture | null {
  if (world !== undefined) return world;
  world = null;
  if (typeof document === "undefined") return world;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ink = canvas.getContext("2d");
  if (ink === null) return world;
  const sky = ink.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, "#f4f8ff");
  sky.addColorStop(0.45, "#9fd8ff");
  sky.addColorStop(0.55, "#2a2f45");
  sky.addColorStop(1, "#11131c");
  ink.fillStyle = sky;
  ink.fillRect(0, 0, 256, 128);
  ink.globalAlpha = 0.6;
  ["#ff9ecf", "#ffd166", "#5beac6", "#6aa8ff", "#c9b6ff"].forEach(
    (colour, band) => {
      ink.fillStyle = colour;
      ink.fillRect(band * 51, 36, 30, 56);
    },
  );
  const painted = new CanvasTexture(canvas);
  painted.mapping = EquirectangularReflectionMapping;
  painted.colorSpace = SRGBColorSpace;
  world = painted;
  return world;
}

export interface Ray {
  readonly root: Group;
  animate(seconds: number, kick?: number): void;
}

const motes = 40;
const bubbles = 8;

export function buildRay(): Ray {
  const root = new Group();
  root.name = "freeze-ray";
  const env = holographic();
  const chrome = new MeshStandardMaterial({
    color: "#e8eeff",
    envMap: env,
    envMapIntensity: 1.5,
    metalness: env === null ? 0.6 : 1,
    roughness: 0.08,
  });
  const glass = new MeshStandardMaterial({
    color: "#cdf6ff",
    depthWrite: false,
    opacity: 0.32,
    roughness: 0.05,
    transparent: true,
  });
  const nitrogen = new MeshStandardMaterial({
    color: "#8af0ff",
    emissive: "#5fd8ff",
    emissiveIntensity: 0.9,
    opacity: 0.85,
    transparent: true,
  });
  const ice = new MeshBasicMaterial({ color: "#a8f6ff" });
  const part = (
    mesh: Mesh,
    at: readonly [number, number, number],
    turn: readonly [number, number, number] = [0, 0, 0],
  ): Mesh => {
    mesh.position.set(...at);
    mesh.rotation.set(...turn);
    root.add(mesh);
    return mesh;
  };
  const along: readonly [number, number, number] = [Math.PI / 2, 0, 0];
  const body = new Group();
  root.add(body);
  part(new Mesh(new BoxGeometry(0.11, 0.12, 0.2), chrome), [0, 0, -0.12]);
  part(
    new Mesh(new CylinderGeometry(0.035, 0.046, 0.34, 16), chrome),
    [0, 0, 0.08],
    along,
  );
  part(
    new Mesh(new CylinderGeometry(0.022, 0.03, 0.06, 16), chrome),
    [0, 0, 0.29],
    along,
  );
  part(
    new Mesh(new BoxGeometry(0.036, 0.12, 0.055), chrome),
    [0, -0.09, -0.13],
    [-0.25, 0, 0],
  );
  // Glowing ice-blue seams along the body's sides, and a cold core at its back.
  for (const side of [-1, 1]) {
    part(new Mesh(new BoxGeometry(0.006, 0.06, 0.15), chrome), [
      side * 0.06,
      0.02,
      -0.08,
    ]);
    part(new Mesh(new BoxGeometry(0.004, 0.012, 0.17), ice), [
      side * 0.057,
      -0.025,
      -0.11,
    ]);
  }
  part(new Mesh(new SphereGeometry(0.022, 12, 8), ice), [0, 0.01, -0.225]);
  const rings = [0.2, 0.23, 0.26].map((z) =>
    part(new Mesh(new TorusGeometry(0.05, 0.008, 8, 24), ice), [0, 0, z]),
  );
  // The chamber on top: glass round a column of nitrogen whose bright edge slides back and forth as it sloshes, and bubbles that run.
  part(
    new Mesh(new CylinderGeometry(0.031, 0.031, 0.22, 16), glass),
    [0, 0.085, -0.02],
    along,
  );
  const liquid = part(
    new Mesh(new CylinderGeometry(0.024, 0.024, 0.2, 16), nitrogen),
    [0, 0.085, -0.02],
    along,
  );
  const surface = part(
    new Mesh(new TorusGeometry(0.024, 0.004, 6, 18), ice),
    [0, 0.085, -0.02],
  );
  const fizz = new InstancedMesh(new SphereGeometry(0.006, 6, 4), ice, bubbles);
  const swirl = new InstancedMesh(
    new OctahedronGeometry(0.008),
    new MeshBasicMaterial({ color: "#f4ffff" }),
    motes,
  );
  swirl.name = "frost-motes";
  liquid.name = "nitrogen";
  root.add(fizz, swirl);
  const matrix = new Matrix4();
  const spin = new Quaternion();
  const turn = new Euler();
  const place = new Vector3();
  const size = new Vector3(1, 1, 1);
  return {
    root,
    animate(seconds, kick = 0) {
      body.position.z = -kick * 0.06;
      const slosh =
        Math.sin(seconds * 3.1) * 0.06 + Math.sin(seconds * 7.7) * 0.015;
      liquid.scale.set(1 + slosh * 0.4, 1, 1 - slosh * 0.4);
      surface.position.z = -0.02 + slosh * 1.2;
      surface.rotation.set(0, 0.6 * slosh, 0);
      for (const [index, ring] of rings.entries())
        ring.scale.setScalar(
          1 + kick * 0.8 + 0.06 * Math.sin(seconds * 6 + index),
        );
      for (let index = 0; index < bubbles; index += 1) {
        const run = (seconds * 0.35 + index / bubbles) % 1;
        place.set(
          Math.sin(index * 2.1) * 0.012,
          0.085 + Math.cos(index * 1.7) * 0.01,
          -0.12 + run * 0.2,
        );
        fizz.setMatrixAt(index, matrix.compose(place, spin.identity(), size));
      }
      for (let index = 0; index < motes; index += 1) {
        const around = seconds * (0.6 + (index % 5) * 0.12) + index * 2.4;
        const out = 0.12 + (index % 7) * 0.02;
        place.set(
          Math.cos(around) * out,
          Math.sin(seconds * 0.9 + index) * 0.09 + 0.02,
          Math.sin(around) * out,
        );
        turn.set(seconds + index, seconds * 1.3, 0);
        swirl.setMatrixAt(
          index,
          matrix.compose(place, spin.setFromEuler(turn), size),
        );
      }
      fizz.instanceMatrix.needsUpdate = true;
      swirl.instanceMatrix.needsUpdate = true;
    },
  };
}
