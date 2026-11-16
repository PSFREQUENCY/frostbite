import { describe, expect, it, vi } from "vitest";

import {
  createLocalBackend,
  type LocalSnapshot,
} from "../src/local-backend.ts";
import {
  createSyncedBackend,
  type AccountPort,
  type AccountSyncResult,
} from "../src/synced-backend.ts";

const at = new Date("2026-10-12T10:00:00.000Z");
const playerA = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const playerB = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const held = (id: string): LocalSnapshot["milestones"][number] => ({
  count: 1,
  id,
  unlockedAt: "2026-10-01T00:00:00.000Z",
  verification: "self-reported",
});
const stateOf = (...ids: string[]): LocalSnapshot => ({
  counters: [],
  milestones: ids.map(held),
  progress: null,
});

// One browser (its storage outlives the page), and an account that answers each sync as the real one would: the state it holds, merged with
// what it was sent.
function browser() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  };
  return {
    open: (account: AccountPort) => {
      const local = createLocalBackend({ gameId: "g", storage });
      return {
        backend: createSyncedBackend({ local, remote: account }),
        local,
      };
    },
  };
}

function account(
  playerId: string,
  holds: string[],
  answer?: AccountSyncResult,
): { port: AccountPort; sent: LocalSnapshot[] } {
  const sent: LocalSnapshot[] = [];
  const sync = vi.fn<AccountPort["sync"]>(async (state) => {
    sent.push(state);
    if (answer !== undefined) return answer;
    const ids = new Set([...holds, ...state.milestones.map(({ id }) => id)]);
    return { kind: "synced", playerId, state: stateOf(...ids) };
  });
  return { port: { sync }, sent };
}

describe("records in a browser that more than one account uses", () => {
  it("remembers which account the records were synced with", async () => {
    const page = browser().open(account(playerA, ["first"]).port);
    await page.backend.milestones();
    expect(page.local.owner()).toBe(playerA);
  });

  it("sends the records again to the account they belong to", async () => {
    const shared = browser();
    await shared.open(account(playerA, []).port).backend.unlock("kept", at, 1);
    const again = account(playerA, []);
    const reopened = shared.open(again.port);
    await reopened.backend.unlock("more", at, 1);
    expect(Object.keys(await reopened.backend.milestones()).sort()).toEqual([
      "kept",
      "more",
    ]);
    expect(
      again.sent.some(({ milestones }) =>
        milestones.some(({ id }) => id === "kept"),
      ),
    ).toBe(true);
  });

  it("never sends one account's records to another, and shows the other what it holds", async () => {
    const shared = browser();
    const first = shared.open(account(playerA, []).port);
    for (const id of ["one", "two"]) await first.backend.unlock(id, at, 1);
    await first.backend.milestones();

    const second = account(playerB, ["own"]);
    const reopened = shared.open(second.port);
    expect(Object.keys(await reopened.backend.milestones())).toEqual(["own"]);
    for (const state of second.sent)
      expect(state.milestones.map(({ id }) => id)).not.toContain("one");
    expect(reopened.local.owner()).toBe(playerB);
  });

  it("still merges records made while nobody was signed in into the first account that signs in", async () => {
    const shared = browser();
    await shared
      .open(account(playerA, [], { kind: "signed-out" }).port)
      .backend.unlock("anonymous", at, 1);
    const signedIn = account(playerB, []);
    const reopened = shared.open(signedIn.port);
    expect(Object.keys(await reopened.backend.milestones())).toEqual([
      "anonymous",
    ]);
    expect(signedIn.sent.at(-1)?.milestones.map(({ id }) => id)).toEqual([
      "anonymous",
    ]);
  });

  it("sends nothing while it cannot tell whose the records are", async () => {
    const shared = browser();
    await shared.open(account(playerA, []).port).backend.unlock("one", at, 1);
    const unreachable = account(playerB, [], { kind: "failed" });
    const reopened = shared.open(unreachable.port);
    expect(Object.keys(await reopened.backend.milestones())).toEqual(["one"]);
    expect(reopened.backend.status()).toBe("pending");
    expect(
      unreachable.sent.every(({ milestones }) => milestones.length === 0),
    ).toBe(true);
  });

  it("leaves nothing of an account's records for a visitor who is signed out", async () => {
    const shared = browser();
    await shared.open(account(playerA, []).port).backend.unlock("one", at, 1);
    const visitor = shared.open(
      account(playerA, [], { kind: "signed-out" }).port,
    );
    expect(await visitor.backend.milestones()).toEqual({});
    expect(visitor.local.owner()).toBeNull();
  });
});
