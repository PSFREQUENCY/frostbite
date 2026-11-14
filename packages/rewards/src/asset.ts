import { assetRefSchema, type AssetRef } from "@frostbite/shared/chain";

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

// The chain an asset is on, the first part of its key (the chain's name has colons and no slash, so the first slash ends it).
export function chainOfAssetKey(assetKey: string): string {
  return assetKey.split("/", 1)[0] ?? "";
}

// The asset a key names (the reverse of `assetKeyOf`), or none for a text that is not a key.
export function assetOfKey(assetKey: string): AssetRef | null {
  const [chain, kind, ...rest] = assetKey.split("/");
  const id = rest.join("/");
  const parsed = assetRefSchema.safeParse({ chain, id, kind });
  return parsed.success ? parsed.data : null;
}
