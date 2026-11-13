import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";

import { block, island, lots } from "../rules/constants.ts";
import { spots, type Spot } from "../rules/places.ts";
import { boroughs, centreOf } from "../rules/world.ts";

// Nakasato, built in code from the same numbers the rules walk on: the island, the sea, a block of towers on every lot and a marker on
// every spot. It is a stand-in the right size and in the right place: the kit of real buildings, billboards and street dressing goes here.
export const metres = (centimetres: number): number => centimetres / 100;

// A borough's own colour and how tall it builds, in the order of `boroughs`.
const tints = [
  "#3d6c8f",
  "#2f8f9d",
  "#8fc7e8",
  "#b23ac7",
  "#e0b341",
  "#e8663d",
  "#7a4fd1",
  "#5d6b7a",
  "#3fae6b",
];
const storeys = [14, 18, 9, 22, 46, 16, 12, 10, 20];

const spotTints: Readonly<Record<Spot["kind"], string>> = {
  drop: "#7be36b",
  faucet: "#5beac6",
  fence: "#c9c2ff",
  freezer: "#9fd8ff",
  gig: "#7be36b",
  home: "#ffffff",
  loot: "#ff5d5d",
  offer: "#ff9ecf",
  rebrand: "#ffd166",
  recruit: "#ffd166",
  ride: "#5aa9ff",
  stop: "#22c55e",
  tool: "#f4a261",
  word: "#f7f3d7",
};

function towers(): InstancedMesh {
  const mesh = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ metalness: 0.1, roughness: 0.75 }),
    boroughs.length * lots.length * lots.length,
  );
  mesh.name = "towers";
  const place = new Matrix4();
  let at = 0;
  boroughs.forEach((_, borough) => {
    const centre = centreOf(borough);
    for (const [west, east] of lots)
      for (const [north, south] of lots) {
        const height = (storeys[borough] ?? 10) + ((west + north) % 7);
        place
          .makeScale(metres(east - west), height, metres(south - north))
          .setPosition(
            metres(centre.x - block / 2 + (west + east) / 2),
            height / 2,
            metres(centre.z - block / 2 + (north + south) / 2),
          );
        mesh.setMatrixAt(at, place);
        mesh.setColorAt(at, new Color(tints[borough]));
        at += 1;
      }
  });
  return mesh;
}

function markers(): InstancedMesh {
  const mesh = new InstancedMesh(
    new CylinderGeometry(0.35, 0.35, 2.4, 8),
    new MeshStandardMaterial({ emissive: "#ffffff", emissiveIntensity: 0.35 }),
    spots.length,
  );
  mesh.name = "spots";
  const place = new Matrix4();
  spots.forEach((spot, at) => {
    mesh.setMatrixAt(
      at,
      place.makeTranslation(metres(spot.x), 1.2, metres(spot.z)),
    );
    mesh.setColorAt(at, new Color(spotTints[spot.kind]));
  });
  return mesh;
}

export function buildCity(): Group {
  const city = new Group();
  city.name = "city";
  const size = metres(island);
  const ground = new Mesh(
    new BoxGeometry(size, 1, size),
    new MeshStandardMaterial({ color: "#1b2233", roughness: 1 }),
  );
  ground.name = "ground";
  ground.position.set(size / 2, -0.5, size / 2);
  const water = new Mesh(
    new PlaneGeometry(size * 3, size * 3),
    new MeshStandardMaterial({ color: "#0a3a55", roughness: 0.4 }),
  );
  water.name = "sea";
  water.rotation.x = -Math.PI / 2;
  water.position.set(size / 2, -0.8, size / 2);
  // Moon Tower, the top everyone climbs toward, stands over The Exchange.
  const tower = new Mesh(
    new BoxGeometry(14, 110, 14),
    new MeshStandardMaterial({
      color: "#f7f3d7",
      emissive: "#e0b341",
      emissiveIntensity: 0.5,
    }),
  );
  tower.name = "moon-tower";
  tower.position.set(
    metres(centreOf(4).x) + 30,
    55,
    metres(centreOf(4).z) - 30,
  );
  const moon = new DirectionalLight("#cfe3ff", 1.6);
  moon.position.set(size * 0.2, 260, size * 0.9);
  city.add(
    ground,
    water,
    towers(),
    markers(),
    tower,
    new HemisphereLight("#9fb8ff", "#1b2233", 1.1),
    moon,
  );
  return city;
}
