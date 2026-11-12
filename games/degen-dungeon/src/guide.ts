import type { Guide } from "@frostbite/game-sdk/guide";

import { heroes } from "./rules/heroes.ts";

// The first-screen card is the hero select: the hero the ring has brought to the front, their five stats, and how to turn the ring and
// begin. The SDK draws it over the screen at the pixels of the display, so it stays sharp. A hero still locked shows as a question.
export function guideFor(
  hero: number,
  day: number,
  slipUnlocked: boolean,
): Guide {
  const who = heroes[hero];
  const title = "DEGEN DUNGEON";
  if (who === undefined || (who.hidden && !slipUnlocked))
    return {
      lines: ["< ??? >", "REACH THE GREAT AIRDROP", "TO UNLOCK THIS HERO"],
      start: "ARROWS TURN THE RING",
      title,
      touchStart: "TAP A SIDE TO TURN THE RING",
    };
  const stats = `SPD ${String(who.speed)}  MUS ${String(who.muscle)}  STL ${String(who.stealth)}  CHA ${String(who.charm)}  SMT ${String(who.smarts)}`;
  const name = `< ${who.name.toUpperCase()} THE ${who.kind.toUpperCase()} >`;
  return {
    lines: [
      name,
      stats,
      "LEFT AND RIGHT: CHOOSE A HERO",
      "ARROWS WALK - SPACE ACTS",
    ],
    start: `ENTER TO WAKE UP - DAY ${String(day)}`,
    title,
    touchLines: [
      name,
      stats,
      "TAP A SIDE: CHOOSE A HERO",
      "LEFT THUMB STEERS - TAP RIGHT TO ACT",
    ],
    touchStart: `TAP TO WAKE UP - DAY ${String(day)}`,
  };
}
