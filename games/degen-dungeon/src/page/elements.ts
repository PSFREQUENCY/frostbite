// The element with an id, checked to be the tag the page expects, or a clear error naming what is missing.
export function element<Tag extends keyof HTMLElementTagNameMap>(
  id: string,
  tag: Tag,
): HTMLElementTagNameMap[Tag] {
  const found = document.getElementById(id);
  if (found?.tagName.toLowerCase() !== tag) throw new Error(`Missing #${id}`);
  return found as HTMLElementTagNameMap[Tag];
}

// Calls back on every frame the browser draws, with the time and the time since the last frame, in seconds (a tenth at most).
export function everyFrame(draw: (time: number, dt: number) => void): void {
  let last = 0;
  const frame = (now: number): void => {
    draw(now / 1_000, Math.min(0.1, (now - last) / 1_000));
    last = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
