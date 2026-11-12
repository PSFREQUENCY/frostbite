import { setUpSound } from "@frostbite/game-sdk/audio/setup";
import type { RunView } from "@frostbite/game-sdk/card";
import { cardFor } from "@frostbite/game-sdk/card";
import { createGameClient, GameHostError } from "@frostbite/game-sdk/client";
import { createGuideLayer } from "@frostbite/game-sdk/guide-layer";
import { createPause, pauseCopy } from "@frostbite/game-sdk/pause";
import {
  connectToPlatform,
  type PlatformPlay,
  sendRun,
} from "@frostbite/game-sdk/play";
import { createRunLoop } from "@frostbite/game-sdk/run-loop";
import { restartDelayMs } from "@frostbite/game-sdk/touch-start";

import { effects, track } from "./audio.ts";
import { guideFor } from "./guide.ts";
import { attachControls, type Mode } from "./page/controls.ts";
import { element } from "./page/elements.ts";
import { listEarned, noteFor, starsText } from "./page/hud.ts";
import { afterDay, freshProgress, restore, type Progress } from "./progress.ts";
import { ticksPerSecond } from "./rules/constants.ts";
import { heroes } from "./rules/heroes.ts";
import { statusOf } from "./rules/status.ts";
import { drawScreen } from "./screen/flat.ts";
import { resultOf } from "./screen/result.ts";
import { wakeUps } from "./script/cast.ts";
import { createRunSession, type Choice, type RunSession } from "./session.ts";
import { createStage } from "./view/stage.ts";
import { createWorldView } from "./view/world-view.ts";

// The page of the game: it draws, it plays, and it asks the platform to remember. It saves nothing itself and asks nothing of the
// network. The rules, the session, the picture and the words are in their own modules; this only joins them to the page and the platform.
// The first screen is the hero select (one Enter or one tap starts a day, as every game on the platform must); the opening cinematic
// plays at the start of the first day and can be skipped; then the hero wakes up and the day runs.
const client = createGameClient();
const status = element("status", "p");
const note = element("note", "p");
const screen = element("screen", "canvas");
const worldCanvas = element("world", "canvas");
const guideLayer = createGuideLayer(screen);
const outs = {
  best: element("best", "strong"),
  heat: element("heat", "strong"),
  mood: element("mood", "strong"),
  score: element("score", "strong"),
};
const earnedList = element("earned", "ul");
const startButton = element("start", "button");
const actButton = element("act", "button");
const pauseButton = element("pause", "button");
const context = screen.getContext("2d");
const stage = createStage(worldCanvas);
const world = stage === null ? null : createWorldView(stage);
worldCanvas.hidden = world === null;

let play: PlatformPlay | null = null;
let progress: Progress = freshProgress;
let session: RunSession | null = null;
let view: RunView = { best: 0, newBest: false, phase: "ready", toast: null };
let runId: string | null = null;
let titles = new Map<string, string>();
let heldNote = "";
let hero = freshProgress.hero;
// Seconds into the opening while it plays, the picture's own clock, and until when the camera stays on the hands or the waking face.
let intro: number | null = null;
let seconds = 0;
let closeUntil = 0;
let wakeUntil = 0;
let endedAt = -restartDelayMs;

const pause = createPause();
const saveProgress = (): void => void client.progress.save({ ...progress });
const sound = setUpSound({
  container: element("sound", "div"),
  effects,
  pause,
  save: (settings) => {
    progress = { ...progress, sound: settings };
    saveProgress();
  },
  track,
});
const localSeed = (): number => Math.floor(Math.random() * 0x1_0000_0000);
const locked = (): boolean => (heroes[hero]?.hidden ?? true) && !progress.slip;

function show(dt = 0): void {
  const day = session?.state() ?? null;
  outs.best.textContent = String(progress.best);
  outs.score.textContent = String(day?.pocket ?? 0);
  outs.heat.textContent = starsText(day?.heat ?? 0);
  outs.mood.textContent = day === null ? "GM" : statusOf(day);
  if (view.phase === "running" && day !== null) {
    const caption = intro === null ? null : (world?.opening(intro) ?? null);
    if (caption === null) {
      intro = null;
      world?.day(day, seconds, dt, seconds < closeUntil);
    }
    if (!pause.paused())
      note.textContent =
        caption ??
        (seconds < wakeUntil ? (wakeUps[day.hero] ?? "") : noteFor(day));
  } else world?.turntable(hero, locked(), seconds, dt);
  if (context !== null)
    drawScreen(context, view.phase === "ready" ? null : day, world !== null);
  guideLayer.show(
    cardFor(view.phase, guideFor(hero, progress.day, progress.slip), () =>
      day === null ? null : resultOf(day, view),
    ),
  );
}

function setRunning(running: boolean): void {
  startButton.hidden = running;
  actButton.disabled = !running;
  pauseButton.disabled = !running;
}

pause.subscribe((paused) => {
  pauseButton.textContent = paused ? pauseCopy.resume : pauseCopy.pause;
  if (paused) {
    heldNote = note.textContent;
    note.textContent = pauseCopy.paused;
  } else note.textContent = heldNote;
});

