import {
  ACESFilmicToneMapping,
  PerspectiveCamera,
  SRGBColorSpace,
  WebGLRenderer,
  type Scene,
} from "three";

// The three-dimensional picture, drawn on its own canvas behind the game screen (whose map and words are drawn over it). Where the
// browser has no WebGL 2 it is not made at all, and the screen draws the island flat instead: the game plays the same either way.
export interface Stage {
  readonly camera: PerspectiveCamera;
  draw(scene: Scene): void;
}

const aspect = 16 / 9;
// The field of view (degrees, up and down) for a canvas of a shape: the screen's own on a wide one, and opened out on a tall phone screen
// so the street still shows to either side, up to a limit.
export const fovFor = (fov: number, shape: number): number =>
  shape >= aspect
    ? fov
    : Math.min(
        88,
        (2 *
          Math.atan(
            Math.tan((fov * Math.PI) / 360) * Math.min(aspect / shape, 2.2),
          ) *
          180) /
          Math.PI,
      );

// How sharp the picture is drawn (its pixel ratio), stepped to the frame time measured: down a quarter while frames take longer than a
// smooth 40 a second allows, up a quarter while they come in well under a smooth 60, between one and the screen's own (at most two; a
// phone starts at one and a half). So a slow phone stays smooth and a fast one stays sharp.
export const nextRatio = (ratio: number, ms: number, most: number): number =>
  ms > 25
    ? Math.max(1, ratio - 0.25)
    : ms < 12
      ? Math.min(most, ratio + 0.25)
      : ratio;

// A browser drawing without a graphics card (a software rasteriser) draws the city a frame or two a second and has no time left for the
// page itself, so there the island is drawn flat, as it is with no WebGL 2 at all. The browser is asked to say so itself, and the
// renderer it names is checked as well, since not every software one is owned up to.
const software =
  /swiftshader|llvmpipe|lavapipe|softpipe|software|basic render/iu;
export const drawsInSoftware = (context: WebGL2RenderingContext): boolean => {
  const info = context.getExtension("WEBGL_debug_renderer_info");
  if (info === null) return false;
  const name: unknown = context.getParameter(info.UNMASKED_RENDERER_WEBGL);
  return typeof name === "string" && software.test(name);
};

export function createStage(canvas: HTMLCanvasElement): Stage | null {
  if (typeof WebGL2RenderingContext === "undefined") return null;
  const context = canvas.getContext("webgl2", {
    antialias: true,
    failIfMajorPerformanceCaveat: true,
    powerPreference: "high-performance",
  });
  if (!(context instanceof WebGL2RenderingContext)) return null;
  if (drawsInSoftware(context)) {
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, canvas, context });
  } catch {
    return null;
  }
  renderer.toneMapping = ACESFilmicToneMapping;
  // Haus De Savage cuts away what is above the hero's floor (`haus.ts`).
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = SRGBColorSpace;
  const camera = new PerspectiveCamera(50, aspect, 0.3, 1_200);
  let fitted = "";
  const most = Math.min(2, globalThis.devicePixelRatio || 1);
  let sharp =
    globalThis.matchMedia?.("(pointer: coarse)").matches === true
      ? Math.min(most, 1.5)
      : most;
  let last = 0;
  let spent = 0;
  let frames = 0;
  return {
    camera,
    draw(scene) {
      // Every forty frames or so, the time they took sets how sharp the next ones are (a pause or a hidden tab is not counted).
      const now = performance.now();
      const gap = now - last;
      last = now;
      if (gap > 0 && gap < 250) {
        spent += gap;
        frames += 1;
      }
      if (frames >= 40) {
        sharp = nextRatio(sharp, spent / frames, most);
        spent = 0;
        frames = 0;
      }
      // The picture fills the canvas's box, whatever its shape; the game screen's map is drawn over its top.
      const width = canvas.clientWidth > 0 ? canvas.clientWidth : 960;
      const height = canvas.clientHeight > 0 ? canvas.clientHeight : 540;
      const ratio = sharp;
      const size = `${String(width)}x${String(height)}@${String(ratio)}`;
      if (size !== fitted) {
        renderer.setPixelRatio(ratio);
        renderer.setSize(width, height, false);
        fitted = size;
      }
      camera.aspect = width / height;
      camera.fov = fovFor(camera.fov, camera.aspect);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    },
  };
}
