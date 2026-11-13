import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";

// The billboards on the rooftops and the sign on the hill. They change with the era, so the skyline tells the mood of the market: the
// riot morning, the mania, the winter, Launch Day and Moon Night. Words are painted on a canvas where the page has one; elsewhere a board
// is plain colour. Every line is an original gag, and none names a real person, project or brand.
export const boardLines: readonly (readonly string[])[] = [
  [
    "FREE FROST",
    "HODL",
    "GM COFFEE: SAY IT BACK",
    "SHA BEACH",
    "KEEP YOUR KEYS",
    "THE NAKASATO BLOCK",
  ],
  [
    "MAXX: 20% A DAY. DON'T ASK HOW.",
    "NFTS ARE A SCAM (BUY MY NFT ABOUT IT)",
    "THIS BILLBOARD IS AN NFT",
    "WEN CAR? NOW LEASING",
    "HODL HOTEL: CHECK IN, NEVER CHECK OUT",
    "RALLY'S GYM: EVERY DAY IS UP DAY",
  ],
  [
    "WE ARE STILL EARLY",
    "LIQUIDATION SALE: EVERYTHING",
    "FUNDS ARE SAFE*",
    "MAXX: BACK AFTER MAINTENANCE",
    "DIP'S BAIT AND TACKLE: BUY THE DIP",
    "HODL",
  ],
  [
    "YOUR JOB, BUT TIRELESS",
    "I AM NOT A ROBOT (I AM)",
    "NOT FINANCIAL ADVICE",
    "GM COFFEE: SAY IT BACK",
    "BIT IS LISTENING",
    "SHA BEACH",
  ],
  [
    "MOON NIGHT",
    "PROBABLY NOTHING",
    "WAGMI",
    "YOU REMEMBER IT, DON'T YOU?",
    "SHA BEACH",
    "LOOK AFTER EACH OTHER",
  ],
];
export const hillWords = ["WAGMI", "WAGMI", "NGMI", "WAGMI", "WAGMI"] as const;
const inks = [
  "#ff3df2",
  "#5beac6",
  "#ffd166",
  "#ff9ecf",
  "#6aa8ff",
  "#ffffff",
] as const;

// Where each board stands (metres), facing south so the camera that follows from the south reads it.
const spots: readonly (readonly [number, number, number])[] = [
  [35, 30, 95],
  [205, 36, 30],
  [325, 22, 95],
  [35, 70, 215],
  [155, 112, 150],
  [325, 26, 155],
  [85, 30, 335],
  [155, 34, 275],
  [325, 40, 335],
  [205, 96, 215],
  [85, 64, 155],
  [275, 36, 275],
];

export function painted(text: string, ink: string): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: "#11131c",
    emissive: ink,
    emissiveIntensity: 0.25,
    roughness: 0.6,
  });
  if (typeof document === "undefined") return material;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (context === null) return material;
  context.fillStyle = "#0b0d18";
  context.fillRect(0, 0, 512, 192);
  context.strokeStyle = ink;
  context.lineWidth = 8;
  context.strokeRect(6, 6, 500, 180);
  context.fillStyle = ink;
  const size = Math.min(64, Math.floor(900 / Math.max(6, text.length)));
  context.font = `bold ${String(size)}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 96, 480);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  material.map = texture;
  material.emissiveMap = texture;
  material.color.set("#ffffff");
  material.emissive.set("#ffffff");
  material.emissiveIntensity = 0.7;
  return material;
}

export interface Boards {
  readonly root: Group;
  // Paints the boards and the hill sign for a story day.
  era(day: number): void;
}

export function buildBoards(): Boards {
  const root = new Group();
  root.name = "boards";
  const frames = new MeshStandardMaterial({ color: "#2a2f45", roughness: 0.9 });
  const faces = spots.map(([x, y, z]) => {
    const face = new Mesh(new PlaneGeometry(18, 6.5), frames);
    face.position.set(x, y, z);
    const back = new Mesh(new BoxGeometry(18.6, 7.1, 0.4), frames);
    back.position.set(x, y, z - 0.3);
    const post = new Mesh(new BoxGeometry(0.6, y, 0.6), frames);
    post.position.set(x, y / 2, z - 0.6);
    root.add(face, back, post);
    return face;
  });
  const hill = new Mesh(new PlaneGeometry(46, 9), frames);
  hill.name = "hill-sign";
  hill.position.set(322, 30, 24);
  hill.rotation.y = -0.5;
  root.add(hill);
  const cache = new Map<string, MeshStandardMaterial>();
  const paint = (text: string, ink: string): MeshStandardMaterial => {
    const key = `${text}|${ink}`;
    const known = cache.get(key) ?? painted(text, ink);
    cache.set(key, known);
    return known;
  };
  return {
    era(day) {
      const lines = boardLines[day - 1] ?? boardLines[0] ?? [];
      faces.forEach((face, index) => {
        face.material = paint(
          lines[index % lines.length] ?? "",
          inks[index % inks.length] ?? "#ffffff",
        );
      });
      hill.material = paint(
        hillWords[day - 1] ?? "WAGMI",
        day === 3 ? "#ff5d5d" : "#ffffff",
      );
    },
    root,
  };
}
