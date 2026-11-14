import { describe, expect, it } from "vitest";

import {
  normalizeReferralCode,
  referralCodeAlphabet,
  referralCodeFromSearch,
  referralCodeLength,
  referralCodePattern,
  referralLinkPath,
  referralSignInPath,
} from "../src/referrals/code.ts";

describe("the shape of a referral code", () => {
  it("is eight characters of an alphabet with nothing that looks like another and no vowel", () => {
    expect(referralCodeLength).toBe(8);
    for (const lookAlike of ["0", "O", "1", "I", "L", "A", "E", "U"])
      expect(referralCodeAlphabet).not.toContain(lookAlike);
    expect(referralCodePattern.test("23456789")).toBe(true);
    expect(referralCodePattern.test("BCDFGHJK")).toBe(true);
    expect(referralCodePattern.test("2345678")).toBe(false);
    expect(referralCodePattern.test("234567890")).toBe(false);
    expect(referralCodePattern.test("2345678A")).toBe(false);
    expect(referralCodePattern.test("2345678\n")).toBe(false);
  });
});

describe("reading a code", () => {
  it("accepts any case and surrounding spaces, and nothing that is not the shape of a code", () => {
    expect(normalizeReferralCode(" bcdfghjk ")).toBe("BCDFGHJK");
    expect(normalizeReferralCode("BCDFGHJK")).toBe("BCDFGHJK");
    for (const bad of ["", "nothing", "BCDF GHJK", null, undefined])
      expect(normalizeReferralCode(bad)).toBeNull();
  });

  it("is read from the sign-in page's query string, and only from `ref`", () => {
    expect(referralCodeFromSearch("?ref=bcdfghjk&returnTo=%2F")).toBe(
      "BCDFGHJK",
    );
    expect(referralCodeFromSearch("?ref=nope")).toBeNull();
    expect(referralCodeFromSearch("?code=BCDFGHJK")).toBeNull();
    expect(referralCodeFromSearch("")).toBeNull();
  });
});

describe("the addresses of a referral", () => {
  it("shares /r/<code>, which leads to the sign-in page with the code in its address, or to the plain page for a text that is no code", () => {
    expect(referralLinkPath("BCDFGHJK")).toBe("/r/BCDFGHJK");
    expect(referralSignInPath("bcdfghjk", "/sign-in")).toBe(
      "/sign-in?ref=BCDFGHJK",
    );
    expect(referralSignInPath("../evil", "/sign-in")).toBe("/sign-in");
    expect(referralSignInPath(null, "/sign-in")).toBe("/sign-in");
  });
});
