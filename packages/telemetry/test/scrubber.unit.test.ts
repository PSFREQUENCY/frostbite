import { describe, expect, it } from "vitest";

import {
  removed,
  scrubPath,
  scrubProperties,
  scrubText,
  scrubUrl,
} from "../src/scrubber.ts";

const bech32 = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
const legacy = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";
const txid = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
const uuid = "3f2a9c1e-5b7d-4e8a-9c0d-1a2b3c4d5e6f";
const jwt =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r";

describe("scrubText", () => {
  it.each([
    ["an email address", "Failed for abioye@example.com today"],
    ["a bech32 wallet address", `Wallet ${bech32} rejected`],
    ["a legacy wallet address", `Pay ${legacy} now`],
    ["a transaction id", `tx ${txid} not found`],
    ["a 0x-prefixed key", `key 0x${txid.slice(0, 40)} bad`],
    ["a uuid", `account ${uuid} locked`],
    ["a token", `got ${jwt} from server`],
    ["a bearer header", "Authorization: Bearer abc123.def-456~xyz== failed"],
  ])("removes %s and keeps the words around it", (_what, text) => {
    const scrubbed = scrubText(text);
    expect(scrubbed).toContain(removed);
    expect(scrubbed).not.toMatch(
      /@example|bc1q|1BvBM|a1b2c3d4e5|3f2a9c1e|eyJhbGci|abc123/u,
    );
    expect(scrubbed.split(" ")[0]).toBe(text.split(" ")[0]);
  });

  it("leaves ordinary words, short numbers and version strings alone", () => {
    const text =
      "Could not load game pocket-dragon v0.1.0 after 3 tries (HTTP 502) at 12:30";
    expect(scrubText(text)).toBe(text);
  });

  it("removes every occurrence, not just the first", () => {
    expect(scrubText(`${uuid} and ${uuid}`)).toBe(`${removed} and ${removed}`);
  });
});

describe("scrubPath", () => {
  it("makes the parts that name one thing anonymous and keeps words and slugs", () => {
    expect(scrubPath(`/s/${uuid}`)).toBe("/s/:id");
    expect(scrubPath("/games/pocket-dragon")).toBe("/games/pocket-dragon");
    expect(scrubPath("/runs/12345/replay")).toBe("/runs/:id/replay");
    expect(scrubPath(`/wallet/${bech32}`)).toBe("/wallet/:id");
    expect(scrubPath("/p/k7Hq9ZxW3mNvB2cD5fGh8J")).toBe("/p/:id");
    expect(scrubPath("/")).toBe("/");
  });
});

describe("scrubUrl", () => {
  it("keeps the origin and the anonymous path and drops the query and the hash", () => {
    expect(
      scrubUrl(`https://frostbit.example/s/${uuid}?next=/me&code=123#top`),
    ).toBe("https://frostbit.example/s/:id");
  });

  it("drops the query and hash from a bare path too", () => {
    expect(scrubUrl("/games/permafrost?return=/profile#x")).toBe(
      "/games/permafrost",
    );
  });
});

describe("scrubProperties", () => {
  it("scrubs texts and leaves numbers and flags", () => {
    expect(
      scrubProperties({ count: 3, note: `by ${uuid}`, verified: true }),
    ).toEqual({ count: 3, note: `by ${removed}`, verified: true });
  });
});
