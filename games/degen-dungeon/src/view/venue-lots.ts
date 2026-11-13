import type { Venue } from "./venue-kits.ts";

// Which lots hold a landmark instead of a ring of low buildings (by "borough-corner"; corners 1 and 2 have no walk-in shop), and the
// towers that carry a company's name on their crown. Every name is an original gag. A draft for the owner.
export const venueLots: Readonly<Record<string, readonly [Venue, string]>> = {
  "0-1": ["library", "WHITEPAPER LIBRARY"],
  "1-1": ["studio", "CLIPSTREAM STUDIOS"],
  "3-1": ["records", "BASSLINE RECORDS"],
  "3-2": ["club", "THE MEMPOOL"],
  "4-2": ["bank", "FIRST BLOCK BANK"],
  "5-1": ["gallery", "PIXEL VAULT GALLERY"],
  "5-2": ["skate", "MEME MARKET SKATE PARK"],
  "6-1": ["museum", "MUSEUM OF GENESIS"],
  "6-2": ["club", "CLUB HALVING"],
  "7-1": ["dome", "THE DOME VR"],
  "7-2": ["arcade", "MEGA ARCADE"],
  "8-1": ["club", "BLOCK PARTY"],
  "8-2": ["park", "GIG STREET GREEN"],
};
export const crowns: Readonly<Record<number, string>> = {
  0: "COLD STORAGE CO",
  1: "SEAGLASS CAPITAL",
  3: "NEON HOLDINGS",
  4: "PROOF TOWER",
  6: "HODL HEIGHTS",
  7: "HASHRATE WORKS",
  8: "NODE HALL",
};
