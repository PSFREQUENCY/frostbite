import { describe, expect, it } from "vitest";

import { createUploadIntentService } from "../src/application/service.ts";
import {
  dependencies,
  idempotencyKey,
  intentId,
  now,
  userId,
} from "./support/intent-service-fixtures.ts";

function start(
  overrides: Parameters<typeof createUploadIntentService>[0]["policy"] = {},
) {
  const values = dependencies();
  const service = createUploadIntentService({
    clock: () => now,
    createDraftKey: () => "opaque-key",
    createId: () => intentId,
    policy: overrides,
    repository: values.repository,
    storage: values.storage,
  });
  const create = (
    purpose: "collection-artwork" | "creator-avatar",
    byteLength: number,
  ) =>
    service.create(
      { byteLength, contentType: "image/svg+xml", purpose },
      { idempotencyKey, userId },
    );
  return { create, values };
}

describe("starting an upload of a vector picture", () => {
  it.each(["collection-artwork"] as const)(
    "is accepted for %s, within the vector size",
    async (purpose) => {
      const { create, values } = start();
      await expect(create(purpose, 2_000_000)).resolves.toMatchObject({
        kind: "created",
      });
      expect(values.events).toEqual(["reserved", "signed"]);
    },
  );

  it("is refused for a use that is not on the list, before anything is kept", async () => {
    const { create, values } = start();
    await expect(create("creator-avatar", 100)).resolves.toEqual({
      kind: "invalid-type",
    });
    expect(values.repository.reserve).not.toHaveBeenCalled();
  });

  it("is limited to the vector size, which is lower than the size of a picture", async () => {
    const { create, values } = start();
    await expect(create("collection-artwork", 2_000_001)).resolves.toEqual({
      kind: "invalid-size",
    });
    expect(values.repository.reserve).not.toHaveBeenCalled();
  });

  it("follows the policy it is given, in what it takes and in its size", async () => {
    const wider = start({
      svg: { purposes: ["collection-artwork", "creator-avatar"] },
    });
    await expect(wider.create("creator-avatar", 100)).resolves.toMatchObject({
      kind: "created",
    });
    const none = start({ svg: { purposes: [] } });
    await expect(none.create("collection-artwork", 100)).resolves.toEqual({
      kind: "invalid-type",
    });
    const smaller = start({ svg: { maxBytes: 1_000 } });
    await expect(smaller.create("collection-artwork", 1_001)).resolves.toEqual({
      kind: "invalid-size",
    });
  });

  it("is never allowed past the limit of the use it is for", async () => {
    const { create } = start({
      svg: { maxBytes: 9_000_000, purposes: ["creator-avatar"] },
    });
    await expect(create("creator-avatar", 5_000_001)).resolves.toEqual({
      kind: "invalid-size",
    });
  });
});
