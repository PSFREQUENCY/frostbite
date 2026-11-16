// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { attachStick, stickReach } from "../src/page/stick.ts";

beforeAll(() => {
  document.body.innerHTML =
    /<body>([\s\S]*)<\/body>/u.exec(
      readFileSync(join(import.meta.dirname, "../index.html"), "utf8"),
    )?.[1] ?? "";
});

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});

// A phone screen 400 by 800 at the top left of the page, with the page's own drawn stick.
function setup(steering = () => true, withRing = true) {
  const screen = document.createElement("canvas");
  screen.getBoundingClientRect = () =>
    ({ height: 800, left: 0, top: 0, width: 400 }) as DOMRect;
  document.body.append(screen);
  const ring = withRing ? document.querySelector<HTMLElement>("#stick") : null;
  const move = vi.fn<(dir: number) => void>();
  stops.push(attachStick(screen, { move, ring, steering }));
  // Whatever listens on the screen after the stick: the zones, which must never hear of a thumb the stick takes.
  const after = vi.fn();
  screen.addEventListener("pointerdown", after);
  const knob = ring?.querySelector<HTMLElement>("span");
  const leaning = () => [
    knob?.style.getPropertyValue("--east"),
    knob?.style.getPropertyValue("--south"),
  ];
  return { after, leaning, move, ring, screen };
}
const send = (
  target: EventTarget,
  type: string,
  init: { id?: number; kind?: string; x?: number; y?: number },
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
  });
  Object.assign(event, {
    pointerId: init.id ?? 1,
    pointerType: init.kind ?? "touch",
  });
  target.dispatchEvent(event);
  return event;
};

