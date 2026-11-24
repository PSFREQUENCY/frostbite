import { canClimb, clinging, onTheRoof, roofLevel } from "../rules/climb.ts";
import { onLetterTop } from "../rules/mountain.ts";
import { rankOf } from "../rules/heat.ts";
import { flies, type DayState } from "../rules/types.ts";
import { ticksPerSecond } from "../rules/constants.ts";
import { statusOf } from "../rules/status.ts";
import { powerLevel, powerOf, powerReady } from "../rules/powers.ts";
import { powerNames } from "../script/powers.ts";
import { element } from "./elements.ts";
import { starsText } from "./hud.ts";
import { createMeters } from "./meters.ts";
import { createReceipts } from "./receipts.ts";
import { createToasts } from "./toasts.ts";
import { goalFor, rankNames, talkOf, weatherNames } from "./words.ts";

// Everything beside the picture that follows the day: the readouts, Pip's line, a cheer for each quest done, the talk with its answer buttons, frost vision's button
// with the seconds left, the freeze ray's trigger and count, and the climb and drop buttons, live in a helicopter and beside or up a
// building's wall or a WAGMI letter.
export function createPanel(hands: {
  readonly answer: (choice: number) => void;
  // A chime as money comes in or goes out.
  readonly chime?: (gain: boolean) => void;
}) {
  const outs = {
    best: element("best", "strong"),
    fomo: element("fomo", "strong"),
    heat: element("heat", "strong"),
    mood: element("mood", "strong"),
    weather: element("weather", "strong"),
    rank: element("rank", "strong"),
    score: element("score", "strong"),
  };
  const goal = element("goal", "p");
  const box = element("talk", "div");
  const say = element("say", "p");
  const answers = element("answers", "ol");
  const wish = element("wish-text", "input");
  const look = element("look", "button");
  const ray = element("ray", "button");
  const power = element("power", "button");
  const frozen = element("frozen", "strong");
  const frozenPill = frozen.closest("span") ?? frozen;
  const up = element("up", "button");
  const down = element("down", "button");
  let shown = "";
  let placed = "-";
  const toasts = createToasts(element("toast", "aside"));
  const meters = createMeters(element("meters", "div"));
  const receipts = createReceipts(
    outs.score.closest("p") ?? outs.score,
    element("receipt", "aside"),
    (gain) => hands.chime?.(gain),
  );

  return {
    // How many answers the waiting talk has (two for a yes or no).
    answers: (day: DayState): number => talkOf(day)?.answers.length ?? 2,
    render(day: DayState | null, best: number): void {
      outs.best.textContent = String(best);
      outs.score.textContent = String(day?.pocket ?? 0);
      outs.heat.textContent = starsText(day?.heat ?? 0);
      outs.mood.textContent = day === null ? "GM" : statusOf(day);
      outs.rank.textContent = rankNames[day === null ? 0 : rankOf(day)] ?? "";
      outs.fomo.textContent = String(day?.fomo ?? 0);
      outs.weather.textContent = weatherNames[day?.weather ?? "clear"];
      receipts.show(day, performance.now());
      toasts.show(day, performance.now());
      meters.render(day);
      goal.textContent = day === null ? "" : goalFor(day);
      const left = Math.ceil((day?.vision ?? 0) / ticksPerSecond);
      look.disabled = day === null || (left === 0 && !day.looking);
      look.textContent = `${day?.looking === true ? "Vision on" : "Frost vision"}, ${String(left)}s`;
      look.dataset.left = String(left);
      // The freeze ray: its trigger while a statue come to life holds it, and how many it holds frozen now (`rules/freeze.ts`).
      ray.hidden = day === null || !day.gun || day.form < 0;
      // The hero's power, its level, and whether it is still cooling.
      if (day !== null)
        power.textContent = `${powerNames[powerOf(day.hero)]} ${String(powerLevel(day))}${powerReady(day) ? "" : " (cooling)"}`;
      frozen.textContent = String(day?.frozen.length ?? 0);
      frozenPill.hidden = day === null || (!day.gun && day.frozen.length === 0);
      // Sitting on a WAGMI letter, the picture is cleared for a screenshot (`badges.css`).
      document.body.dataset.vista =
        day !== null && day.level === roofLevel && onLetterTop(day.x, day.z)
          ? "yes"
          : "no";
      // Climb and drop: always in a helicopter; on foot, up a wall or beside one, as far as the storeys go (looked at only as the hero
      // moves, since finding a wall takes a few dozen looks round).
      const where =
        day === null
          ? ""
          : `${day.ride} ${String(day.x)} ${String(day.z)} ${String(day.level)} ${String(day.talk)}`;
      if (where !== placed) {
        placed = where;
        const flying = day !== null && flies(day.ride);
        up.disabled = !flying && (day === null || !canClimb(day));
        down.disabled =
          !flying && (day === null || !(clinging(day) || onTheRoof(day)));
      }
      const talk = day === null ? null : talkOf(day);
      box.hidden = talk === null;
      wish.hidden = day?.talk !== "lantern";
      const key = talk === null ? "" : `${talk.say}|${talk.answers.join("|")}`;
      if (key === shown) return;
      shown = key;
      say.textContent = talk?.say ?? "";
      answers.replaceChildren(
        ...(talk?.answers ?? []).map((text, index) => {
          const item = answers.ownerDocument.createElement("li");
          const button = answers.ownerDocument.createElement("button");
          button.type = "button";
          button.dataset.answer = String(index);
          button.textContent = `${String(index + 1)}. ${text}`;
          button.addEventListener("click", () => hands.answer(index));
          item.append(button);
          return item;
        }),
      );
    },
  };
}
