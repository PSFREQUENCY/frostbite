import { setUpSound } from "@frostbite/game-sdk/audio/setup";
import type { RunView } from "@frostbite/game-sdk/card";
import { cardFor } from "@frostbite/game-sdk/card";
import { createGameClient } from "@frostbite/game-sdk/client";
import { createGuideLayer } from "@frostbite/game-sdk/guide-layer";
import { createPause, pauseCopy } from "@frostbite/game-sdk/pause";
import { type PlatformPlay, sendRun } from "@frostbite/game-sdk/play";
import { createRunLoop } from "@frostbite/game-sdk/run-loop";
import { restartDelayMs } from "@frostbite/game-sdk/touch-start";

import { effects, track } from "./audio.ts";
import { guideFor, titleGuide } from "./guide.ts";
import { createBag } from "./page/bag.ts";
import { attachControls, type Mode } from "./page/controls.ts";
import { element, everyFrame } from "./page/elements.ts";
import { handsFor, wireButtons } from "./page/hands.ts";
import { createClips } from "./page/clips.ts";
import { join } from "./page/connect.ts";
import { createCredits } from "./page/credits.ts";
import { createPick } from "./page/pick.ts";
import { listEarned, noteFor } from "./page/hud.ts";
import { createPanel } from "./page/panel.ts";
import {
  afterDay,
  choosing,
  freshProgress,
  nextRun,
  type Progress,
} from "./progress.ts";
import { ticksPerSecond } from "./rules/constants.ts";
import { heroes } from "./rules/heroes.ts";
import { drawScreen } from "./screen/flat.ts";
import { resultOf } from "./screen/result.ts";
import { wakeLine } from "./script/cast.ts";
import { createRunSession, type Choice, type RunSession } from "./session.ts";
import { worldOn } from "./view/world-view.ts";

// The page of the game: it draws, it plays, and it asks the platform to remember. It saves nothing itself and asks nothing of the
// network. The rules, the session, the picture and the words are in their own modules; this only joins them to the page and the platform.
// The first screen is the title: one Enter or one tap starts a run, as every game on the platform must. The run opens on the cinematic
// (the first time the page plays), then, on a game's first day, the hero ring; the chosen hero wakes and the day runs. A game is played
// with that one hero, so later days wake them at once; once the story is won the ring is offered every day.
const client = createGameClient();
const status = element("status", "p");
const note = element("note", "p");
const screen = element("screen", "canvas");
const worldCanvas = element("world", "canvas");
const guideLayer = createGuideLayer(screen);
const earnedList = element("earned", "ul");
const panel = createPanel({
  answer: (choice) => hands.answer(choice),
  chime: (gain) => sound.sfx(gain ? "coinIn" : "coinOut"),
});
const bag = createBag();
const clips = createClips();
const wishText = element("wish-text", "input");
const startButton = element("start", "button");
const pauseButton = element("pause", "button");
const context = screen.getContext("2d");
const world = worldOn(worldCanvas);
const credits = createCredits(world !== null);
const pick = createPick(turn);

let play: PlatformPlay | null = null;
let progress: Progress = freshProgress;
let session: RunSession | null = null;
let view: RunView = { best: 0, newBest: false, phase: "ready", toast: null };
let runId: string | null = null;
let titles = new Map<string, string>();
let heldNote = "";
let hero = freshProgress.hero;
// The run's seed, kept from its start until a hero wakes; the clock, and until when the camera stays on the hands or the waking face.
let seed = 0;
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
// Whether the ring is up: a game's first day, every day once the story is won, or a saved hero that cannot be played.
const ringUp = (): boolean => choosing(progress) || locked();

function show(dt = 0): void {
  const day = session?.state() ?? null;
  // A run started and waiting for its hero: the cinematic, then the ring. Until a hero wakes, a phone shows only the way to play.
  const waking = loop.running() && session === null;
  document.body.dataset.awake = session === null ? "no" : "yes";
  panel.render(view.phase === "running" ? day : null, progress.best);
  bag.render(view.phase === "running" ? day : null);
  if (view.phase === "running" && day !== null) {
    world?.day(day, seconds, dt, seconds < closeUntil, clips.current());
    if (!pause.paused())
      note.textContent =
        seconds < wakeUntil
          ? wakeLine(day.hero, day.loop, day.day, day.answered)
          : noteFor(day);
  } else if (waking && credits.on())
    credits.frame(dt, (at) => world?.opening(at) ?? null);
  else if (waking) world?.turntable(hero, locked(), seconds, dt);
  else world?.opening(0.5);
  pick.show(
    waking && !credits.on() && ringUp() ? guideFor(hero, progress) : null,
  );
  if (context !== null)
    drawScreen(context, view.phase === "ready" ? null : day, world !== null);
  guideLayer.show(
    cardFor(view.phase, titleGuide, () =>
      day === null ? null : resultOf(day, view),
    ),
  );
}

