import type { RunsService } from "@frostbite/game-sdk/host";
import type { Analytics } from "@frostbite/telemetry/analytics";
import type { GameClaimState } from "@frostbite/shared/games";

// What the game page counts, said in one place. A game is named by its id (a public slug); nothing about the player, their wallet or their
// run goes with it, and the platform's catalogue refuses anything else.

// A run the page starts and settles for a game, counted as it happens: a start whenever the game asks for one (signed in or not, with a
// verifier or not), and a finish when the platform has answered the record, `verified` only if the replay established it.
export function countRuns(
  runs: RunsService,
  analytics: Analytics,
  game: string,
): RunsService {
  return {
    start: () => {
      analytics.capture("run_started", { game });
      return runs.start();
    },
    submit: async (runId, record) => {
      const answer = await runs.submit(runId, record);
      analytics.capture("run_finished", {
        game,
        verified: answer.status === "verified",
      });
      return answer;
    },
  };
}

// A claim as it goes: started when the page has begun one, and then finished one way or the other, each counted once however many times the
// page learns the same state.
const succeeded: readonly GameClaimState[] = ["claimed", "complete"];
const failed: readonly GameClaimState[] = ["failed", "expired"];

export function countClaimStarted(analytics: Analytics, game: string): void {
  analytics.capture("milestone_claim_started", { game });
}

// A claim the platform would not start, with its reason code.
export function countClaimRefused(
  analytics: Analytics,
  game: string,
  reason: string,
): void {
  analytics.capture("milestone_claim_failed", { game, reason });
}

export function countClaimChanged(
  analytics: Analytics,
  game: string,
  before: GameClaimState | undefined,
  now: GameClaimState,
): void {
  if (before === now) return;
  if (succeeded.includes(now) && !(before && succeeded.includes(before)))
    analytics.capture("milestone_claim_succeeded", { game });
  else if (failed.includes(now))
    analytics.capture("milestone_claim_failed", { game, reason: now });
}