describe("the thumb stick", () => {
  it("takes a thumb that lands on the left half, puts the ring under it, and steers by the way the thumb slides from there", () => {
    const { after, leaning, move, ring, screen } = setup();
    expect(
      send(screen, "pointerdown", { x: 100, y: 500 }).defaultPrevented,
    ).toBe(true);
    expect(after).not.toHaveBeenCalled();
    expect([ring?.style.left, ring?.style.top]).toEqual(["100px", "500px"]);
    send(window, "pointermove", { x: 104, y: 500 });
    expect(move).not.toHaveBeenCalled();
    expect(leaning()).toEqual(["0.10", "0.00"]);
    send(window, "pointermove", { x: 100, y: 470 });
    expect(leaning()).toEqual(["0.00", "-0.75"]);
    // Out past the ring's edge the knob stops at the edge, and the same way is not sent twice.
    send(window, "pointermove", { x: 100, y: 500 - stickReach * 3 });
    expect(leaning()).toEqual(["0.00", "-1.00"]);
    send(window, "pointermove", { x: 160, y: 500 });
    send(window, "pointerup", { x: 160, y: 500 });
    expect(move.mock.calls).toEqual([[12], [0], [-1]]);
    expect([ring?.style.left, ring?.style.top, ...leaning()]).toEqual([
      "",
      "",
      "0.00",
      "0.00",
    ]);
  });

  it("lets a thumb on the right, a mouse and any finger while an offer waits go by to the screen's zones, and gives the stick to a new thumb", () => {
    let playing = true;
    const { after, move, ring, screen } = setup(() => playing);
    expect(
      send(screen, "pointerdown", { x: 300, y: 500 }).defaultPrevented,
    ).toBe(false);
    send(screen, "pointerdown", { id: 2, kind: "mouse", x: 100, y: 500 });
    playing = false;
    send(screen, "pointerdown", { id: 3, x: 100, y: 500 });
    expect(after).toHaveBeenCalledTimes(3);
    expect(ring?.style.left).toBe("");
    playing = true;
    // A thumb whose lifting was never reported does not keep the stick: the next one takes it, and the old one is let go.
    send(screen, "pointerdown", { id: 4, x: 100, y: 500 });
    send(window, "pointermove", { id: 4, x: 140, y: 500 });
    send(screen, "pointerdown", { id: 5, x: 50, y: 300 });
    send(window, "pointermove", { id: 4, x: 100, y: 540 });
    send(window, "pointermove", { id: 5, x: 50, y: 260 });
    expect(after).toHaveBeenCalledTimes(3);
    expect(move.mock.calls).toEqual([[0], [-1], [12]]);
    expect(ring?.style.left).toBe("50px");
  });

  it("stands when the thumb is lifted, cancelled or the page loses focus, never lets a drag scroll the page, and stops when let go", () => {
    const { move, screen } = setup();
    const scroll = () => {
      const event = new Event("touchmove", { cancelable: true });
      screen.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(scroll()).toBe(true);
    send(screen, "pointerdown", { x: 100, y: 500 });
    send(window, "pointerup", { id: 9, x: 100, y: 500 });
    send(window, "pointerup", { x: 100, y: 500 });
    expect(move).not.toHaveBeenCalled();
    send(screen, "pointerdown", { x: 100, y: 500 });
    send(window, "pointermove", { x: 140, y: 500 });
    send(window, "pointercancel", { x: 140, y: 500 });
    send(screen, "pointerdown", { x: 100, y: 500 });
    send(window, "pointermove", { x: 100, y: 540 });
    window.dispatchEvent(new Event("blur"));
    expect(move.mock.calls).toEqual([[0], [-1], [4], [-1]]);
    for (const stop of stops.splice(0)) stop();
    expect(
      send(screen, "pointerdown", { x: 100, y: 500 }).defaultPrevented,
    ).toBe(false);
  });

  it("walks at once from the ring's middle when a thumb presses on the drawn ring itself, with no slide needed", () => {
    const { after, leaning, move, ring, screen } = setup();
    if (ring === null) throw new Error("no stick drawn");
    ring.getBoundingClientRect = () =>
      ({ height: 120, left: 40, top: 440, width: 120 }) as DOMRect;
    // Pressed on the ring's upper edge: north, and the ring stays where it is drawn.
    send(screen, "pointerdown", { x: 100, y: 450 });
    expect(after).not.toHaveBeenCalled();
    expect([ring.style.left, move.mock.calls]).toEqual(["", [[12]]]);
    expect(leaning()).toEqual(["0.00", "-1.00"]);
    send(window, "pointermove", { x: 150, y: 500 });
    send(window, "pointerup", { x: 150, y: 500 });
    // Pressed on its middle it waits for a slide, as anywhere else on the left does.
    send(screen, "pointerdown", { x: 101, y: 499 });
    expect(move.mock.calls).toEqual([[12], [0], [-1]]);
  });

  it("keeps a touch on the stick's half from the page from its first moment, and only while a day is played", () => {
    let playing = true;
    const { screen } = setup(() => playing);
    const touch = (x: number) => {
      const event = new Event("touchstart", { cancelable: true });
      Object.assign(event, { changedTouches: [{ clientX: x, clientY: 500 }] });
      screen.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect([touch(100), touch(300)]).toEqual([true, false]);
    playing = false;
    expect(touch(100)).toBe(false);
    const none = new Event("touchstart", { cancelable: true });
    Object.assign(none, { changedTouches: [] });
    screen.dispatchEvent(none);
    expect(none.defaultPrevented).toBe(false);
  });

  it("takes a pen the same as a finger", () => {
    const { move, screen } = setup();
    send(screen, "pointerdown", { kind: "pen", x: 100, y: 500 });
    send(window, "pointermove", { kind: "pen", x: 100, y: 540 });
    expect(move.mock.calls).toEqual([[4]]);
  });

  it("steers just the same on a page that draws no stick", () => {
    const { move, screen } = setup(() => true, false);
    send(screen, "pointerdown", { x: 100, y: 500 });
    send(window, "pointermove", { x: 60, y: 500 });
    expect(move.mock.calls).toEqual([[8]]);
  });
});
