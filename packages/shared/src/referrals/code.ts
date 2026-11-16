import { z } from "zod";

// A referral code is how one person's link finds them without saying who they are: opaque (drawn at random, it holds no address, email or
// account id), short enough to read out, and spelled in an alphabet with no letter that looks like another (no 0/O, 1/I/L) and no vowel, so a
// code never spells a word. 8 of 28 characters is about 3.8 × 10^11 codes, which a rate-limited public route cannot walk through. The
// alphabet and length are stated once, here, because three places must agree on them: the one that makes a code, the one that reads it from an
// address, and the sign-in request that carries it.
export const referralCodeAlphabet = "23456789BCDFGHJKMNPQRSTVWXYZ" as const;
export const referralCodeLength = 8;

export const referralCodePattern = new RegExp(
  `^[${referralCodeAlphabet}]{${String(referralCodeLength)}}$`,
  "u",
);

export const referralCodeSchema = z.string().regex(referralCodePattern);

// What a code is written as in an address and what the sign-in page's query calls it.
export const referralParameter = "ref";
export const referralLinkPrefix = "/r";

// The code as people may type or paste it: any case, with surrounding spaces. Null if it is not the shape of a code (nothing is looked up).
export function normalizeReferralCode(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return referralCodePattern.test(code) ? code : null;
}

// The path a person shares: `/r/<code>`.
export function referralLinkPath(code: string): string {
  return `${referralLinkPrefix}/${code}`;
}

// The sign-in page a referral link leads to; the plain page when the code is not the shape of one.
export function referralSignInPath(
  code: string | null | undefined,
  signInPath: string,
): string {
  const normalized = normalizeReferralCode(code);
  return normalized === null
    ? signInPath
    : `${signInPath}?${referralParameter}=${normalized}`;
}

// The code a sign-in page was opened with, from its query string (`window.location.search`).
export function referralCodeFromSearch(search: string): string | null {
  return normalizeReferralCode(
    new URLSearchParams(search).get(referralParameter),
  );
}
