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
      // The picture keeps the screen's shape inside the canvas's box, as the game screen does, so the two line up.
      const boxWidth = canvas.clientWidth > 0 ? canvas.clientWidth : 960;
      const boxHeight = canvas.clientHeight > 0 ? canvas.clientHeight : 540;
      const width = Math.round(Math.min(boxWidth, boxHeight * aspect));
      const height = Math.round(width / aspect);
      const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
      const size = `${String(width)}x${String(height)}@${String(ratio)}`;
      if (size !== fitted) {
        renderer.setPixelRatio(ratio);
        renderer.setSize(width, height, false);
        fitted = size;
      }
      renderer.render(scene, camera);
    },
  };
}
