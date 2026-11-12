import { Scene } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStage } from "../src/view/stage.ts";

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

  it("draws the scene at the screen's shape inside its box, sizing only when the box changes", () => {
    vi.stubGlobal("WebGL2RenderingContext", FakeGl);
    const stage = createStage(canvasOf(new FakeGl()));
    stage?.draw(new Scene());
    stage?.draw(new Scene());
    expect([made.renders, made.sizes]).toEqual([2, ["ratio", "960x540"]]);
    made.sizes.length = 0;
    createStage(canvasOf(new FakeGl(), 1_000, 400))?.draw(new Scene());
    expect(made.sizes).toEqual(["ratio", "711x400"]);
  });
});