function setRunning(running: boolean): void {
  document.body.dataset.running = running ? "yes" : "no";
  startButton.hidden = running;
  for (const button of moveButtons)
    button.disabled = !running && button.id !== "act";
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
    const dt = ticks / ticksPerSecond;
    seconds += dt;
    const running = session;
    if (running === null) {
      // A game's own hero wakes as soon as the cinematic is done.
      if (!credits.on() && !ringUp()) wake();
      show(dt);
      return true;
    }
    const before = running.state();
    if (clips.playing()) clips.step(dt);
    else
      for (let at = 0; at < ticks && !running.state().ended; at += 1)
        running.tick();
    clips.watch(before, running.state());
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

// A choice during a day; a spot used is a moment for the close-up.
function choose(choice: Choice): void {
  const running = session;
  // Before the hero wakes, acting is Enter's start (the cinematic skipped, or the hero woken).
  if (running === null) return void (choice.type === "act" && start());
  if (!loop.active()) return;
  // A clip playing: anything but a step skips it.
  if (clips.playing() && choice.type !== "move") return clips.skip();
  const before = running.state();
  const outcome = running.send(choice);
  clips.watch(before, running.state());
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
    seed = ready?.seed ?? localSeed();
    session = null;
    clips.reset();
    view = { ...view, newBest: false, phase: "running", toast: null };
    listEarned(earnedList, [], titles);
    setRunning(true);
    sound.sfx("start");
    sound.music(true);
  });

// The chosen hero wakes and the day begins; a locked hero cannot be woken.
function wake(): void {
  if (locked()) return sound.sfx("miss");
  session = createRunSession({
    ...nextRun(progress),
    hero,
    onEarned: (id) => {
      sound.sfx("milestone");
      play?.report(id);
    },
    seed,
  });
  wakeUntil = seconds + 6;
  progress = { ...progress, hero, seen: true };
  saveProgress();
  sound.sfx("start");
}

// Enter and the middle of the screen: start a run; then skip the cinematic, wake the hero on the ring, or act once the day is going.
function start(): void {
  if (!loop.running()) return void (startButton.disabled || begin());
  if (session !== null) return choose({ type: "act" });
  if (credits.on()) credits.stop();
  else wake();
}

// Left and right on the ring (which also ends the cinematic).
function turn(by: number): void {
  if (!loop.running() || session !== null) return;
  if (!credits.on() && ringUp())
    hero = (hero + by + heroes.length) % heroes.length;
  credits.stop();
  show();
}

const mode = (): Mode => {
  if (!loop.running() || session === null) return "waiting";
  return session?.state().talk == null ? "playing" : "asked";
};

async function connect(): Promise<void> {
  const joined = await join(client, world !== null);
  ({ play, progress, titles } = joined);
  hero = progress.hero;
  view = { ...view, best: progress.best };
  sound.apply(progress.sound);
  status.textContent = joined.status;
  startButton.disabled = false;
  show();
}

// The hands, the keys and fingers that move them, and the buttons under the screen.
const hands = handsFor({
  answers: (day) => panel.answers(day),
  bag: () => bag.toggle(),
  choose,
  day: () => session?.state() ?? null,
  jump: () => world?.jump(),
  pause: () => void (loop.running() && pause.toggle()),
  running: () => loop.running(),
  start,
  // A tap that comes straight after a day ends is not a wish for another.
  tapStart: () => {
    if (loop.running() || performance.now() - endedAt >= restartDelayMs)
      start();
  },
  turn,
  wish: (text) => world?.write(text),
  wishText: () => wishText.value,
  yaw: () => world?.yaw() ?? -Math.PI / 2,
});
attachControls(screen, hands, mode);
const moveButtons = wireButtons(hands);
startButton.addEventListener("click", () => void begin());
setRunning(false);
// Between days nothing ticks, so the ring turns on the browser's own frames.
if (world !== null)
  everyFrame((time, dt) => {
    if (loop.running()) return;
    seconds = time;
    show(dt);
  });
void connect();
