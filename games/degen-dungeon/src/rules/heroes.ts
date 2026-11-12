// The cast, as the rules know it: where each lives and five stats from 1 to 5 that add up to 15, so nobody is simply the best. Speed is
// the pace on foot, stealth lowers the heat of a theft and charm raises what a gig pays; muscle and smarts wait for the jobs that use them.
// Names and numbers are a draft for the owner. The words about each hero are in `script/cast.ts`.
export interface Hero {
  readonly borough: number;
  readonly charm: number;
  // Slip is not on offer until the Great Airdrop has been played.
  readonly hidden: boolean;
  readonly kind: string;
  readonly muscle: number;
  readonly name: string;
  readonly smarts: number;
  readonly speed: number;
  readonly stealth: number;
}

const hero = (
  name: string,
  kind: string,
  borough: number,
  [speed, muscle, stealth, charm, smarts]: readonly [
    number,
    number,
    number,
    number,
    number,
  ],
  hidden = false,
): Hero => ({
  borough,
  charm,
  hidden,
  kind,
  muscle,
  name,
  smarts,
  speed,
  stealth,
});

export const heroes: readonly Hero[] = [
  hero("Volt", "neon ram", 3, [5, 3, 2, 2, 3]),
  hero("Nib", "baby dragon", 5, [4, 1, 3, 5, 2]),
  hero("Lumen", "spirit miner", 7, [2, 2, 3, 3, 5]),
  hero("Hrimm", "ice giant", 2, [2, 5, 1, 4, 3]),
  hero("Omen", "wizard", 6, [2, 1, 3, 5, 4]),
  hero("Chip", "dog", 8, [4, 3, 2, 4, 2]),
  hero("Mint", "collectible kitty", 1, [3, 1, 5, 3, 3]),
  hero("Rally", "bull", 4, [3, 5, 1, 4, 2]),
  hero("Dip", "bear", 0, [1, 4, 2, 3, 5]),
  hero("Slip", "unicorn", 5, [5, 2, 1, 5, 2], true),
];

export const statNames = [
  "speed",
  "muscle",
  "stealth",
  "charm",
  "smarts",
] as const;
