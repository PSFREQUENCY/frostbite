// The words for each hero's story, beat by beat, in the order of the rules' `chapters` (by hero, then day two to four). Every line is new
// and written once. A draft for the owner. The dreams are in `dreams.ts`.
export interface Words {
  readonly answers?: readonly [string, string];
  readonly line: string;
}
const w = (line: string, answers?: readonly [string, string]): Words =>
  answers === undefined ? { line } : { answers, line };

export const stories: readonly (readonly (readonly Words[])[])[] = [
  [
    [
      w("Fix a dead cabinet in the arcade for cash."),
      w("Run wire across Neon Row to keep the lights on."),
      w("Pay the 100 DUN entry and win the arcade tournament."),
    ],
    [
      w(
        "Find the one who knows the old power lines, or the one who knows the streets.",
      ),
      w("Trace the old power line under The Shaft by frost vision."),
      w("Splice the old line back into the arcade."),
    ],
    [
      w("Find what is draining the grid in The Shaft."),
      w(
        "It is a robot called Bit, and it is starting to think. Who keeps the lights?",
        ["Share the grid with Bit", "Cut Bit off"],
      ),
      w("Keep the arcade lit through the brownout."),
    ],
  ],
  [
    [
      w("Grab the shiniest frame at the Meme Market auction."),
      w("Look inside the frame by frost vision."),
      w("Sell the empty frames to a collector who has not looked."),
    ],
    [
      w("Find someone who can tell real from fake."),
      w("Sort the hoard by frost vision: real from fake."),
      w("Watch the hoard token go to zero on the Exchange screens."),
    ],
    [
      w("Trade the dead token for one real thing."),
      w("Pay 1,000 DUN for something that holds."),
      w("Lock it in the freezer in The Shaft."),
    ],
  ],
  [
    [
      w("Work a mining shift in The Shaft."),
      w("Find a carved word in the tunnel wall by lamp."),
      w("Find a second carved word, deeper in."),
    ],
    [
      w("Find someone young who can read the new city."),
      w("Ride the Green Line twice and learn the new city."),
      w("Find the third carved word by lamp."),
    ],
    [
      w("A recovery expert wants a fee up front to find the rest.", [
        "Pay the fee",
        "Walk away",
      ]),
      w(
        "Kiki turns up, sparkly and crying: she can help, if you tell her the words.",
        ["Tell her the words", "Ask what she wants first"],
      ),
      w("Find the last word yourself, by lamp."),
    ],
  ],
  [
    [
      w("Carry a couch for a moving job."),
      w("Work the door at a Neon Row club."),
      w("Clear the snow off Floe Street."),
    ],
    [
      w("Find someone who can talk and count."),
      w("Get a fair price for the snow clearing this time."),
      w("Read the notice by frost vision: the floe is for auction."),
    ],
    [
      w("Raise 2,000 DUN for the floe auction."),
      w("Max Leverage is bidding for a tower. How do you win?", [
        "Outbid him honestly",
        "Dig up dirt on Max",
      ]),
      w("Sign for the last piece of the floe."),
    ],
  ],
  [
    [
      w("Set up on a Rug Row stoop with honest odds."),
      w("Read honest odds for a stranger."),
      w("Pay 300 DUN back to a follower."),
    ],
    [
      w("Find someone people trust."),
      w("Let your ally vouch for you on the stoop."),
      w("Pay 500 DUN back to two more followers."),
    ],
    [
      w("Meet your old partners in a Rug Row basement."),
      w(
        "They want one more call, for a coin they plan to rug. You are live in Ticker Square.",
        ["Call it against them", "Take their deal"],
      ),
      w("Walk out of Ticker Square past the cameras."),
    ],
  ],
  [
    [
      w("Clock in at dispatch with two deliveries done."),
      w("Pose for selfies with strangers in Meme Market."),
      w("The coin's makers want you on camera for their coin.", [
        "Pose for them",
        "Say no",
      ]),
    ],
    [
      w("Find someone who heard what the makers are planning."),
      w("Hear the tip in the alley behind the makers' office."),
      w("Find the literal rug in the makers' basement by frost vision."),
    ],
    [
      w("Watch a delivery robot take your old route."),
      w("Start your own courier crew: bring a crewmate."),
      w("Pay 500 DUN and relaunch your face fairly from the Exchange."),
    ],
  ],
  [
    [
      w("Work the yacht club coat check."),
      w("Read the coat check stubs by frost vision: who owns what."),
      w("Return a lost wallet to its owner."),
    ],
    [
      w("Find muscle or a driver for the job."),
      w("Case the owner's yacht from the pier by frost vision."),
      w("Plan the party job in Cold Harbor."),
    ],
    [
      w("Slip into the owner's party unseen, by frost vision."),
      w("Your friendliest contact sells you out. Run."),
      w("Get away clean in Cold Harbor once the tuxes lose you."),
    ],
  ],
  [
    [
      w("Sell your last suit at the Rug Row pawn window."),
      w("Hype a stranger's coin on Pump Pier for tips."),
      w("Relearn the chart: make one small trade on the Exchange floor."),
    ],
    [
      w("Find someone careful, someone you used to laugh at."),
      w("Sit in the Old Floe park with your ally and listen."),
      w("Read the winter chart together by frost vision."),
    ],
    [
      w("Steal a look at Max's trading desk by frost vision."),
      w("Pay 1,000 DUN to bait the desk with a bet they cannot resist."),
      w("Collect on the floor when their hunt backfires."),
    ],
  ],
  [
    [
      w("Fish off the end of the dock."),
      w("Fix a boat at the yacht club."),
      w("File a form at the MAXX back window. It closes on you."),
    ],
    [
      w("Find someone who can get inside the Exchange."),
      w("Slip into the Exchange back office by frost vision."),
      w("Copy the MAXX ledger."),
    ],
    [
      w("Count what is really in the MAXX vault, by frost vision."),
      w("The vault is empty and the island does not know yet.", [
        "Warn everyone",
        "Bet against it",
      ]),
      w("Get back to Cold Harbor before the Vests notice."),
    ],
  ],
  [
    [
      w("Set out the two buckets at the Swap Meet."),
      w("Swap a stranger's coat for a hat."),
      w("Pay 500 DUN to fill the buckets from the market."),
    ],
    [
      w("Find someone to keep the buckets full or watch the line."),
      w("Watch the line for pickpockets by frost vision."),
      w("Keep the buckets full after the storm."),
    ],
    [
      w("Max Leverage wants to buy the Swap Meet.", [
        "Sell it to him",
        "Refuse",
      ]),
      w("Find the hidden fee in his copycat's sign by frost vision."),
      w("Tell the line about the fee."),
    ],
  ],
];
