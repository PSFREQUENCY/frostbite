import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// The worker runs the platform's TypeScript with Node's own type stripping, which refuses some syntax (constructor parameter properties,
// enums) that the build accepts. The picture cleaner is loaded there, and by what it depends on, so it is loaded here the same way.
describe("the picture cleaner in the worker", () => {
  it("loads and cleans a picture under Node's type stripping, as the worker runs it", () => {
    const entry = resolve(import.meta.dirname, "../src/svg.ts");
    const program = `
      const { prepareSvg } = await import(${JSON.stringify(entry)});
      const policy = { maxAttributeLength: 1000, maxBytes: 10000, maxDepth: 8, maxElements: 50, purposes: [], rasterSide: 64 };
      const text = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"><rect width="2" height="1" fill="#000000"/></svg>';
      const result = prepareSvg(new TextEncoder().encode(text), policy);
      console.log(JSON.stringify({ ok: result.ok, width: result.width, height: result.height }));
    `;
    const output = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", program],
      { encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } },
    );
    expect(JSON.parse(output)).toEqual({ height: 32, ok: true, width: 64 });
  });
});
