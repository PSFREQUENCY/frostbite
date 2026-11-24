// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { attachRingTouch, swipeStep } from "../src/page/ring-touch.ts";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});

// A phone screen 400 by 800 at the top left of the page.
function setup(waiting = () => true) {
  const screen = document.createElement("canvas");
  screen.getBoundingClientRect = () =>
    ({ height: 800, left: 0, top: 0, width: 400 }) as DOMRect;
  document.body.append(screen);
  const start = vi.fn<() => void>();
  const turn = vi.fn<(by: number) => void>();
  stops.push(attachRingTouch(screen, { start, turn, waiting }));
  // Whatever listens on the screen after the ring: the zones, which must never hear of a finger the ring takes.
  const after = vi.fn();
  screen.addEventListener("pointerdown", after);
  return { after, screen, start, turn };
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
const tap = (screen: EventTarget, x: number, y = 400, id = 1) => {
  send(screen, "pointerdown", { id, x, y });
  send(window, "pointerup", { id, x: x + 3, y: y + 2 });
};

describe("a finger before a day", () => {
  it("turns the ring with a tap on either side and starts with a tap in the middle, each as the finger lifts", () => {
    const { after, screen, start, turn } = setup();
    send(screen, "pointerdown", { x: 200, y: 400 });
    expect(start).not.toHaveBeenCalled();
    send(window, "pointerup", { x: 202, y: 401 });
    tap(screen, 40);
    tap(screen, 370);
    expect(start).toHaveBeenCalledTimes(1);
    expect(turn.mock.calls).toEqual([[-1], [1]]);
    expect(after).not.toHaveBeenCalled();
  });

  it("turns the ring one hero for a sideways swipe however long, and never starts on one", () => {
    const { screen, start, turn } = setup();
    send(screen, "pointerdown", { x: 200, y: 400 });
    send(window, "pointermove", { x: 200 - swipeStep + 1, y: 402 });
    expect(turn).not.toHaveBeenCalled();
    send(window, "pointermove", { x: 200 - swipeStep, y: 404 });
    send(window, "pointermove", { x: 200 - swipeStep * 2, y: 404 });
    send(window, "pointerup", { x: 200 - swipeStep * 2, y: 404 });
    send(screen, "pointerdown", { id: 2, x: 100, y: 400 });
    send(window, "pointermove", { id: 2, x: 100 + swipeStep, y: 400 });
    send(window, "pointerup", { id: 2, x: 100 + swipeStep, y: 400 });
    expect(turn.mock.calls).toEqual([[1], [-1]]);
    expect(start).not.toHaveBeenCalled();
  });

  it("does nothing for a drag that wanders, a finger cancelled or lost to the page, an upward drag, or another finger", () => {
    const { screen, start, turn } = setup();
    send(screen, "pointerdown", { x: 200, y: 400 });
    send(window, "pointermove", { x: 200, y: 300 });
    send(window, "pointerup", { x: 200, y: 300 });
    send(screen, "pointerdown", { x: 200, y: 400 });
    send(window, "pointercancel", { x: 200, y: 400 });
    send(screen, "pointerdown", { x: 200, y: 400 });
    window.dispatchEvent(new Event("blur"));
    send(window, "pointerup", { x: 200, y: 400 });
    send(screen, "pointerdown", { x: 200, y: 400 });
    send(window, "pointermove", { id: 7, x: 0, y: 400 });
    send(window, "pointerup", { id: 7, x: 0, y: 400 });
    expect([start.mock.calls.length, turn.mock.calls.length]).toEqual([0, 0]);
  });

  it("lets a mouse and any finger during a day go by to the zones, and stops when let go", () => {
    let waiting = false;
    const { after, screen, start } = setup(() => waiting);
    tap(screen, 200);
    send(screen, "pointerdown", { kind: "mouse", x: 200, y: 400 });
    waiting = true;
    for (const stop of stops.splice(0)) stop();
    tap(screen, 200);
    expect([after.mock.calls.length, start.mock.calls.length]).toEqual([3, 0]);
  });

  it("starts in the middle of a screen that has no size yet", () => {
    const { screen, start } = setup();
    screen.getBoundingClientRect = () =>
      ({ height: 0, left: 0, top: 0, width: 0 }) as DOMRect;
    tap(screen, 10);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
