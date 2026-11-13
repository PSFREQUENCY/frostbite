import type { WalletInfo } from "@frostbite/game-sdk/protocol";
import type { WalletNetwork } from "@frostbite/wallet/contracts";
import type { DockSection } from "@repo/ui/arcade";

import { WalletCard } from "./wallet-card.tsx";

// The dock's section for the wallet, for a game that declared the wallet capability: what the player has connected, how to ask for the
// chooser, and the network the game expects.
export function walletDockSection(wallet: {
  readonly connect: () => void;
  readonly current: WalletInfo | null;
  readonly expectedNetwork: WalletNetwork;
}): DockSection {
  return {
    badge: wallet.current === null ? null : "Connected",
    content: (
      <WalletCard
        connect={wallet.connect}
        current={wallet.current}
        expectedNetwork={wallet.expectedNetwork}
      />
    ),
    id: "wallet",
    label: "Wallet",
  };
}
