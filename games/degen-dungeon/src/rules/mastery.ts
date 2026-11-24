import { skills } from "./milestones.ts";
import type { Draft } from "./types.ts";

// Mastering a skill (one of the ten top skills, `milestones.ts`) earns a Degen Dash ticket from whoever taught it: the courier desk for a
// grinder's third gig, the park keeper for grass touched, and so on (`script/dash.ts`). From the second day on, the Dash's own days, and
// once a skill a day; a hero holds at most `mostTickets`. Each is noted in the day as `mastered-` and the skill's id, which the page cheers.
export const mostTickets = 3;

export function masteryTick(day: Draft): void {
  if (day.day < 2 || day.loop > 0) return;
  for (const [id, earned] of skills) {
    const key = `mastered-${id}`;
    if (day.done.includes(key) || !earned(day)) continue;
    day.done = [...day.done, key];
    day.tickets = Math.min(mostTickets, day.tickets + 1);
  }
}
