import { stages } from "../../src/rules/course.ts";
import { quizOf, quizRight } from "../../src/rules/dash.ts";
import { createBot } from "./bot.ts";

type Bot = ReturnType<typeof createBot>;

// A gate's line, and a step into a gate's reach at a gait of its own: the gait is held for a tick, then the bot runs on.
const gateOf = (index: number) => {
  const stage = stages[index];
  if (stage === undefined) throw new Error("no such gate");
  return stage;
};
function stepIn(bot: Bot, gait: number): void {
  bot.gait(gait);
  bot.wait(1);
  bot.gait(1);
}

// The Degen Dash, run the quick way from Zuri's arch: a ticket bought, then every gate on the shortest streets, running between them, the
// right gait (or climb, or look) at each, the Dash car from the sixth to the desk (with `dawdle` ticks spent there), the right answer
// (after `wrong` wrong ones) and back to the arch.
export function runDash(bot: Bot, wrong = 0, dawdle = 0): Bot {
  bot.use("dash");
  // Off a ride first (the Dash car, after a run before), then Zuri's ticket.
  if (bot.here().talk === null && bot.here().dash === 0) bot.act();
  if (bot.here().talk === "zuri") {
    bot.pick(0);
    bot.act();
  }
  if (bot.here().gait !== 1) bot.gait(1);
  const run = gateOf(0);
  bot.leg("x", run.x);
  const duck = gateOf(1);
  bot.leg("x", duck.x);
  bot.leg("z", duck.z + 300);
  stepIn(bot, 2);
  const crawl = gateOf(2);
  bot.leg("z", crawl.z + 300);
  stepIn(bot, 3);
  const wall = gateOf(3);
  bot.leg("z", wall.z);
  bot.leg("x", wall.x);
  for (let storey = 0; storey < 3; storey += 1) bot.lift(1);
  bot.wait(1);
  bot.lift(1);
  const roof = gateOf(4);
  bot.leg("x", roof.x);
  for (let storey = 0; storey < 4; storey += 1) bot.lift(-1);
  const look = gateOf(5);
  bot.leg("z", look.z);
  bot.leg("x", look.x - 300);
  bot.look();
  bot.wait(1);
  bot.look();
  bot.use("ride-dash");
  const car = gateOf(6);
  bot.leg("x", car.x);
  bot.leg("z", car.z);
  const desk = gateOf(7);
  bot.leg("z", desk.z);
  bot.leg("x", desk.x);
  bot.wait(dawdle);
  bot.act();
  const quiz = quizOf(bot.here());
  const right = quizRight[quiz] ?? 0;
  for (let miss = 0; miss < wrong; miss += 1) bot.pick((right + 1) % 3);
  bot.pick(right);
  const arch = gateOf(8);
  bot.leg("x", arch.x);
  bot.wait(1);
  bot.pick(0);
  return bot;
}

// A Degen Dash on the second day: run the quick way, or (`slow`) with three wrong answers and a long wait at the desk, which finishes
// over par for a medal.
export function dashDay(slow = false): Bot {
  const bot = createBot(3, 4, 2);
  bot.skipTo(300);
  return slow ? runDash(bot, 3, 1_500) : runDash(bot);
}
