import type { AssetRef } from "@frostbite/shared/chain";

// What an amount is an amount OF, as one short text the ledger can group and compare by: the chain, the kind of asset and its id. The same
// asset always gives the same key, and two different assets never do (a chain's name has colons, so the parts are told apart by slashes).
export function assetKeyOf(asset: AssetRef): string {
  return `${asset.chain}/${asset.kind}/${asset.id}`;
}

const assetKeyPattern =
  /^[^/\s]{1,128}\/(?:native|fungible|non-fungible)\/\S{1,128}$/u;

// Whether a text is an asset key a person or a kind could have made with `assetKeyOf`.
export function isAssetKey(value: string): boolean {
  return assetKeyPattern.test(value);
}
