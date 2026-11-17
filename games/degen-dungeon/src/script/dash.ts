import type { Trial } from "../rules/course.ts";

// The Degen Dash's words (`rules/dash.ts`): Zuri's ticket, her desk's questions (in the order of the rules' answers, the right one where
// `quizRight` says), what the clock says at the end, and Pip's line for each stage. Each line is written once. A draft for the owner.
export const dashTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  zuri: {
    answers: ["Buy a ticket, 250", "Not today"],
    say: "Zuri, host of the Degen Dash, fans out gold tickets: nine stages round the Exchange, one clock. Beat par clean for 50,000 DUN, a trophy and a parade.",
  },
  "quiz-0": {
    answers: ["A scam: walk away", "A lucky break", "A message from S"],
    say: "Zuri, at her desk: a stranger offers to double any DUN you send them first. What is it?",
  },
  "quiz-1": {
    answers: ["Support, if they ask nicely", "Nobody but you", "Your crew"],
    say: "Zuri, at her desk: who should ever see your seed words?",
  },
  "quiz-2": {
    answers: [
      "All in, right now",
      "Borrow and buy more",
      "Check it twice, then once more",
    ],
    say: "Zuri, at her desk: a coin is up forty percent in an hour and the whole street is shouting. Your move?",
  },
  "quiz-3": {
    answers: [
      "Written down, offline, somewhere safe",
      "A photo on your phone",
      "A window paying twenty percent a day",
    ],
    say: "Zuri, at her desk: where do your keys live safest?",
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
    say: "Six minutes gone: the course closes behind you. Zuri has more tickets.",
  },
};

// Pip's line for each stage of a run, and for the car stage once the hero is behind a wheel.
export const trialLines: Readonly<Record<Trial, string>> = {
  car: "Take the Dash car by the north street and drive through the checkpoint on the east street.",
  crawl: "Crawl under the net, further north.",
  duck: "Duck under the low bar on the west street: crouch through.",
  finish: "Back to the arch: finish it!",
  look: "Down to the street, then find the hidden mark with frost vision.",
  quiz: "Answer Zuri's question at her desk on the avenue.",
  roof: "Up onto the roof and along it to the flag.",
  run: "Sprint west down the avenue through the first gate: running only.",
  wall: "Climb the wall on the north street to the top storey.",
};
export const drivingLine = "Drive through the checkpoint on the east street.";

// What the backpack says about the Dash, and the cheers over the picture.
export const dashPack = {
  medal: "A finisher's medal",
  print: "A champion's print, signed by Zuri",
  ticket: "A Degen Dash ticket: act at Zuri's arch to start the clock",
  trophy: "The Degen Dash trophy",
} as const;
export const dashCheers = {
  champion: "50,000 DUN, the trophy, a champion's print, and a parade.",
  finished: "A finisher's medal. Par and no heat wins it.",
  go: "The clock is running: first gate, west down the avenue.",
  ticket: "Act at Zuri's arch, north of Ticker Square, to start.",
} as const;
