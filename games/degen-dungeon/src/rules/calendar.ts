// Seven story days over the city's five eras. The riot morning and a first day of honest hustle both see the city as the riot left it;
// then come the mania, the winter and its Great Airdrop, Launch Day, and Moon Night, whose morning after is the last day. What a day is
// like (who is open, the coin's moves, the saucers, the storm, the sky) goes by its era; the story goes by the day itself.
export const lastDay = 7;
const eraByDay = [1, 1, 2, 3, 4, 5, 5] as const;
export const eraOf = (day: number): number => eraByDay[day - 1] ?? 1;

// The story days of the eras listed, as day bits (bit 1 is day one): `eras(2, 3)` is open in the mania and the winter.
export const eras = (...list: readonly number[]): number =>
  eraByDay.reduce(
    (bits, era, index) =>
      list.includes(era) ? bits | (1 << (index + 1)) : bits,
    0,
  );

// Moon Night, the second-to-last day: the hero's dream, the party under Moon Tower, and lanterns after dark.
export const moonNight = 6;
// The eras of the saucers and of the Great Airdrop.
export const invasionEra = 2;
export const stormEra = 3;
