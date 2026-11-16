import { ExplorerBoundary } from "@frostbite/feature-chain-status/transaction";
import {
  button,
  click,
  fieldByLabel,
  mount,
  settle,
  textOf,
  typeInto,
} from "@frostbite/test-kit/dom";
import { describe, expect, it, vi } from "vitest";

import { PayoutsPanel } from "../src/ui/payouts-panel.tsx";
import { batchOf, sentBatch, signedTransaction } from "./support/batch.ts";
import { feeAsset } from "./support/data.ts";
import { fakeApi } from "./support/fake-api.ts";

const panel = (props: Partial<Parameters<typeof PayoutsPanel>[0]> = {}) => (
  <ExplorerBoundary txUrl="https://explorer.test/tx/{id}">
    <PayoutsPanel
      assets={[feeAsset]}
      connectedAddress="sim:simnet:one:payer"
      initial={null}
      pollMs={10}
      {...props}
    />
  </ExplorerBoundary>
);
const started = (batch = batchOf()) => ({
  batch,
  resumed: false,
  skipped: [],
  status: "started" as const,
});

describe("building a batch", () => {
  it("asks for the asset and the connected wallet, and shows what the platform built for review", async () => {
    const startBatch = vi.fn(async () => started());
    const container = await mount(panel({ api: fakeApi({ startBatch }) }));
    expect(fieldByLabel(container, "Paying wallet address").value).toBe(
      "sim:simnet:one:payer",
    );
    await click(button(container, "Build the batch"));
    await settle(() => {
      expect(textOf(container)).toContain("Waiting for your signature");
    });
    expect(startBatch).toHaveBeenCalledWith({
      assetKey: feeAsset,
      wallet: "sim:simnet:one:payer",
    });
    expect(textOf(container)).toContain("2 payments");
    expect(textOf(container)).toContain("to sim:simnet:one:bbb");
  });

  it("builds for the wallet that was typed, not the connected one, and will not build for an empty one", async () => {
    const startBatch = vi.fn(async () => started());
    const container = await mount(
      panel({ api: fakeApi({ startBatch }), connectedAddress: "" }),
    );
    expect(button(container, "Build the batch")?.disabled).toBe(true);
    await typeInto(
      fieldByLabel(container, "Paying wallet address"),
      "sim:simnet:one:typed",
    );
    await click(button(container, "Build the batch"));
    await settle(() => {
      expect(startBatch).toHaveBeenCalledWith({
        assetKey: feeAsset,
        wallet: "sim:simnet:one:typed",
      });
    });
  });

  it("cannot be asked for when nothing is waiting", async () => {
    const container = await mount(panel({ assets: [] }));
    expect(button(container, "Build the batch")?.disabled).toBe(true);
  });

  it("offers a choice of asset only when more than one is waiting", async () => {
    const one = await mount(panel());
    expect(one.querySelector("select")).toBeNull();
    const many = await mount(
      panel({ assets: [feeAsset, "simnet:one/native/x"] }),
    );
    expect(many.querySelector("select")).not.toBeNull();
  });

  it("says why a batch was refused, and which payouts were left out", async () => {
    const container = await mount(
      panel({
        api: fakeApi({
          startBatch: vi.fn(async () => ({
            reason: "costs-more-than-it-pays" as const,
            skipped: [
              {
                payoutId: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9f",
                reason: "dust" as const,
              },
            ],
            status: "refused" as const,
          })),
        }),
      }),
    );
    await click(button(container, "Build the batch"));
    await settle(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        "more than this batch pays out",
      );
    });
    expect(textOf(container)).toContain("1 waiting payout(s) cannot be paid");
  });

  it("tells staff when the platform could not be reached, and changes nothing", async () => {
    const container = await mount(
      panel({
        api: fakeApi({
          startBatch: vi.fn(async () => {
            throw new Error("offline");
          }),
        }),
      }),
    );
    await click(button(container, "Build the batch"));
    await settle(() => {
      expect(textOf(container)).toContain("did not answer");
    });
    expect(button(container, "Build the batch")).not.toBeNull();
  });
});

