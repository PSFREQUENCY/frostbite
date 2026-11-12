import {
  echoTicks,
  stormStart,
  stormTicks,
} from "../../src/rules/constants.ts";
import { echoAt, statue } from "../../src/rules/machine.ts";
import { createBot } from "./bot.ts";

// A day that reaches the top (both tools, and the Swap Meet through the Great Airdrop), then walks up to the risen statue.
export function machineDay() {
  const bot = createBot(5, 0, 3);
  bot.use("tool-magnet");
  bot.use("tool-vacuum");
  bot.go(32_500, 18_000);
  bot.skipTo(stormStart + stormTicks);
  bot.go(statue.x, statue.z);
  bot.act();
  return bot;
}

// A trip back that meets the newbie at all three places: a tip or a walk past at home, a walk past the Faucet line, a warning at the scam.
export function tripDay(seed = 1, hero = 7, tip = false) {
  const bot = createBot(seed, hero, 1, 1);
  const meet = (yes: boolean): void => {
    const echo = echoAt(bot.here());
    if (echo === null) throw new Error("nobody to meet");
    bot.go(echo.x, echo.z);
    bot.act();
    bot.pick(yes);
  };
  meet(tip);
  bot.skipTo(echoTicks);
  meet(false);
  bot.skipTo(2 * echoTicks);
  meet(true);
  return bot;
}