async function finish(finished: RunSession): Promise<void> {
  setRunning(false);
  sound.music(false);
  endedAt = performance.now();
  const done = afterDay(progress, finished.state());
  progress = done.progress;
  view = { ...view, best: progress.best, newBest: done.newBest, phase: "over" };
  saveProgress();
  show();
  startButton.textContent = "Another day";
  await sendRun(play, runId, finished.record());
}

const loop = createRunLoop({
  frame(ticks) {
    const running = session;
    if (running === null) return false;
    const dt = ticks / ticksPerSecond;
    seconds += dt;
    // The day does not start until the opening is over, so nothing is missed by watching it.
    if (intro !== null) intro += dt;
    else
      for (let at = 0; at < ticks && !running.state().ended; at += 1)
        running.tick();
    listEarned(earnedList, running.earned(), titles);
    show(dt);
    if (!running.state().ended) return true;
    void finish(running);
    return false;
  },
  page: document,
  pause,
  ticksPerSecond,
});

// A choice during a day. Any act skips the opening while it plays; a spot used is a moment for the close-up.
function choose(choice: Choice): void {
  const running = session;
  if (running === null || !loop.active()) return;
  if (intro !== null) {
    if (choice.type === "act") intro = null;
    return;
  }
  const outcome = running.send(choice);
  if (choice.type !== "move") sound.sfx(outcome.ok ? "catch" : "miss");
  if (outcome.ok && choice.type === "act") closeUntil = seconds + 0.9;
  wakeUntil = 0;
  listEarned(earnedList, running.earned(), titles);
  show();
  if (!running.state().ended) return;
  loop.stop();
  void finish(running);
}

const begin = (): Promise<void> =>
  loop.launch(async () => {
    const started = await play?.runs.start().catch(() => null);
    const ready = started?.status === "started" ? started : null;
    runId = ready?.runId ?? null;
    session = createRunSession({
      day: progress.day,
      hero,
      onEarned: (id) => {
        sound.sfx("milestone");
        play?.report(id);
      },
      seed: ready?.seed ?? localSeed(),
    });
    intro = progress.seen || world === null ? null : 0;
    wakeUntil = seconds + 6;
    progress = { ...progress, hero, seen: true };
    saveProgress();
    view = { ...view, newBest: false, phase: "running", toast: null };
    listEarned(earnedList, [], titles);
    setRunning(true);
    sound.sfx("start");
    sound.music(true);
  });

// Enter and the middle of the screen: start a day, or act once one is going. A locked hero cannot be woken.
function start(): void {
  if (loop.running()) choose({ type: "act" });
  else if (!startButton.disabled && !locked()) void begin();
}

function turn(by: number): void {
  if (loop.running()) return;
  hero = (hero + by + heroes.length) % heroes.length;
  view = { ...view, phase: "ready" };
  show();
}

const mode = (): Mode => {
  if (!loop.running()) return "waiting";
  return session?.state().talk == null ? "playing" : "asked";
};
const togglePause = (): void => void (loop.running() && pause.toggle());

async function connect(): Promise<void> {
  try {
    await client.ready();
    progress = restore(await client.progress.load());
    hero = progress.hero;
    view = { ...view, best: progress.best };
    sound.apply(progress.sound);
    play = await connectToPlatform(client);
    titles = new Map(
      (await client.milestones.list().catch(() => [])).map(({ id, title }) => [
        id,
        title,
      ]),
    );
    status.textContent =
      world === null
        ? "Connected. No 3D here, so the island is drawn flat."
        : "Connected.";
  } catch (error) {
    status.textContent =
      error instanceof GameHostError
        ? `The platform said: ${error.code}`
        : "Could not connect to the platform. You can still play.";
  }
  startButton.disabled = false;
  show();
}

attachControls(
  screen,
  {
    act: () => void (loop.running() ? choose({ type: "act" }) : undefined),
    lift: (by) => void choose({ by, type: "lift" }),
    move: (dir) => void choose({ dir, type: "move" }),
    no: () => void choose({ choice: 1, type: "pick" }),
    pause: togglePause,
    start,
    // A tap that comes straight after a day ends is not a wish for another.
    tapStart: () => {
      if (loop.running() || performance.now() - endedAt >= restartDelayMs)
        start();
    },
    turn,
  },
  mode,
);
// While an offer waits, the act button and Space say yes to it.
const yesOrAct = (): void =>
  void (mode() === "asked" ? choose({ choice: 0, type: "pick" }) : start());
actButton.addEventListener("click", () => void (loop.running() && yesOrAct()));
pauseButton.addEventListener("click", togglePause);
startButton.addEventListener("click", () => void begin());
setRunning(false);
// Between days nothing ticks, so the ring turns on the browser's own frames.
if (world !== null) {
  let last = 0;
  const idle = (time: number): void => {
    if (!loop.running()) {
      seconds = time / 1_000;
      show(Math.min(0.1, (time - last) / 1_000));
    }
    last = time;
    requestAnimationFrame(idle);
  };
  requestAnimationFrame(idle);
}
void connect();
