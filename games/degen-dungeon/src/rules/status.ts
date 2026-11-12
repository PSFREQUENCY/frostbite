import { heatPerStar, tuxStars } from "./constants.ts";
import type { DayState } from "./types.ts";

// The one word over a player's head: how they have been playing today, worked out from the day and never picked. The first rule that
// holds wins, so the list is in order of what matters most. The plan's other statuses (REKT, DOWN BAD, BAGHOLDER, DIAMOND HANDS and the
// rest) need the market and the days before; each is one more row here once the rules keep what it reads.
const rules: readonly {
  readonly holds: (day: DayState) => boolean;
  readonly word: string;
}[] = [
  { holds: (day) => day.heat >= tuxStars * heatPerStar, word: "FUDDED" },
  { holds: (day) => day.rugged > 0, word: "RUGGED" },
  { holds: (day) => day.spotted > 0, word: "BASED" },
  { holds: (day) => day.crew.length === 2 && day.rep >= 20, word: "WAGMI" },
  { holds: (day) => day.gigs >= 3, word: "GRINDER" },
  { holds: (day) => day.freezer > 0 && day.pocket === 0, word: "SAFU" },
];

export const statusOf = (day: DayState): string =>
  rules.find(({ holds }) => holds(day))?.word ?? "GM";
