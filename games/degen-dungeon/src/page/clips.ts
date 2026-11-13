import { spotNamed } from "../rules/places.ts";
import { roomAt } from "../rules/rooms.ts";
import type { DayState } from "../rules/types.ts";
import { venueAt } from "../rules/venues.ts";
import { clipWords, type ClipKind } from "../script/clips.ts";
import { element } from "./elements.ts";

// The short cinematic clips that start or finish a task: walking into a shop or a landmark for the first time today, finishing a story
// beat or an activity, taking a ride, a letter, a lantern, a moonshot landing or rugging, the shuttle to the moon. While one plays the
// day waits (nothing is missed), the screen is letterboxed with a title, and any key or tap skips it.
export interface Clip {
  readonly kind: ClipKind;
  readonly length: number;
  readonly line: string;
  readonly title: string;
}

const clip = (key: string, title?: string): Clip | null => {
  const words = clipWords[key];
  if (words === undefined) return null;
  const [kind, named, line] = words;
  return {
    kind,
    length: kind === "sky" ? 4 : 2.6,
    line,
    title: title ?? named,
  };
};
// The words for a newly finished thing, by its id.
const finished = (id: string): Clip | null => {
  const kind = id.split("-")[0] ?? "";
  if (["bike", "car", "scooter"].includes(kind)) return clip(kind);
  if (["fit", "game", "letter"].includes(kind)) return clip(kind);
  if (clipWords[id] !== undefined) return clip(id);
  const label = spotNamed(id)?.label;
  return label === undefined ? null : clip("task", label.toUpperCase());
};
// The place a point is in: a shop or a landmark's hall.
const placeOf = (day: DayState): string | null =>
  roomAt(day.x, day.z)?.label ?? venueAt(day.x, day.z)?.label ?? null;

// What a step from one moment of a day to the next calls for, if anything. `seen` holds the places already walked into today.
export function clipFor(
  before: DayState,
  after: DayState,
  seen: Set<string>,
): Clip | null {
  if (before.shot > 0 && after.shot === 0)
    return after.pocket > before.pocket ? clip("moonshot") : clip("rugged");
  const fresh = after.done.filter((id) => !before.done.includes(id));
  for (const id of fresh) {
    const found = finished(id);
    if (found !== null) return found;
  }
  const place = placeOf(after);
  if (place === null || place === placeOf(before) || seen.has(place))
    return null;
  seen.add(place);
  return clip("enter", place.toUpperCase());
}

export interface Clips {
  // The clip playing and how far through it is (0 to 1), for the camera.
  current(): { readonly kind: ClipKind; readonly part: number } | null;
  playing(): boolean;
  // A new day: no places seen yet.
  reset(): void;
  skip(): void;
  step(dt: number): void;
  watch(before: DayState, after: DayState): void;
}

export function createClips(): Clips {
  const frame = element("clip", "div");
  const title = element("clip-title", "p");
  const line = element("clip-line", "p");
  let seen = new Set<string>();
  let now: { clip: Clip; at: number } | null = null;
  const stop = (): void => {
    now = null;
    frame.hidden = true;
  };
  frame.addEventListener("click", stop);
  return {
    current: () =>
      now === null
        ? null
        : { kind: now.clip.kind, part: Math.min(1, now.at / now.clip.length) },
    playing: () => now !== null,
    reset() {
      seen = new Set();
      stop();
    },
    skip: stop,
    step(dt) {
      if (now === null) return;
      now.at += dt;
      if (now.at >= now.clip.length) stop();
    },
    watch(before, after) {
      if (now !== null || after.ended) return;
      const found = clipFor(before, after, seen);
      if (found === null) return;
      now = { at: 0, clip: found };
      title.textContent = found.title;
      line.textContent = found.line;
      frame.hidden = false;
    },
  };
}
