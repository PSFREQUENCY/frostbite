import type { Trial } from "../rules/course.ts";

// The Degen Dash's words (`rules/dash.ts`): Miss Mirinda's ticket, her desk's questions (in the order of the rules' answers, the right one
// where `quizRight` says), what the clock says at the end, and Pip's line for each stage. Each line is written once. A draft for the owner.
export const dashTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  zuri: {
    answers: ["Buy a ticket, 250", "Not today"],
    say: "Miss Mirinda, host of the Degen Dash, fans out gold tickets: nine stages round the Exchange, one clock. Beat par clean for 50,000 DUN, a trophy and a parade.",
  },
  "quiz-0": {
    answers: ["A scam: walk away", "A lucky break", "A message from S"],
    say: "Miss Mirinda, at her desk: a stranger offers to double any DUN you send them first. What is it?",
  },
  "quiz-1": {
    answers: ["Support, if they ask nicely", "Nobody but you", "Your crew"],
    say: "Miss Mirinda, at her desk: who should ever see your seed words?",
  },
  "quiz-2": {
    answers: [
      "All in, right now",
      "Borrow and buy more",
      "Check it twice, then once more",
    ],
    say: "Miss Mirinda, at her desk: a coin is up forty percent in an hour and the whole street is shouting. Your move?",
  },
  "quiz-3": {
    answers: [
      "Written down, offline, somewhere safe",
      "A photo on your phone",
      "A window paying twenty percent a day",
    ],
    say: "Miss Mirinda, at her desk: where do your keys live safest?",
  },
  "dash-won": {
    answers: ["Take a bow"],
    say: "{time}, under par and clean: Degen Dash champion! The trophy, a champion's print and the day's 50,000 DUN are yours. Here comes your parade.",
  },
  "dash-done": {
    answers: ["Next time"],
    say: "Over the line in {time}. A win needs par ({par}) and no heat: a finisher's medal for now, and 1,000 DUN the first time each day.",
  },
  "dash-out": {
    answers: ["Walk on"],
    say: "Six minutes gone: the course closes behind you. Miss Mirinda has more tickets.",
  },
};

// Pip's line for each stage of a run, and for the car stage once the hero is behind a wheel.
export const trialLines: Readonly<Record<Trial, string>> = {
  car: "Take the Dash car by the north street and drive through the checkpoint on the east street.",
  crawl: "Crawl under the net, further north.",
  duck: "Duck under the low bar on the west street: crouch through.",
  finish: "Back to the arch: finish it!",
  look: "Down to the street, then find the hidden mark with frost vision.",
  quiz: "Answer Miss Mirinda's question at her desk on the avenue.",
  roof: "Up onto the roof and along it to the flag.",
  run: "Sprint west down the avenue through the first gate: running only.",
  wall: "Climb the wall on the north street to the top storey.",
};
export const drivingLine = "Drive through the checkpoint on the east street.";

// What the backpack says about the Dash, and the cheers over the picture.
export const dashPack = {
  medal: "A finisher's medal",
  print: "A champion's print, signed by Miss Mirinda",
  ticket: "A Degen Dash ticket: act at Miss Mirinda's arch to start the clock",
  trophy: "The Degen Dash trophy",
} as const;
export const dashCheers = {
  champion: "50,000 DUN, the trophy, a champion's print, and a parade.",
  finished: "A finisher's medal. Par and no heat wins it.",
  go: "The clock is running: first gate, west down the avenue.",
  ticket: "Act at Miss Mirinda's arch, north of Ticker Square, to start.",
} as const;

// Who hands over a Degen Dash ticket for each top skill mastered (`rules/mastery.ts`), and what the cheer says.
export const masters: Readonly<Record<string, string>> = {
  based: "Frost's crew",
  "diamond-hands": "An old whale on the Exchange floor",
  grinder: "The courier desk",
  "road-trip": "A cabbie at the rank",
  "rooftop-runner": "A rooftop runner",
  "saved-the-rest": "The hideout's old keeper",
  "scam-spotted": "A scammer's last mark",
  "shook-the-tuxes": "A street racer who saw it",
  "storm-funnel": "The airdrop crew",
  "touching-grass": "The park keeper",
};
export const masteryLine = (giver: string): string =>
  `${giver} hands you a Degen Dash ticket: take it to Miss Mirinda at her arch, and the city lights the way.`;
