import type { DayState } from "../rules/types.ts";

// Money on the move: every change in the pocket floats up beside the DUN readout (green coming in, red going out) and prints a digital
// receipt with the new balance, the block (the day's tick) and a transaction id, with a chime up or a drop down. Changes close together
// (a drain, a run of buys) add up on one receipt rather than stacking.
export interface Receipts {
  show(day: DayState | null, now: number): void;
}

const burst = 600;
const shown = 2600;
const coins = (amount: number): string =>
  `${amount > 0 ? "+" : "−"}${Math.abs(amount).toLocaleString("en-US")} DUN`;
const txOf = (day: DayState): string =>
  `0x${((Math.imul(day.tick + 1, 0x9e_37_79_b1) ^ day.pocket) >>> 0)
    .toString(16)
    .padStart(8, "0")}`;

export function createReceipts(
  bar: HTMLElement,
  card: HTMLElement,
  chime: (gain: boolean) => void,
): Receipts {
  let last: { readonly pocket: number; readonly tick: number } | null = null;
  let total = 0;
  let since = -Infinity;
  let pop: HTMLElement | null = null;
  const write = (day: DayState): void => {
    card.replaceChildren(
      ...[
        ["DIGITAL RECEIPT", "head"],
        [
          `${total > 0 ? "RECEIVED" : "PAID"} ${coins(total)}`,
          total > 0 ? "gain" : "loss",
        ],
        [`BALANCE ${day.pocket.toLocaleString("en-US")} DUN`, ""],
        [`BLOCK ${String(day.tick)} · TX ${txOf(day)}`, "small"],
      ].map(([text = "", kind = ""]) => {
        const line = document.createElement("p");
        line.textContent = text;
        if (kind !== "") line.className = kind;
        return line;
      }),
    );
  };
  return {
    show(day, now) {
      card.hidden = now - since > shown;
      if (day === null || last === null || day.tick < last.tick) {
        last = day === null ? null : { pocket: day.pocket, tick: day.tick };
        return;
      }
      const change = day.pocket - last.pocket;
      last = { pocket: day.pocket, tick: day.tick };
      if (change === 0) return;
      const fresh =
        now - since > burst || Math.sign(total) !== Math.sign(change);
      total = fresh ? change : total + change;
      if (fresh || pop === null) {
        chime(change > 0);
        pop = document.createElement("span");
        bar.append(pop);
        const leaving = pop;
        setTimeout(() => leaving.remove(), 1500);
      }
      pop.className = `coin-pop ${total > 0 ? "gain" : "loss"}`;
      pop.textContent = coins(total);
      since = now;
      card.hidden = false;
      write(day);
    },
  };
}
