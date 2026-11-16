// How high a jump is (metres) a time after it began (seconds): up and down in a little over half a second. A jump is only on the
// screen; the rules never hear of it.
export const jumpLength = 0.6;
export const hopAt = (since: number): number =>
  since < 0 || since > jumpLength
    ? 0
    : 3.4 * (since / jumpLength) * (1 - since / jumpLength);
// How far through a jump a body is (0 to 1), or -1 on the ground.
export const airAt = (since: number): number =>
  since < 0 || since > jumpLength ? -1 : since / jumpLength;
