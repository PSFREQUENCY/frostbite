import { rankOf } from "../rules/heat.ts";
import type { DayState } from "../rules/types.ts";
import { ticksPerSecond } from "../rules/constants.ts";
import { statusOf } from "../rules/status.ts";
import { element } from "./elements.ts";
import { starsText } from "./hud.ts";
import { goalFor, rankNames, talkOf } from "./words.ts";

// Everything beside the picture that follows the day: the readouts, Pip's line, the talk with its answer buttons, frost vision's button
// with the seconds left, and the helicopter's climb and drop, shown only in a helicopter.
export function createPanel(hands: {
  readonly answer: (choice: number) => void;
}) {
  const outs = {
    best: element("best", "strong"),
    fomo: element("fomo", "strong"),
    heat: element("heat", "strong"),
    mood: element("mood", "strong"),
    rank: element("rank", "strong"),
    score: element("score", "strong"),
  };
  const goal = element("goal", "p");
  const box = element("talk", "div");
  const say = element("say", "p");
  const answers = element("answers", "ol");
  const look = element("look", "button");
  const up = element("up", "button");
  const down = element("down", "button");
  let shown = "";

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
      goal.textContent = day === null ? "" : goalFor(day);
      const left = Math.ceil((day?.vision ?? 0) / ticksPerSecond);
      look.disabled = day === null || (left === 0 && !day.looking);
      look.textContent = `${day?.looking === true ? "Vision on" : "Frost vision"}, ${String(left)}s`;
      up.hidden = day?.ride !== "heli";
      down.hidden = up.hidden;
      const talk = day === null ? null : talkOf(day);
      box.hidden = talk === null;
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
