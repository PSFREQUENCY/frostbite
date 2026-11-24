import { markOf, type Emblem } from "./emblems.ts";

// Badges as the player sees them: the tray in the picture's top corner, with how many of the game's badges are collected, and the reveal
// when one is earned. A medallion lands big in the middle of the picture, struck in its metal with its emblem, and spins in 3D, a glint
// sweeping across it and glitter twinkling, while light flares behind it and confetti bursts; the badge's name shows under it. Then it
// shrinks and flies up into the tray, which bumps and counts it. Badges earned together are revealed one after another. The words are
// page elements, so they stay sharp; a browser asked for less motion shows the medallion and the words without the movement
// (`badges.css`). It reads nothing of the day.
export const revealMs = 3_300;
export const flyMs = 2_500;
const bits = 64;
const glints = 14;
const colours = [
  "#ffd166",
  "#38e8ff",
  "#ff5d9e",
  "#56f5a6",
  "#c9b6ff",
  "#ffffff",
] as const;

export interface Badges {
  // The badges already collected (as the platform lists them), counted in the tray.
  collect(ids: Iterable<string>): void;
  // A badge earned just now, by its id and title.
  earn(id: string, title: string): void;
}

export function createBadges(stage: HTMLElement, total: number): Badges {
  const page = stage.ownerDocument;
  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    name: string,
    text = "",
  ): HTMLElementTagNameMap[K] => {
    const made = page.createElement(tag);
    made.className = name;
    made.textContent = text;
    return made;
  };
  const vary = (element: HTMLElement, values: Record<string, string>): void => {
    for (const [name, value] of Object.entries(values))
      element.style.setProperty(`--${name}`, value);
  };
  const tray = make("p", "badges");
  tray.id = "badges";
  tray.setAttribute("aria-label", "Badges collected");
  const count = make("strong", "badges-count", "0");
  tray.append(
    make("span", "badges-coin"),
    count,
    make("span", "badges-of", `/${String(total)}`),
  );
  stage.append(tray);
  const collected = new Set<string>();
  // Badges waiting their turn: the id, the title, whether it is new, and how many are collected with it.
  const waiting: (readonly [string, string, boolean, number])[] = [];
  let busy = false;

  const picture = ({ d, stroke = false }: Emblem): SVGSVGElement => {
    const space = "http://www.w3.org/2000/svg";
    const svg = page.createElementNS(space, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    const path = page.createElementNS(space, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", stroke ? "none" : "currentColor");
    path.setAttribute("fill-rule", "evenodd");
    if (stroke) {
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "8");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    }
    svg.append(path);
    return svg;
  };
  // The medallion: a stack of rims for its edge, a struck face front and back, a glint and glitter on the front.
  const medal = (id: string): HTMLElement => {
    const [emblem, metal] = markOf(id);
    const coin = make("div", `medal medal-${metal}`);
    for (let layer = 1; layer <= 8; layer += 1) {
      const rim = make("span", "medal-rim");
      vary(rim, { layer: String(layer) });
      coin.append(rim);
    }
    const front = make("span", "medal-face medal-front");
    const back = make("span", "medal-face medal-back");
    front.append(picture(emblem), make("span", "medal-shine"));
    back.append(picture(emblem));
    for (let glint = 0; glint < glints; glint += 1) {
      const spark = make("b", "medal-glint");
      const angle = Math.random() * Math.PI * 2;
      const out = 12 + Math.random() * 30;
      vary(spark, {
        delay: `${(Math.random() * 1.4).toFixed(2)}s`,
        x: `${(46 + Math.cos(angle) * out).toFixed(1)}%`,
        y: `${(46 + Math.sin(angle) * out).toFixed(1)}%`,
      });
      front.append(spark);
    }
    coin.append(back, front);
    return coin;
  };
  const confetti = (): HTMLElement => {
    const burst = make("div", "reveal-burst");
    for (let bit = 0; bit < bits; bit += 1) {
      const piece = make("i", "confetto");
      const angle = Math.random() * Math.PI * 2;
      const reach = 16 + Math.random() * 30;
      vary(piece, {
        c: colours[bit % colours.length] ?? "#ffd166",
        delay: `${(Math.random() * 0.3).toFixed(2)}s`,
        dx: `${(Math.cos(angle) * reach).toFixed(1)}cqi`,
        dy: `${(Math.sin(angle) * reach * 0.7 - 8).toFixed(1)}cqi`,
        spin: `${String(Math.round(Math.random() * 1_080 - 540))}deg`,
      });
      burst.append(piece);
    }
    return burst;
  };
  const next = (): void => {
    const up = waiting.shift();
    if (up === undefined) return;
    busy = true;
    const [id, title, fresh, number] = up;
    const shown = make("div", "reveal");
    shown.setAttribute("role", "status");
    const centre = make("div", "reveal-centre");
    const coin = medal(id);
    centre.append(
      make("span", "reveal-rays"),
      make("span", "reveal-flash"),
      confetti(),
      coin,
    );
    shown.append(
      centre,
      make("p", "reveal-kicker", fresh ? "New badge" : "Badge earned"),
      make("p", "reveal-title", title),
      make(
        "p",
        "reveal-count",
        `${String(number)} of ${String(total)} collected`,
      ),
    );
    stage.append(shown);
    setTimeout(() => {
      // Off to the tray in the corner: the way there from the medallion's middle.
      const from = coin.getBoundingClientRect();
      const to = tray.getBoundingClientRect();
      vary(shown, {
        "fly-x": `${String(Math.round(to.left + to.width / 2 - from.left - from.width / 2))}px`,
        "fly-y": `${String(Math.round(to.top + to.height / 2 - from.top - from.height / 2))}px`,
      });
      shown.classList.add("fly");
    }, flyMs);
    setTimeout(() => {
      shown.remove();
      count.textContent = String(number);
      tray.classList.add("bump");
      setTimeout(() => tray.classList.remove("bump"), 700);
      busy = false;
      next();
    }, revealMs);
  };
  return {
    collect(ids) {
      for (const id of ids) collected.add(id);
      if (!busy) count.textContent = String(collected.size);
    },
    earn(id, title) {
      const fresh = !collected.has(id);
      collected.add(id);
      waiting.push([id, title, fresh, collected.size]);
      if (!busy) next();
    },
  };
}
