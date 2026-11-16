import { mount, settle, textOf } from "@frostbite/test-kit/dom";
import { WalletProvider } from "@frostbite/wallet/client";
import { describe, expect, it, vi } from "vitest";

import { AdminOverview } from "../src/ui/admin-overview.tsx";
import { AdminPayouts } from "../src/ui/admin-payouts.tsx";
import { BatchReview } from "../src/ui/batch-review.tsx";
import { batchOf, payNavigation, sentBatch } from "./support/batch.ts";
import { feeAsset, navigationFor, overview } from "./support/data.ts";
import { fakeApi } from "./support/fake-api.ts";

const payout = (change: object = {}) => ({
  amount: 20_000n,
  assetKey: feeAsset,
  beneficiaryId: "u1",
  completedAt: null,
  createdAt: new Date("2026-11-14T10:00:00.000Z"),
  destination: "sim:simnet:one:aaa",
  executor: null,
  executorRef: null,
  failureReason: null,
  id: "p1",
  programKey: "referral",
  state: "requested" as const,
  updatedAt: new Date("2026-11-14T10:00:00.000Z"),
  ...change,
});
// The app's layout provides the wallet connection above every page; a page rendered alone needs the same.
const page = (props: Partial<Parameters<typeof AdminPayouts>[0]> = {}) => (
  <WalletProvider network="signet">
    <AdminPayouts
      api={fakeApi()}
      batches={[]}
      explorerTxUrl="https://explorer.test/tx/{id}"
      names={new Map([["u1", "Ada"]])}
      navigation={[...navigationFor(false), ...payNavigation]}
      queue={[]}
      served
      signingWallets={["unisat"]}
      {...props}
    />
  </WalletProvider>
);

describe("the payouts page", () => {
  it("says what is waiting, who for and where, and that no batch has been built", async () => {
    const container = await mount(
      page({
        queue: [
          payout(),
          payout({ id: "p2", state: "in_progress", beneficiaryId: "gone" }),
        ],
      }),
    );
    const text = textOf(container);
    expect(text).toContain("Ada");
    expect(text).toContain("unknown");
    expect(text).toContain("to sim:simnet:one:aaa");
    expect(text).toContain("No batch has been built yet.");
    expect(text).not.toContain("Nothing is waiting.");
  });

  it("says plainly when nothing is waiting", async () => {
    const container = await mount(page());
    expect(textOf(container)).toContain("Nothing is waiting.");
  });

  it("says paying is not available, and offers nothing to build, when no network is served", async () => {
    const container = await mount(page({ queue: [payout()], served: false }));
    expect(textOf(container)).toContain("Paying is not available");
    expect(container.querySelector("form")).toBeNull();
  });

  it("lists the batches there have been, each as its network records show it, and picks up the one in progress", async () => {
    const container = await mount(
      page({
        api: fakeApi({
          refreshBatch: vi.fn(async () => ({
            batch: sentBatch(),
            status: "ok" as const,
          })),
        }),
        batches: [
          sentBatch({ id: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d90" }),
          sentBatch({
            id: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d91",
            state: "complete",
          }),
          sentBatch({
            id: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d92",
            state: "indexed_failure",
          }),
        ],
      }),
    );
    await settle(() => {
      expect(
        container.querySelector('[data-testid="batch-review"]'),
      ).not.toBeNull();
    });
    expect(
      container
        .querySelector('[data-testid="batch-review"]')
        ?.getAttribute("data-state"),
    ).toBe("broadcast_accepted");
    const text = textOf(container);
    expect(text).toContain("Paid");
    expect(text).toContain("Failed");
    expect(text).toContain("2 payments, 50,000 sats");
  });

  it("offers the Payouts link to those who may pay, and marks it as the page shown", async () => {
    const container = await mount(page());
    const links = [
      ...container.querySelectorAll('nav[aria-label="Referral sections"] a'),
    ];
    expect(links.map((link) => link.textContent)).toContain("Payouts");
    expect(
      container.querySelector(
        'nav[aria-label="Referral sections"] [aria-current]',
      )?.textContent,
    ).toBe("Payouts");
  });

  it("does not offer the Payouts link to staff who may not pay", async () => {
    const container = await mount(
      <AdminOverview navigation={navigationFor(false)} overview={overview()} />,
    );
    expect(
      [...container.querySelectorAll("a")].map((link) => link.textContent),
    ).not.toContain("Payouts");
  });
});

describe("the review of a batch", () => {
  it("leaves out nothing of what it pays, and says which payouts it left waiting and why", async () => {
    const container = await mount(
      <BatchReview
        batch={batchOf()}
        canSign
        message={null}
        onPaste={() => undefined}
        pasted=""
        skipped={[
          { payoutId: "a", reason: "dust" },
          { payoutId: "b", reason: "invalid-address" },
        ]}
      />,
    );
    const text = textOf(container);
    expect(text).toContain("sim:simnet:one:aaa");
    expect(text).toContain("sim:simnet:one:bbb");
    expect(text).toContain("under what the network relays");
    expect(text).toContain("an address the network does not accept");
    expect(container.querySelector("textarea")).toBeNull();
  });
});