describe("signing and following a batch", () => {
  it("signs with the wallet, sends what it signed, and then looks at the network until the batch is paid", async () => {
    const signed = { ...signedTransaction, payload: "signed-payload" };
    const sign = vi.fn(async () => signed);
    const submitBatch = vi.fn(async () => ({
      batch: sentBatch(),
      status: "submitted" as const,
    }));
    const refreshBatch = vi.fn(async () => ({
      batch: sentBatch({ state: "complete" }),
      status: "ok" as const,
    }));
    const container = await mount(
      panel({
        api: fakeApi({ refreshBatch, submitBatch }),
        initial: batchOf(),
        sign,
      }),
    );
    await click(button(container, "Sign with your wallet"));
    await settle(() => {
      expect(textOf(container)).toContain("Paid");
    });
    expect(sign).toHaveBeenCalledWith(signedTransaction);
    expect(submitBatch).toHaveBeenCalledWith({
      batchId: batchOf().id,
      signed,
    });
    expect(refreshBatch).toHaveBeenCalledWith({ batchId: batchOf().id });
    expect(button(container, "Close")).not.toBeNull();
  });

  it("does not say paid while the network has only seen it", async () => {
    const container = await mount(
      panel({
        api: fakeApi({
          refreshBatch: vi.fn(async () => ({
            batch: sentBatch({ state: "pending" }),
            status: "ok" as const,
          })),
        }),
        initial: sentBatch(),
      }),
    );
    await settle(() => {
      expect(textOf(container)).toContain("Waiting for confirmations");
    });
    expect(textOf(container)).not.toContain("every payout in it is paid");
  });

  it("keeps the batch signable when the wallet is declined, and says nothing was sent", async () => {
    const submitBatch = vi.fn();
    const container = await mount(
      panel({
        api: fakeApi({ submitBatch }),
        initial: batchOf(),
        sign: vi.fn(async () => {
          throw new Error("User rejected");
        }),
      }),
    );
    await click(button(container, "Sign with your wallet"));
    await settle(() => {
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
    });
    expect(submitBatch).not.toHaveBeenCalled();
    expect(textOf(container)).toContain("Waiting for your signature");
  });

  it("says when the wallet returned nothing, and when the platform refuses what was signed", async () => {
    const none = await mount(
      panel({ initial: batchOf(), sign: vi.fn(async () => null) }),
    );
    await click(button(none, "Sign with your wallet"));
    await settle(() => {
      expect(textOf(none)).toContain("Nothing was signed.");
    });
    const refused = await mount(
      panel({
        api: fakeApi({
          submitBatch: vi.fn(async () => ({
            reason: "invalid-signature" as const,
            status: "refused" as const,
          })),
        }),
        initial: batchOf(),
        sign: vi.fn(async () => signedTransaction),
      }),
    );
    await click(button(refused, "Sign with your wallet"));
    await settle(() => {
      expect(textOf(refused)).toContain("not what was shown");
    });
  });

  it("with no wallet that signs, shows the transaction to sign elsewhere and sends what is pasted", async () => {
    const submitBatch = vi.fn(async () => ({
      batch: sentBatch(),
      status: "submitted" as const,
    }));
    const container = await mount(
      panel({
        api: fakeApi({
          refreshBatch: vi.fn(async () => ({
            batch: sentBatch(),
            status: "ok" as const,
          })),
          submitBatch,
        }),
        initial: batchOf(),
      }),
    );
    expect(textOf(container)).toContain("No wallet that can sign");
    await click(button(container, "Send signed transaction"));
    await settle(() => {
      expect(textOf(container)).toContain(
        "Paste the signed transaction first.",
      );
    });
    expect(submitBatch).not.toHaveBeenCalled();
    await typeInto(
      fieldByLabel(container, "Signed transaction"),
      "  pasted-signed  ",
    );
    await click(button(container, "Send signed transaction"));
    await settle(() => {
      expect(submitBatch).toHaveBeenCalledWith({
        batchId: batchOf().id,
        signed: { ...signedTransaction, payload: "pasted-signed" },
      });
    });
  });

  it("shows a settled batch with its reason and lets staff close it", async () => {
    const container = await mount(
      panel({
        initial: sentBatch({
          failureReason: "reverted by the network",
          state: "indexed_failure",
        }),
      }),
    );
    expect(textOf(container)).toContain("reverted by the network");
    await click(button(container, "Close"));
    expect(button(container, "Build the batch")).not.toBeNull();
  });
});
