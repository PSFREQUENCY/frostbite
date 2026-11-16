import { describe, expect, it } from "vitest";

import { GET } from "../src/app/r/[code]/route";

const visit = (code: string) =>
  GET(new Request(`https://platform.example.com/r/${code}`), {
    params: Promise.resolve({ code }),
  });

describe("a referral link", () => {
  it("takes the visitor to the sign-in page with the code in the address, and sets and stores nothing", async () => {
    const response = await visit("23456789");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/sign-in?ref=23456789");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("writes a code in lower case as a code, so a typed link works", async () => {
    expect((await visit("bcdfghjk")).headers.get("location")).toBe(
      "/sign-in?ref=BCDFGHJK",
    );
  });

  it.each([
    "nothing",
    "23456789X",
    "2345678",
    "O0I1LAEU",
    "..%2F..",
    "%0d%0aSet-Cookie:x=y",
    "//evil.example.com",
  ])(
    "takes the visitor to the plain sign-in page for %s, and never builds an address from it",
    async (code) => {
      const response = await visit(code);
      expect(response.headers.get("location")).toBe("/sign-in");
    },
  );
});
