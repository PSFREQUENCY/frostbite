import { randomUUID } from "node:crypto";

import { referralKindId, referralProgramKey } from "@frostbite/referrals";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createReferralsFeature } from "../src/registration.ts";
import { featureConfig } from "./support/config.ts";
import { navigationFor } from "./support/data.ts";
import {
  clock,
  earn,
  reads,
  registerDatabase,
  seedUser,
} from "./support/database.ts";

registerDatabase();

const load = () =>
  createReferralsFeature(featureConfig()).load({
    registeredFeatureCount: 1,
    registeredFeatureIds: ["referrals"],
  });
const render = async (path: string, context: object = {}) => {
  const entrypoint = await load();
  const page = entrypoint.pages?.find((candidate) => candidate.path === path);
  if (page === undefined) throw new Error(`no page ${path}`);
  return renderToStaticMarkup(
    await page.render({
      actorUserId: null,
      navigation: navigationFor(true),
      params: {},
      ...context,
    } as never),
  );
};
const setProgram = async (rateBasisPoints: number, enabled = true) => {
  const admin = await seedUser("Ada Admin");
  clock.now = new Date(clock.now.getTime() + 1_000);
  const result = await reads.program.set(admin, {
    enabled,
    maturitySeconds: 0,
    minimumPayout: 10_000n,
    rateBasisPoints,
  });
  if (!result.ok) throw new Error(result.code);
  return admin;
};

describe("the feature's pages as the platform renders them", () => {
  it("are the person's two, public and signed-in, and staff's four, with the access each needs", async () => {
    const entrypoint = await load();
    expect(
      entrypoint.pages?.map(({ access, path }) => [
        path,
        access.kind === "platform" ? access.capability : access.kind,
      ]),
    ).toEqual([
      ["/referrals", "public"],
      ["/referrals/history", "authenticated"],
      ["/admin/referrals", "referral:view"],
      ["/admin/referrals/program", "referral:administer"],
      ["/admin/referrals/referrers", "referral:view"],
      ["/admin/referrals/referrers/[referrerId]", "referral:view"],
    ]);
    expect(
      entrypoint.operations?.map(({ route }) => route.operationId),
    ).toEqual([
      "setReferralProgram",
      "setReferrerFrozen",
      "requestReferralPayout",
    ]);
  });

  it("lets only the public page be found and shared, and keeps every other out of search", async () => {
    const entrypoint = await load();
    const [pub, ...rest] = entrypoint.pages ?? [];
    expect(await pub?.metadata?.({ params: {} })).toMatchObject({
      kind: "shared",
      title: "Bring a friend, earn from every mint",
    });
    for (const page of rest)
      expect(await page.metadata?.({ params: {} })).toEqual({
        kind: "private",
      });
  });

  it("tells a signed-out visitor the terms from the program in force, and a signed-in referrer their link and what they earned", async () => {
    await setProgram(400);
    const signedOut = await render("/referrals");
    expect(signedOut).toContain("You earn 4% of the platform fee");
    expect(signedOut).toContain("Sign in to get your own link");

    const referrer = await seedUser();
    await earn(referrer, 3_000n, randomUUID());
    const signedIn = await render("/referrals", { actorUserId: referrer });
    expect(signedIn).toContain("120 sats");
    expect(signedIn).toContain("ready to be paid");
    expect(signedIn).toMatch(/\/r\/[2-9B-DF-HJ-NP-TV-Z]{8}/u);

    await setProgram(400, false);
    expect(await render("/referrals")).toContain("switched off right now");
  });

  it("shows a referrer their own history, and nothing to a visitor who is not signed in", async () => {
    await setProgram(300);
    const referrer = await seedUser();
    await earn(referrer, 3_000n, randomUUID());
    const html = await render("/referrals/history", { actorUserId: referrer });
    expect(html).toContain("+90 sats");
    expect(html).toContain("Ready");
    expect(await render("/referrals/history")).toContain("Nothing here");
  });

  it("shows staff the overview, and an administrator the program with the names of who changed it", async () => {
    const admin = await setProgram(300);
    expect(await render("/admin/referrals")).toContain(
      "What the platform owes",
    );
    const html = await render("/admin/referrals/program");
    expect(html).toContain("Ada Admin");
    expect(html).toContain("Minimum payout");
    expect(html).toContain("2592000");
    expect(admin).toBeTruthy();
    expect(referralKindId).toBe("referral-cut");
    expect(referralProgramKey).toBe("referral");
  });

  it("lists the referrers for a view read from the address, and shows one whole, or nothing for one who is not there", async () => {
    await setProgram(300);
    const referrer = await seedUser("Zed Referrer");
    const person = await seedUser();
    const code = await reads.codes.ensure(referrer);
    expect(code).toHaveLength(8);
    await earn(referrer, 3_000n, randomUUID());
    expect(
      await render("/admin/referrals/referrers", {
        searchParams: { filter: "waiting", page: "garbage" },
      }),
    ).toContain("Referrers");
    const missing = await render("/admin/referrals/referrers/[referrerId]", {
      params: { referrerId: randomUUID() },
    });
    expect(missing).toContain("Nothing here");
    const noParam = await render("/admin/referrals/referrers/[referrerId]");
    expect(noParam).toContain("Nothing here");
    expect(person).toBeTruthy();
  });
});
