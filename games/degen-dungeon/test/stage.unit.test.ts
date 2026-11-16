import { Scene } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStage, fovFor } from "../src/view/stage.ts";

const made = vi.hoisted(() => ({
  fail: false,
  renders: 0,
  sizes: [] as string[],
}));
vi.mock("three", async (original) => {
  const three = await original<typeof import("three")>();
  class WebGLRenderer {
    outputColorSpace = "";
    toneMapping = 0;
    constructor() {
      if (made.fail) throw new Error("no context");
    }
    render(): void {
      made.renders += 1;
    }
    setPixelRatio(): void {
      made.sizes.push("ratio");
    }
    setSize(width: number, height: number): void {
      made.sizes.push(`${String(width)}x${String(height)}`);
    }
  }
  return { ...three, WebGLRenderer };
});

class FakeGl {}
const canvasOf = (context: unknown, clientWidth = 0, clientHeight = 0) =>
  ({
    clientHeight,
    clientWidth,
    getContext: () => context,
  }) as unknown as HTMLCanvasElement;

afterEach(() => {
  vi.unstubAllGlobals();
  made.fail = false;
  made.renders = 0;
  made.sizes.length = 0;
});

describe("the three-dimensional stage", () => {
  it("is not made where the browser has no WebGL 2, hands back no context, or cannot start it", () => {
    expect(createStage(canvasOf(new FakeGl()))).toBeNull();
    vi.stubGlobal("WebGL2RenderingContext", FakeGl);
    expect(createStage(canvasOf(null))).toBeNull();
    made.fail = true;
    expect(createStage(canvasOf(new FakeGl()))).toBeNull();
  });

  it("fills its box whatever its shape, sizing only when the box changes, and opens the view out on a tall screen", () => {
    vi.stubGlobal("WebGL2RenderingContext", FakeGl);
    const stage = createStage(canvasOf(new FakeGl()));
    stage?.draw(new Scene());
    stage?.draw(new Scene());
    expect([made.renders, made.sizes]).toEqual([2, ["ratio", "960x540"]]);
    made.sizes.length = 0;
    const wide = createStage(canvasOf(new FakeGl(), 1_000, 400));
    wide?.draw(new Scene());
    expect(made.sizes).toEqual(["ratio", "1000x400"]);
    expect(wide?.camera.aspect).toBeCloseTo(2.5);
    expect(fovFor(50, 2.5)).toBe(50);
    expect(fovFor(50, 9 / 19.5)).toBeGreaterThan(70);
    expect(fovFor(80, 0.3)).toBe(88);
  });
});
