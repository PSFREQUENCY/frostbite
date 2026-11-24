// The words of day two's concert and The Long Game (`rules/concert.ts`), in the order of the rules' answers. The headliner is Lux, a
// singer of the game's own. `{hint}` is filled once her show has taught the dance. Each line is written once. A draft for the owner.
export const concertTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  flyers: {
    answers: ["Take a flyer", "No thanks"],
    say: "A crew slaps posters on every wall: LUX, LIVE TONIGHT AT THE FLOE AMPHITHEATER. 'Take one, it is your pass at the gate.'",
  },
  gate: {
    answers: ["Walk through the detectors", "Not now"],
    say: "The stadium gate: turnstiles, guards in yellow and a row of metal detectors. Keys, phone and coins in the tray, flyer out, then walk through.",
  },
  "omi-omy": {
    answers: ["Buy a spirit625: 25 DUN", "Just looking"],
    say: "Omi Omy, ADOR's drinks bar, glows pink. The bartender taps a bottle: spirit625, the city's favourite alcohol-free fizz.",
  },
  "stage-door": {
    answers: ["On it"],
    say: "The manager, headset on: 'No spirit625, no show. Lux will not sing without one, and the crowd is already in. Omi Omy, in ADOR. Go!'",
  },
  "stage-drink": {
    answers: ["Hand Lux the spirit625", "Not yet"],
    say: "The manager sees the bottle and nearly hugs you. 'Get it to her, she is on in one minute!'",
  },
  "stage-after": {
    answers: ["See you there"],
    say: "The manager, grinning: 'Best show of the year. Lux says she owes you a dance lesson: try The Long Game.'",
  },
  "partner-0": {
    answers: ["Step left with her", "Spin away", "Freeze"],
    say: "Miss Mirinda takes your hand on the light-up floor. 'Impress me. On the one,' she says, stepping left.{hint}",
  },
  "partner-1": {
    answers: ["Step left again", "Spin under her arm", "Stand still"],
    say: "The beat drops and her hand turns in yours.",
  },
  "partner-2": {
    answers: ["Keep spinning", "Step back", "Hit the freeze with her"],
    say: "Last count. The whole studio holds its breath.",
  },
  "partner-again": {
    answers: ["From the top", "Later"],
    say: "Miss Mirinda laughs, kindly. 'Again, from the top. Watch how Lux moves, if you can.'",
  },
  "partner-done": {
    answers: ["Thank you"],
    say: "Miss Mirinda: 'Now that is the long game. Come and dance any time.'",
  },
};
// What Lux's show taught, said on the dance floor once it has been seen.
export const danceHint = " (Lux's show taught you: step, spin, freeze.)";
