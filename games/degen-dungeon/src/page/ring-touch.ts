// A finger on the screen before a day (the title, the hero ring, the card at a day's end). A sideways swipe of `swipeStep` pixels or
// more turns the ring one hero, the way a phone's carousels turn (left brings the next); a tap turns it on either side and starts (or
// wakes the hero) in the middle. A tap counts as the finger lifts, so a swipe that begins in the middle never wakes anyone, and a finger that wandered is
// no tap at all. The finger is the ring's alone: the screen's other zones never hear of it.
export const swipeStep = 40;
const tapSlop = 14;

export interface RingTouchOptions {
  readonly start: () => void;
  readonly turn: (by: number) => void;
  // Whether there is no day being played just now.
  readonly waiting: () => boolean;
}

interface Finger {
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  turned: boolean;
}

export function attachRingTouch(
  screen: HTMLElement,
  { start, turn, waiting }: RingTouchOptions,
): () => void {
  let finger: Finger | null = null;
  const onDown = (event: PointerEvent): void => {
    if (event.pointerType !== "touch" || !waiting()) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    finger = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      turned: false,
    };
  };
  const onMove = (event: PointerEvent): void => {
    const held = finger;
    if (held === null || event.pointerId !== held.id || held.turned) return;
    const across = event.clientX - held.startX;
    const sideways = Math.abs(across) > Math.abs(event.clientY - held.startY);
    if (Math.abs(across) < swipeStep || !sideways) return;
    held.turned = true;
    turn(across < 0 ? 1 : -1);
  };
  const onUp = (event: PointerEvent): void => {
    const held = finger;
    if (held === null || event.pointerId !== held.id) return;
    finger = null;
    if (event.type !== "pointerup" || held.turned) return;
    const moved = Math.hypot(
      event.clientX - held.startX,
      event.clientY - held.startY,
    );
    if (moved > tapSlop) return;
    const box = screen.getBoundingClientRect();
    const x = box.width > 0 ? (event.clientX - box.left) / box.width : 0.5;
    if (x < 0.25) turn(-1);
    else if (x > 0.75) turn(1);
    else start();
  };
  const forget = (): void => {
    finger = null;
  };
  screen.addEventListener("pointerdown", onDown, { capture: true });
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("blur", forget);
  return () => {
    screen.removeEventListener("pointerdown", onDown, { capture: true });
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("blur", forget);
  };
}
