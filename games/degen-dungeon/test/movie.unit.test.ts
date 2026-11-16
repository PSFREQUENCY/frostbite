// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildMovie,
  drawFilm,
  filmAt,
  filmLength,
  films,
} from "../src/view/movie.ts";

// A 2D context that accepts every drawing call, counting the shapes filled and keeping the words written.
function recorder() {
  const words: string[] = [];
  let shapes = 0;
  const gradient = { addColorStop: () => undefined };
  const pen = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "createLinearGradient" || key === "createRadialGradient"
          ? () => gradient
          : key === "fillText"
            ? (text: string) => void words.push(text)
            : key === "fillRect" || key === "fill"
              ? () => void (shapes += 1)
              : () => undefined,
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
  return { pen, shapes: () => shapes, words };
}
afterEach(() => vi.restoreAllMocks());

describe("the Starlight Cinema's films", () => {
  it("run one after another, half a minute each, round and round", () => {
    expect([filmAt(0), filmAt(31), filmAt(65), filmAt(95)]).toEqual([
      { at: 0, index: 0 },
      { at: 1, index: 1 },
      { at: 5, index: 2 },
      { at: 5, index: 0 },
    ]);
    expect(films.length * filmLength).toBe(90);
  });

  it("open on a title card and then play, every film with its own picture", () => {
    for (const [index, name] of films.entries()) {
      const card = recorder();
      drawFilm(card.pen, index * filmLength + 1);
      expect(card.words).toEqual([name, "A STARLIGHT PICTURE"]);
      // Into each film, at a few moments (a rocket, a splash, a scooter), something is drawn and no words are.
      for (const at of [4, 9, 12.5, 20, 29]) {
        const playing = recorder();
        drawFilm(playing.pen, index * filmLength + at);
        expect(playing.words).toEqual([]);
        expect(playing.shapes()).toBeGreaterThan(5);
      }
    }
  });

  it("is a lit screen that redraws twelve times a second where it can draw, and a plain one where it cannot", () => {
    const plain = buildMovie(24, 9);
    plain.play(1);
    expect(plain.mesh.name).toBe("movie");
    const drawn = recorder();
    const draw = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => drawn.pen);
    const screen = buildMovie(24, 9);
    screen.play(1);
    screen.play(1.05);
    const once = drawn.shapes();
    screen.play(1.1);
    expect(once).toBeGreaterThan(0);
    expect(drawn.shapes()).toBeGreaterThan(once);
    expect(draw).toHaveBeenCalled();
  });
});
