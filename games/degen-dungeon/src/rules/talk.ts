import { heatPerStar } from "./constants.ts";
import { counter, counters, games, lunar, play } from "./counters.ts";
import { cooled, rankOf } from "./heat.ts";
import { buy, sell } from "./market.ts";
import type { Draft } from "./types.ts";

// Conversations with more than a yes or a no: home and the hideout under it, the seed paper, Frost's speech, the Exchange floor, the
// MAXX window and the shops. Each node is a list of answers (the words are in `script/lines.ts`, in the same order); an answer goes to
// another node, does a deed, or with neither walks away. The last answer of every node that can be left is walking away, so the page's
// "no" is always the last answer.
interface Answer {
  readonly does?: string;
  readonly to?: string;
}
const leave: Answer = {};
// A deed that keeps the same node open, so a shop or the floor can be used again without walking off.
const stay = (node: string, ...deeds: readonly string[]): Answer[] => [
  ...deeds.map((does) => ({ does, to: node })),
  leave,
];
export const nodes: Readonly<Record<string, readonly Answer[]>> = {
  chart: stay("chart", "buy", "sell", "all-in"),
  fits: stay("fits", "fit-gloves", "fit-shades", "fit-parka"),
  frost: [{ does: "report" }, { does: "ask" }, leave],
  garage: stay("garage", "tune", "paint"),
  hideout: [
    { does: "stash", to: "hideout" },
    { does: "terminal", to: "hideout" },
    { to: "lying" },
    leave,
  ],
  home: [{ does: "sleep" }, { to: "hideout" }, leave],
  lying: [{ to: "hideout" }],
  maxx: stay("maxx", "deposit", "withdraw"),
  paper: [
    { does: "paper-1" },
    { does: "paper-2" },
    { does: "paper-3" },
    { does: "paper-4" },
  ],
  realtor: stay("realtor", "home-studio", "home-rowhouse", "home-yard"),
  lantern: [
    { does: "wish-1" },
    { does: "wish-2" },
    { does: "wish-3" },
    { does: "wish-4" },
    leave,
  ],
  ...Object.fromEntries(
    Object.keys(counters).map((kind) => [
      `shop-${kind}`,
      kind === "arcade"
        ? [
            ...Object.keys(games).map((game) => ({
              does: `play-${game}`,
              to: "shop-arcade",
            })),
            leave,
          ]
        : [{ does: `buy-${kind}`, to: `shop-${kind}` }, leave],
    ]),
  ),
  colony: [{ does: "colony" }, leave],
  crater: [{ does: "rock" }, leave],
  "moon-pad": [{ does: "land" }, leave],
  shuttle: [{ does: "fly" }, leave],
  speech: [{ to: "speech-2" }],
  "speech-2": [{ to: "speech-3" }],
  "speech-3": [{ does: "heard" }],
};

// Under the city: the hero is off the street while either of these is open.
export const below = (talk: string | null): boolean =>
  talk === "hideout" || talk === "lying";

// What each thing for sale costs, and the rank it needs. A star of heat or more puts every price up a fifth.
export const prices: Readonly<
  Record<string, readonly [cost: number, rank: number]>
> = {
  "fit-gloves": [300, 0],
  "fit-parka": [400, 0],
  "fit-shades": [200, 0],
  "home-rowhouse": [6_000, 3],
  "home-studio": [2_000, 2],
  "home-yard": [20_000, 4],
  paint: [200, 0],
  tune: [500, 1],
};
export const priceOf = (
  day: Pick<Draft, "heat">,
  item: string,
): number | null => {
  const cost = prices[item]?.[0];
  if (cost === undefined) return null;
  return day.heat >= heatPerStar ? Math.floor((cost * 6) / 5) : cost;
};
// At four stars the phone wallet locks, and nothing can be bought or traded.
export const locked = (day: Pick<Draft, "heat">): boolean =>
  day.heat >= 4 * heatPerStar;

function shop(day: Draft, item: string): string | null {
  const cost = priceOf(day, item);
  const rank = prices[item]?.[1] ?? 0;
  if (cost === null) return "nothing like that for sale";
  if (day.done.includes(item)) return "you have that already";
  if (rankOf(day) < rank) return "that needs a higher rank";
  if (day.pocket < cost) return "not enough DUN";
  day.pocket -= cost;
  day.done = [...day.done, item];
  if (item === "paint") cooled(day, heatPerStar);
  return null;
}

// The freezer, at the hideout or in The Shaft: the whole pocket into cold storage.
export function stash(day: Draft): string | null {
  if (day.pocket === 0) return "nothing to stash";
  day.freezer += day.pocket;
  day.pocket = 0;
  if (!day.done.includes("stash")) day.done = [...day.done, "stash"];
  return null;
}

function maxx(day: Draft, deposit: boolean): string | null {
  if (deposit) {
    if (day.day !== 2) return "MAXX takes no deposits today";
    if (day.pocket === 0) return "nothing to deposit";
    day.maxx += day.pocket;
    day.pocket = 0;
    return null;
  }
  if (day.day !== 2) return "withdrawals are paused for maintenance";
  if (day.maxx === 0) return "nothing to withdraw";
  day.pocket += day.maxx;
  day.maxx = 0;
  return null;
}

// The hideout terminal: it stops a drain (and says whether anything was saved), shows the freezer after the morning of the drain, and
// revokes any permission slip.
function terminal(day: Draft): string | null {
  if (day.drain === 0 && !day.fake) return "the terminal shows all is well";
  if (day.drain > 0 && day.pocket > 0) day.saved = true;
  day.drain = 0;
  day.fake = false;
  return null;
}

function deed(day: Draft, name: string): string | null {
  if (name.startsWith("paper-")) {
    day.paper = Number(name.slice(6));
    day.paperAt = day.tick;
    day.done = [...day.done, "paper"];
    return null;
  }
  if (name in prices)
    return locked(day) ? "your wallet is locked" : shop(day, name);
  if (name.startsWith("buy-")) return counter(day, name.slice(4));
  if (name.startsWith("play-")) return play(day, name.slice(5));
  if (name === "fly" || name === "land" || name === "rock" || name === "colony")
    return lunar(day, name);
  if (name.startsWith("wish-")) {
    if (day.done.includes("lantern")) return "your lantern is already up";
    day.wish = Number(name.slice(5));
    day.done = [...day.done, "lantern"];
    return null;
  }
  switch (name) {
    case "all-in":
    case "buy":
      return locked(day)
        ? "your wallet is locked"
        : buy(day, name === "all-in");
    case "sell":
      return locked(day) ? "your wallet is locked" : sell(day);
    case "deposit":
    case "withdraw":
      return locked(day)
        ? "your wallet is locked"
        : maxx(day, name === "deposit");
    case "heard":
      day.done = [...day.done, "speech"];
      return null;
    case "report":
      if (day.spotted <= day.warned) return "no scam spotted to report";
      day.warned += 1;
      return null;
    case "sleep":
      day.cause = "home";
      day.ended = true;
      day.dir = -1;
      return null;
    case "stash":
      return stash(day);
    case "terminal":
      return terminal(day);
    default:
      return null;
  }
}

// An answer to the node that is waiting: undefined when no node is.
export function pickNode(
  day: Draft,
  choice: number,
): string | null | undefined {
  const answers = day.talk === null ? undefined : nodes[day.talk];
  if (answers === undefined) return undefined;
  const answer = answers[choice];
  if (answer === undefined) return "no such answer";
  const reason = answer.does === undefined ? null : deed(day, answer.does);
  if (reason !== null) return reason;
  day.talk = day.ended ? null : (answer.to ?? null);
  return null;
}
