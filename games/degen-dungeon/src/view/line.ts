import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
} from "three";

import { box } from "./hash.ts";

// The Green Line Express: an elevated track round the eight outer boroughs, through every stop, and a train that runs it all day. The
// train is only for looks; the rules move a rider from stop to stop.
const ring = { east: 308, north: 93, south: 333, west: 68 } as const;
const height = 22;
const lap = 2 * (ring.east - ring.west + (ring.south - ring.north));

// Where a point that has gone `along` metres round the ring, clockwise from the north-west corner, stands.
export function onRing(along: number): readonly [number, number, number] {
  const wide = ring.east - ring.west;
  const tall = ring.south - ring.north;
  const at = ((along % lap) + lap) % lap;
  if (at < wide) return [ring.west + at, ring.north, 0];
  if (at < wide + tall) return [ring.east, ring.north + at - wide, Math.PI / 2];
  if (at < 2 * wide + tall)
    return [ring.east - (at - wide - tall), ring.south, Math.PI];
  return [ring.west, ring.south - (at - 2 * wide - tall), -Math.PI / 2];
}

export interface Line {
  readonly root: Group;
  run(seconds: number): void;
}

export function buildLine(): Line {
  const root = new Group();
  root.name = "green-line";
  const steel = new MeshStandardMaterial({ color: "#2b3a33", roughness: 0.7 });
  const green = new MeshStandardMaterial({
    color: "#22c55e",
    emissive: "#0f6b33",
    flatShading: true,
  });
  const posts = new InstancedMesh(new BoxGeometry(1, 1, 1), steel, 64);
  posts.name = "line-posts";
  const rails = new InstancedMesh(new BoxGeometry(1, 1, 1), steel, 4);
  let post = 0;
  for (let along = 0; along < lap; along += lap / 64) {
    const [x, z] = onRing(along);
    posts.setMatrixAt(post, box(x, height / 2, z, 0.8, height, 0.8));
    post += 1;
  }
  const wide = ring.east - ring.west;
  const tall = ring.south - ring.north;
  rails.setMatrixAt(
    0,
    box((ring.west + ring.east) / 2, height, ring.north, wide, 0.6, 3),
  );
  rails.setMatrixAt(
    1,
    box((ring.west + ring.east) / 2, height, ring.south, wide, 0.6, 3),
  );
  rails.setMatrixAt(
    2,
    box(ring.west, height, (ring.north + ring.south) / 2, 3, 0.6, tall),
  );
  rails.setMatrixAt(
    3,
    box(ring.east, height, (ring.north + ring.south) / 2, 3, 0.6, tall),
  );
  const cars = Array.from({ length: 4 }, () => {
    const car = new Mesh(new BoxGeometry(2.6, 2.6, 9), green);
    car.name = "train";
    root.add(car);
    return car;
  });
  root.add(posts, rails);
  return {
    root,
    run(seconds) {
      cars.forEach((car, index) => {
        const [x, z, turn] = onRing(seconds * 14 - index * 10);
        car.position.set(x, height + 1.6, z);
        car.rotation.y = Math.PI / 2 - turn;
      });
    },
  };
}
