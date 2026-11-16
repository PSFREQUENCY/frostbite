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

export function createStage(canvas: HTMLCanvasElement): Stage | null {
  if (typeof WebGL2RenderingContext === "undefined") return null;
  const context = canvas.getContext("webgl2", {
    antialias: true,
    powerPreference: "high-performance",
  });
  if (!(context instanceof WebGL2RenderingContext)) return null;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, canvas, context });
  } catch {
    return null;
  }
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  const camera = new PerspectiveCamera(50, aspect, 0.3, 1_200);
  let fitted = "";
  return {
    camera,
    draw(scene) {
      // The picture fills the canvas's box, whatever its shape; the game screen's map is drawn over its top.
      const width = canvas.clientWidth > 0 ? canvas.clientWidth : 960;
      const height = canvas.clientHeight > 0 ? canvas.clientHeight : 540;
      const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
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
