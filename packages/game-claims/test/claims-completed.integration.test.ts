import { describe, expect, it } from "vitest";

import {
  chain,
  completedHook,
  completedTold,
  network,
  player,
  registerDatabase,
  reported,
  service,
  startAndSign,
} from "./support/fixture.ts";

registerDatabase();

// A claim submitted and brought to the look just before it is complete.
async function confirmed() {
  const userId = await player();
  const { claim, signed } = await startAndSign(userId);
  await service.submitSigned({ claimId: claim.id, signed, userId });
  await service.refresh(userId, claim.id);
  network.controls.advance(chain, 3);
  const looked = await service.refresh(userId, claim.id);
  expect(looked.ok && looked.claim.state).toBe("confirmed");
  return { claimId: claim.id, userId };
}

describe("telling what follows a claim that took effect", () => {
  it("tells nobody while the claim is on its way, and tells of it when it is complete", async () => {
    const { claimId, userId } = await confirmed();
    expect(completedTold).toEqual([]);
    const done = await service.refresh(userId, claimId);
    expect(done.ok && done.claim.state).toBe("complete");
    expect(completedTold).toEqual([claimId]);
  });

  it("tells again at each look while the claim is complete, so a failure to act is made good by the next look", async () => {
    const { claimId, userId } = await confirmed();
    await service.refresh(userId, claimId);
    await service.refresh(userId, claimId);
    expect(completedTold).toEqual([claimId, claimId]);
  });

  it("is not stopped by a follower that fails: the claim is complete, the failure is reported, and the next look tries again", async () => {
    const { claimId, userId } = await confirmed();
    completedHook.fails = true;
    const done = await service.refresh(userId, claimId);
    expect(done.ok && done.claim.state).toBe("complete");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.step).toBe("completed");
    completedHook.fails = false;
    await service.refresh(userId, claimId);
    expect(completedTold).toEqual([claimId, claimId]);
  });

  it("tells of a claim that never took effect no more than of one that is still on its way", async () => {
    const userId = await player();
    const { claim } = await startAndSign(userId);
    await service.refresh(userId, claim.id);
    expect(completedTold).toEqual([]);
  });
});
