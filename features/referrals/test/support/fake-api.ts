import { vi } from "vitest";

import type { ReferralsApi } from "../../src/client/api.ts";

const nothing = (name: string) => () => {
  throw new Error(`${name} was not expected to be asked`);
};

// The page's way of reaching the platform, with every request unexpected unless a test gives it an answer; what changes the program or pays
// answers saved by default.
export const fakeApi = (over: Partial<ReferralsApi> = {}): ReferralsApi => ({
  cover: vi.fn(nothing("cover")),
  refreshBatch: vi.fn(nothing("refreshBatch")),
  requestPayout: vi.fn(async () => ({
    amountUnits: "150",
    status: "requested" as const,
  })),
  setFrozen: vi.fn(async () => ({ frozen: true, status: "saved" as const })),
  setProgram: vi.fn(async () => ({ status: "saved" as const })),
  startBatch: vi.fn(nothing("startBatch")),
  submitBatch: vi.fn(nothing("submitBatch")),
  ...over,
});
