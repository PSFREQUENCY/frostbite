import { chainRefSchema } from "@frostbite/shared/chain";
import { describe, expect, it } from "vitest";

import { assetKeyOf, assetOfKey, chainOfAssetKey } from "../src/asset.ts";

const asset = {
  chain: chainRefSchema.parse("simnet:one"),
  id: "sim",
  kind: "native" as const,
};

describe("an asset and its key", () => {
  it("are one another: the key names the chain, the kind and the id, and reads back as the asset", () => {
    const key = assetKeyOf(asset);
    expect(key).toBe("simnet:one/native/sim");
    expect(assetOfKey(key)).toEqual(asset);
    expect(chainOfAssetKey(key)).toBe("simnet:one");
  });

  it("keeps an id that has slashes of its own, and reads a text that is not a key as none", () => {
    expect(assetOfKey("simnet:one/fungible/2:68/x")).toEqual({
      chain: "simnet:one",
      id: "2:68/x",
      kind: "fungible",
    });
    for (const bad of ["", "nothing", "simnet:one/gold/x", "simnet:one/native"])
      expect(assetOfKey(bad)).toBeNull();
    expect(chainOfAssetKey("")).toBe("");
  });
});
