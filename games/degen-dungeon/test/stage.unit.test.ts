import { Scene } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStage, fovFor } from "../src/view/stage.ts";

const made = vi.hoisted(() => ({
  asked: [] as unknown[],
  fail: false,
  lost: 0,
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

// The renderer's name is read through the debug extension, as a browser gives it; null where the browser keeps it to itself.
const rendererName = 0x9246;
class FakeGl {
  constructor(readonly renderer: string | null = "ANGLE (A graphics card)") {}
  getExtension(name: string): object | null {
    if (name === "WEBGL_lose_context")
      return { loseContext: () => void (made.lost += 1) };
    return name === "WEBGL_debug_renderer_info" && this.renderer !== null
      ? { UNMASKED_RENDERER_WEBGL: rendererName }
      : null;
  }
  getParameter(code: number): string | null {
    return code === rendererName ? this.renderer : null;
  }
}
const canvasOf = (context: unknown, clientWidth = 0, clientHeight = 0) =>
  ({
    clientHeight,
    clientWidth,
    getContext: (_kind: string, options: unknown) => {
      made.asked.push(options);
      return context;
    },
  }) as unknown as HTMLCanvasElement;

afterEach(() => {
  vi.unstubAllGlobals();
  made.asked.length = 0;
  made.fail = false;
  made.lost = 0;
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

  it("is not made where the browser draws without a graphics card, and lets go of the context it was given there", () => {
    vi.stubGlobal("WebGL2RenderingContext", FakeGl);
    const software = [
      "Google SwiftShader",
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
      "ANGLE (Mesa, Vulkan 1.4.335 (llvmpipe (LLVM 20.1.2 256 bits)), llvmpipe)",
      "Microsoft Basic Render Driver",
    ];
    for (const name of software)
      expect(createStage(canvasOf(new FakeGl(name))), name).toBeNull();
    expect(made.lost).toBe(software.length);
    // The browser is asked to refuse a slow context itself, and one that keeps its renderer's name to itself still gets the picture.
    expect(made.asked[0]).toMatchObject({ failIfMajorPerformanceCaveat: true });
    expect(createStage(canvasOf(new FakeGl(null)))).not.toBeNull();
    expect(createStage(canvasOf(new FakeGl()))).not.toBeNull();
    expect(made.lost).toBe(software.length);
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
