import { gameMilestoneClaims, gameContracts } from "@frostbite/database";
import { describe, expect, it } from "vitest";

import {
  chain,
  database,
  gameId,
  input,
  operations,
  registerClaimsWorld,
  seedPlayer,
  sessionFor,
  sign,
  wallet,
  world,
} from "./support/claims-world.ts";

// The claim path through the operations, as the page drives it: start, sign, send, watch until complete.
registerClaimsWorld();

describe("claiming a milestone through the operations", () => {
  it("goes from earned to complete, the player's own wallet signing what they were shown", async () => {
    const userId = await seedPlayer();
    const { list, refresh, start, submit } = operations();
    const session = sessionFor(userId);

    const started = await start.execute(input, session);
    if (!started.ok || started.value.status !== "started")
      throw new Error("not started");
    const { claim } = started.value;
    expect(claim).toMatchObject({
      gameId,
      milestoneId: "first-win",
      state: "awaiting-signature",
      summary: { contractId: "rewards-1", recipient: wallet },
    });
    if (claim.toSign === null) throw new Error("nothing to sign");

    const signed = sign(claim.toSign);
    expect(signed.payload).toBe(`${claim.toSign.payload}.sig`);
    const submitted = await submit.execute(
      { claimId: claim.id, signed },
      session,
    );
    expect(submitted).toMatchObject({
      value: { claim: { state: "pending" }, status: "submitted" },
    });

    world.network.controls.advance(chain, 3);
    const states: string[] = [];
    for (let look = 0; look < 3; look += 1) {
      const looked = await refresh.execute({ claimId: claim.id }, session);
      states.push(
        looked.ok && looked.value.status === "ok"
          ? looked.value.claim.state
          : "refused",
      );
    }
    expect(states).toEqual(["claimed", "complete", "complete"]);
    const listed = await list.execute({ gameId }, session);
    expect(listed.ok && listed.value.claims.map(({ state }) => state)).toEqual([
      "complete",
    ]);
    expect(
      (await database.select().from(gameMilestoneClaims)).filter(
        (row) => row.userId === userId,
      ),
    ).toHaveLength(1);
  });

  it("answers, for a milestone the player has not earned, that it is not earned, and writes nothing", async () => {
    const userId = await seedPlayer(false);
    const result = await operations().start.execute(input, sessionFor(userId));
    expect(result).toEqual({
      ok: true,
      value: { reason: "not-earned", status: "unavailable" },
    });
    expect(
      (await database.select().from(gameMilestoneClaims)).filter(
        (row) => row.userId === userId,
      ),
    ).toEqual([]);
  });

  it("answers that claims are not supported for a game with no contract on record, however well earned", async () => {
    const userId = await seedPlayer();
    await database.delete(gameContracts);
    expect(await operations().start.execute(input, sessionFor(userId))).toEqual(
      {
        ok: true,
        value: { reason: "not-supported", status: "unavailable" },
      },
    );
  });

  it("answers wrong network for a wallet address that is not on the game's chain", async () => {
    const userId = await seedPlayer();
    expect(
      await operations().start.execute(
        { ...input, wallet: "bc1qnotsimulated" },
        sessionFor(userId),
      ),
    ).toEqual({
      ok: true,
      value: { reason: "wrong-network", status: "unavailable" },
    });
  });

  it("does not show another player's claim, or let them sign it", async () => {
    const owner = await seedPlayer();
    const other = await seedPlayer();
    const { refresh, start, submit } = operations();
    const started = await start.execute(input, sessionFor(owner));
    if (!started.ok || started.value.status !== "started")
      throw new Error("not started");
    const { claim } = started.value;
    if (claim.toSign === null) throw new Error("nothing to sign");
    expect(
      await refresh.execute({ claimId: claim.id }, sessionFor(other)),
    ).toEqual({
      ok: true,
      value: { reason: "not-found", status: "refused" },
    });
    expect(
      await submit.execute(
        {
          claimId: claim.id,
          signed: sign(claim.toSign),
        },
        sessionFor(other),
      ),
    ).toEqual({ ok: true, value: { reason: "not-found", status: "refused" } });
  });

  it("refuses a caller with no session", async () => {
    const { start } = operations();
    expect(await start.execute(input, sessionFor(null))).toMatchObject({
      error: "unauthorized",
      ok: false,
    });
  });
});
