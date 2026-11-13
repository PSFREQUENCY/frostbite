import { validateBitcoinAddress } from "@frostbite/chain/bitcoin";
import type { WalletChallenge } from "@frostbite/database/schema/auth";
import { isWalletNetwork } from "@frostbite/shared/chain";
import { uuidV7Schema } from "@frostbite/shared/identifiers";

import type { StoredWalletChallenge } from "../application/repository.ts";
import {
  walletAuthActions,
  type WalletAuthAction,
} from "../domain/contracts.ts";

// A stored challenge as the row holds it, and whether a row is the challenge the caller holds.
function isAction(value: string): value is WalletAuthAction {
  return walletAuthActions.some((action) => action === value);
}

export function mapChallenge(
  row: WalletChallenge,
): StoredWalletChallenge | null {
  if (!isWalletNetwork(row.network) || !isAction(row.action)) return null;
  const address = validateBitcoinAddress(row.address, row.network);
  const challengeId = uuidV7Schema.safeParse(row.id);
  const requestId = uuidV7Schema.safeParse(row.requestId);
  const expectedUserId =
    row.expectedUserId === null
      ? null
      : uuidV7Schema.safeParse(row.expectedUserId);
  if (!address.ok || !challengeId.success || !requestId.success) return null;
  if (expectedUserId !== null && !expectedUserId.success) return null;
  return {
    action: row.action,
    address: address.value.address,
    attempts: row.attempts,
    challengeId: challengeId.data,
    consumedAt: row.consumedAt,
    domain: row.domain,
    expectedUserId: expectedUserId?.data ?? null,
    expiresAt: row.expiresAt,
    issuedAt: row.issuedAt,
    messageHash: row.messageHash,
    network: row.network,
    nonce: row.nonce,
    origin: row.origin,
    requestId: requestId.data,
    scriptIdentity: row.scriptIdentity,
    uri: row.uri,
    walletAdapter: row.walletAdapter,
  };
}

export function rowMatchesChallenge(
  row: WalletChallenge,
  challenge: StoredWalletChallenge,
): boolean {
  return (
    row.action === challenge.action &&
    row.address === challenge.address &&
    row.domain === challenge.domain &&
    row.expectedUserId === challenge.expectedUserId &&
    row.issuedAt.getTime() === challenge.issuedAt.getTime() &&
    row.messageHash === challenge.messageHash &&
    row.network === challenge.network &&
    row.nonce === challenge.nonce &&
    row.origin === challenge.origin &&
    row.requestId === challenge.requestId &&
    row.scriptIdentity === challenge.scriptIdentity &&
    row.uri === challenge.uri &&
    row.walletAdapter === challenge.walletAdapter
  );
}
