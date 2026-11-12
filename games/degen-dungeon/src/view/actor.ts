import {
  BoxGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";

// A body built in code: a torso, a head with eyes, two legs that walk, and the few shapes that say who it is (horns, ears, a hat, wings).
// These are stand-ins with the right outline and colour. The four Frost Run heroes have packed models in that game
// (`games/frost-run/src/screen/models`), and the new six are to be built the same way; each replaces one `look` here.
export interface Actor {
  readonly legs: readonly Mesh[];
  readonly root: Group;
}

// A shape, its colour, its size, where it sits, and how far it leans (round the body's own forward axis).
type Extra = readonly [
  "ball" | "box" | "cone",
  string,
  readonly [number, number, number],
  readonly [number, number, number],
  number?,
];
interface Look {
  readonly body: string;
  readonly extras: readonly Extra[];
  readonly scale: number;
}

const pair = (extra: Extra): Extra[] => [
  extra,
  [
    extra[0],
    extra[1],
    extra[2],
    [-extra[3][0], extra[3][1], extra[3][2]],
    -(extra[4] ?? 0),
  ],
];

// In the order of the rules' `heroes`: Volt, Nib, Lumen, Hrimm, Omen, Chip, Mint, Rally, Dip, Slip.
const looks: readonly Look[] = [
  {
    body: "#29d3c3",
    extras: pair(["ball", "#e9fffb", [0.14, 0.14, 0.14], [0.3, 1.5, 0], 0]),
    scale: 1,
  },
  {
    body: "#7be36b",
    extras: [
      ...pair(["box", "#4fb84a", [0.5, 0.04, 0.3], [0.45, 1, -0.1], 0.5]),
      ["cone", "#4fb84a", [0.1, 0.5, 0], [0, 0.5, -0.4], 0],
    ],
    scale: 0.8,
  },
  {
    body: "#c9c2ff",
    extras: [["ball", "#fff3b0", [0.1, 0.1, 0.1], [0, 1.72, 0.12], 0]],
    scale: 0.95,
  },
  {
    body: "#9fd8ff",
    extras: pair(["cone", "#e8f6ff", [0.12, 0.5, 0], [0.42, 1.1, 0], -0.6]),
    scale: 1.6,
  },
  {
    body: "#6c4bd8",
    extras: [["cone", "#3d2a8c", [0.32, 0.7, 0], [0, 1.95, 0], 0]],
    scale: 1,
  },
  {
    body: "#c98a4b",
    extras: [
      ...pair(["box", "#8a5a2b", [0.1, 0.3, 0.16], [0.26, 1.45, 0], 0.3]),
      ["cone", "#8a5a2b", [0.06, 0.4, 0], [0, 0.8, -0.3], 0],
    ],
    scale: 0.9,
  },
  {
    body: "#ff9ecf",
    extras: [
      ...pair(["cone", "#ff6fb5", [0.09, 0.22, 0], [0.16, 1.7, 0], 0]),
      ["cone", "#ff6fb5", [0.05, 0.6, 0], [0, 0.85, -0.3], 0],
    ],
    scale: 0.85,
  },
  {
    body: "#b5452e",
    extras: pair(["cone", "#f7f3d7", [0.07, 0.4, 0], [0.34, 1.55, 0], -1.2]),
    scale: 1.2,
  },
  {
    body: "#6b4a33",
    extras: pair(["ball", "#4a3222", [0.11, 0.11, 0.11], [0.22, 1.66, 0], 0]),
    scale: 1.25,
  },
  {
    body: "#ffffff",
    extras: [
      ["cone", "#ffd166", [0.06, 0.5, 0], [0, 1.9, 0.12], 0],
      ["box", "#c9a6ff", [0.08, 0.5, 0.3], [0, 1.4, -0.22], 0],
    ],
    scale: 1.05,
  },
];

const shape = ([kind, , [a, b, c]]: Extra) =>
  kind === "ball"
    ? new SphereGeometry(a, 12, 10)
    : kind === "cone"
      ? new ConeGeometry(a, b, 10)
      : new BoxGeometry(a, b, c);

function part(extra: Extra): Mesh {
  const mesh = new Mesh(
    shape(extra),
    new MeshStandardMaterial({ color: extra[1], roughness: 0.6 }),
  );
  mesh.position.set(...extra[3]);
  mesh.rotation.z = extra[4] ?? 0;
  return mesh;
}

function build(look: Look, name: string): Actor {
  const root = new Group();
  root.name = name;
  const legs = [-0.14, 0.14].map((x) =>
    part(["box", look.body, [0.16, 0.45, 0.16], [x, 0.22, 0], 0]),
  );
  root.add(
    ...legs,
    part(["box", look.body, [0.5, 0.7, 0.36], [0, 0.8, 0], 0]),
    part(["ball", look.body, [0.28, 0, 0], [0, 1.4, 0], 0]),
    ...pair(["ball", "#10131f", [0.05, 0, 0], [0.11, 1.45, 0.24], 0]).map(part),
    ...look.extras.map(part),
  );
  root.scale.setScalar(look.scale);
  return { legs, root };
}

export const heroCount = looks.length;

export function buildActor(hero: number): Actor {
  return build(
    looks[hero] ?? { body: "#888888", extras: [], scale: 1 },
    `hero-${String(hero)}`,
  );
}

// A FUD agent: black tuxedo, white shirt, sunglasses, day or night.
export function buildTux(): Actor {
  return build(
    {
      body: "#0b0b10",
      extras: [
        ["box", "#ffffff", [0.16, 0.4, 0.02], [0, 0.9, 0.19], 0],
        ["box", "#000000", [0.42, 0.08, 0.06], [0, 1.46, 0.25], 0],
      ],
      scale: 1.1,
    },
    "tux",
  );
}

// Legs that swing and a body that bobs with the pace; at rest the body only breathes.
export function stride(actor: Actor, pace: number, seconds: number): void {
  const swing = pace > 0 ? Math.sin(seconds * (6 + pace / 3)) * 0.7 : 0;
  actor.legs.forEach((leg, at) => {
    leg.rotation.x = at === 0 ? swing : -swing;
  });
  const lift =
    pace > 0
      ? Math.abs(Math.sin(seconds * (6 + pace / 3))) * 0.06
      : Math.sin(seconds * 2) * 0.015;
  actor.root.position.y += lift * actor.root.scale.y;
}
