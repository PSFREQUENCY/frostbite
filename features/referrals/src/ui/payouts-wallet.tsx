"use client";

import { useStepWallet } from "@frostbite/wallet/client";
import type { ComponentProps } from "react";

import { PayoutsPanel } from "./payouts-panel.tsx";

// The panel over the wallet connected in the app's header: its address is offered as the one that pays, and the Sign button signs with it, if
// it is one of the wallets this deployment allows for signing steps.
export function PayoutsWallet({
  signingWallets,
  ...rest
}: Omit<ComponentProps<typeof PayoutsPanel>, "connectedAddress" | "sign"> & {
  readonly signingWallets: readonly string[];
}) {
  const wallet = useStepWallet(signingWallets);
  return (
    <PayoutsPanel
      {...rest}
      connectedAddress={wallet.address}
      sign={wallet.sign}
    />
  );
}
