// The thumb stick on a touch screen. During a day a thumb that lands anywhere on the left half of the picture takes the stick: the drawn
// ring jumps under it, and the way the thumb then slides from where it landed is the hero's heading, one of sixteen. A thumb that has
// hardly moved stands still, and so does one that lifts, which also sends the ring back to its corner. The knob follows the thumb out
// to the ring's edge. A new thumb on the left takes the stick over (so a thumb whose lifting the phone never reported cannot leave it
// stuck), and no drag on the screen ever scrolls or zooms the page. While an offer waits, the left half is the screen's "no" again, so
// the stick lets the thumb go by.
export const stickReach = 40;
export const stickDead = 9;

// The heading for a thumb this far east and south of where it landed (CSS pixels), or -1 while it is too close to steer.
export const wayOf = (east: number, south: number): number =>
  Math.hypot(east, south) < stickDead
    ? -1
    : (Math.round(Math.atan2(south, east) / (Math.PI / 8)) + 16) % 16;

export interface StickOptions {
  readonly move: (dir: number) => void;
  // The drawn stick (a ring with its knob inside), null where the page has none.
  readonly ring: HTMLElement | null;
  // Whether a thumb on the left steers just now: a day is being played and nothing waits for an answer.
  readonly steering: () => boolean;
}

interface Thumb {
  dir: number;
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export function attachStick(
  screen: HTMLElement,
  { move, ring, steering }: StickOptions,
): () => void {
  const knob = ring?.querySelector<HTMLElement>("span") ?? null;
  let thumb: Thumb | null = null;
  const lean = (east: number, south: number): void => {
    const length = Math.hypot(east, south);
    const share = length > stickReach ? stickReach / length : 1;
    knob?.style.setProperty("--east", ((east * share) / stickReach).toFixed(2));
    knob?.style.setProperty(
      "--south",
      ((south * share) / stickReach).toFixed(2),
    );
  };
  // The ring under a point of the page, or back in its corner.
  const place = (x: number | null, y: number | null): void => {
    if (ring === null) return;
    if (x === null || y === null) {
      ring.style.removeProperty("left");
      ring.style.removeProperty("top");
      return;
    }
    const box = (ring.parentElement ?? screen).getBoundingClientRect();
    ring.style.left = `${String(Math.round(x - box.left))}px`;
    ring.style.top = `${String(Math.round(y - box.top))}px`;
  };
  const letGo = (): void => {
    const held = thumb;
    if (held === null) return;
    thumb = null;
    place(null, null);
    lean(0, 0);
    if (held.dir >= 0) move(-1);
  };
  const onDown = (event: PointerEvent): void => {
    if (event.pointerType !== "touch" || !steering()) return;
    const box = screen.getBoundingClientRect();
    if (event.clientX - box.left >= box.width / 2) return;
    letGo();
    // The thumb is the stick's alone: the screen's other zones never hear of it, so it cannot act by sliding right.
    event.stopImmediatePropagation();
    event.preventDefault();
    thumb = {
      dir: -1,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    place(event.clientX, event.clientY);
    lean(0, 0);
  };
  const onMove = (event: PointerEvent): void => {
    const held = thumb;
    if (held === null || event.pointerId !== held.id) return;
    const east = event.clientX - held.x;
    const south = event.clientY - held.y;
    lean(east, south);
    const dir = wayOf(east, south);
    if (dir === held.dir) return;
    held.dir = dir;
    move(dir);
  };
  const onUp = (event: PointerEvent): void => {
    if (thumb !== null && event.pointerId === thumb.id) letGo();
  };
  // A drag on the screen would otherwise scroll or zoom the page round it on some phones.
  const still = (event: Event): void => {
    event.preventDefault();
  };
  screen.addEventListener("pointerdown", onDown, { capture: true });
  screen.addEventListener("touchmove", still, { passive: false });
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("blur", letGo);
  return () => {
    letGo();
    screen.removeEventListener("pointerdown", onDown, { capture: true });
    screen.removeEventListener("touchmove", still);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("blur", letGo);
  };
}
