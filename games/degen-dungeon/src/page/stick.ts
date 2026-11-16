// The thumb stick on a touch screen. During a day a thumb that lands anywhere on the left half of the picture takes the stick. Landing on
// the drawn ring itself, it steers at once, from the ring's middle toward the thumb, so pressing and holding the ring's edge walks
// that way without sliding at all (some phones and app frames take a sliding finger for a scroll and cancel it). Landing elsewhere on
// the left, the ring jumps under the thumb and the way the thumb then slides is the heading, one of sixteen. A thumb that has hardly
// moved stands still, and so does one that lifts, which also sends the ring back to its corner. The knob follows the thumb out to the
// ring's edge. A thumb taken away by the phone keeps the hero walking until the next touch. A new thumb on the left takes the stick over
// (so a thumb whose lifting the phone never reported cannot leave it stuck),
// and no touch on the left of the screen ever scrolls or zooms the page round it. While an offer waits, the left half is the screen's
// "no" again, so the stick lets the thumb go by.
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
  // The pointer steering, or -1 once the page or the app round it has taken the thumb away.
  id: number;
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
  // Whether a point of the page is on the left half of the screen.
  const onLeft = (x: number): boolean => {
    const box = screen.getBoundingClientRect();
    return x - box.left < box.width / 2;
  };
  // The middle of the drawn ring where it rests, when a point lands on it.
  const onRing = (x: number, y: number): { x: number; y: number } | null => {
    const box = ring?.getBoundingClientRect();
    if (box === undefined || box.width === 0) return null;
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    return Math.hypot(x - middle.x, y - middle.y) <= box.width / 2
      ? middle
      : null;
  };
  const onDown = (event: PointerEvent): void => {
    // A finger or a pen (a mouse is the keys' and buttons' business).
    if (event.pointerType === "mouse" || !steering()) return;
    if (!onLeft(event.clientX)) return;
    letGo();
    // The thumb is the stick's alone: the screen's other zones never hear of it, so it cannot act by sliding right.
    event.stopImmediatePropagation();
    event.preventDefault();
    const middle = onRing(event.clientX, event.clientY);
    thumb = {
      dir: -1,
      id: event.pointerId,
      x: middle?.x ?? event.clientX,
      y: middle?.y ?? event.clientY,
    };
    if (middle === null) {
      place(event.clientX, event.clientY);
      lean(0, 0);
    } else onMove(event);
  };
  const onUp = (event: PointerEvent): void => {
    if (thumb !== null && event.pointerId === thumb.id) letGo();
  };
  // Some phones and app frames take a held or sliding finger away (for a scroll or a long press) and report nothing more of it. A hero
  // already walking keeps going the way they were until the next touch, which takes the stick over or, as a tap, stops them.
  const onCancel = (event: PointerEvent): void => {
    const held = thumb;
    if (held === null || event.pointerId !== held.id) return;
    if (held.dir < 0) letGo();
    else held.id = -1;
  };
  // A drag on the screen would otherwise scroll or zoom the page round it on some phones; and a touch that starts on the stick's half is
  // kept from the page from its first moment, before a slide could be taken for a scroll and the thumb cancelled.
  const still = (event: Event): void => {
    event.preventDefault();
  };
  const hold = (event: TouchEvent): void => {
    const touch = event.changedTouches[0];
    if (touch !== undefined && steering() && onLeft(touch.clientX))
      event.preventDefault();
  };
  screen.addEventListener("pointerdown", onDown, { capture: true });
  screen.addEventListener("touchstart", hold, { passive: false });
  screen.addEventListener("touchmove", still, { passive: false });
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("blur", letGo);
  return () => {
    letGo();
    screen.removeEventListener("pointerdown", onDown, { capture: true });
    screen.removeEventListener("touchstart", hold);
    screen.removeEventListener("touchmove", still);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("blur", letGo);
  };
}
