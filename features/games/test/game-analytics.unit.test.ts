import type { RunsService } from "@frostbite/game-sdk/host";
import type { GameClaimState } from "@frostbite/shared/games";
import { describe, expect, it, vi } from "vitest";

import {
  countClaimChanged,
  countClaimRefused,
  countClaimStarted,
  countRuns,
} from "../src/ui/game-analytics.ts";

const analytics = () => {
  const capture = vi.fn();
  return { capture, port: { capture, shutdown: () => Promise.resolve() } };
};
const started = {
  expiresAt: "2026-10-16T12:00:00.000Z",
  runId: "5b0c1e7a-6d52-4c0f-9a43-7a3e2f1d8b60",
  seed: 7,
  status: "started",
} as const;

describe("the runs a page counts", () => {
  const runs = (submit: RunsService["submit"]): RunsService => ({
    start: async () => started,
    submit,
  });

  it("counts a start when the game asks for one, and hands the answer on untouched", async () => {
    const { capture, port } = analytics();
    const counted = countRuns(
      runs(async () => ({ earned: [], status: "verified" })),
      port,
      "permafrost",
    );
    await expect(counted.start()).resolves.toBe(started);
    expect(capture).toHaveBeenCalledExactlyOnceWith("run_started", {
      game: "permafrost",
    });
  });

  it("counts a finish as verified only when the replay established the run", async () => {
    const cases: [Awaited<ReturnType<RunsService["submit"]>>, boolean][] = [
      [{ earned: [], status: "verified" }, true],
      [{ reason: "bad-record", status: "rejected" }, false],
      [{ reason: "expired", status: "refused" }, false],
    ];
    for (const [answer, verified] of cases) {
      const { capture, port } = analytics();
      const counted = countRuns(
        runs(async () => answer),
        port,
        "permafrost",
      );
      await expect(counted.submit("run", {})).resolves.toBe(answer);
      expect(capture).toHaveBeenCalledExactlyOnceWith("run_finished", {
        game: "permafrost",
        verified,
      });
    }
  });

  it("counts no finish when the platform could not be asked, and does not hide the failure", async () => {
    const { capture, port } = analytics();
    const counted = countRuns(
      runs(() => Promise.reject(new Error("offline"))),
      port,
      "permafrost",
    );
    await expect(counted.submit("run", {})).rejects.toThrow("offline");
    expect(capture).not.toHaveBeenCalled();
  });
});

describe("the claims a page counts", () => {
  const states = (before: GameClaimState | undefined, now: GameClaimState) => {
    const { capture, port } = analytics();
    countClaimChanged(port, "permafrost", before, now);
    return capture.mock.calls;
  };

  it("counts a start, and a refusal with its reason code", () => {
    const { capture, port } = analytics();
    countClaimStarted(port, "permafrost");
    countClaimRefused(port, "permafrost", "no-funds");
    expect(capture.mock.calls).toEqual([
      ["milestone_claim_started", { game: "permafrost" }],
      ["milestone_claim_failed", { game: "permafrost", reason: "no-funds" }],
    ]);
  });

  it("counts a success once: when it first reaches claimed or complete, not again as it moves from one to the other", () => {
    const success = [["milestone_claim_succeeded", { game: "permafrost" }]];
    expect(states("pending", "claimed")).toEqual(success);
    expect(states("pending", "complete")).toEqual(success);
    expect(states(undefined, "claimed")).toEqual(success);
    expect(states("claimed", "complete")).toEqual([]);
    expect(states("complete", "complete")).toEqual([]);
  });

  it("counts a claim that failed or ran out, by the state it ended in", () => {
    expect(states("pending", "failed")).toEqual([
      ["milestone_claim_failed", { game: "permafrost", reason: "failed" }],
    ]);
    expect(states("awaiting-signature", "expired")).toEqual([
      ["milestone_claim_failed", { game: "permafrost", reason: "expired" }],
    ]);
  });

  it("counts nothing for a claim that is only on its way", () => {
    expect(states(undefined, "awaiting-signature")).toEqual([]);
    expect(states("awaiting-signature", "pending")).toEqual([]);
  });
});
