// The stick and the arrows steer by the screen: up is the way the camera looks. A screen heading (0 right, 4 down, 8 left, 12 up, as the
// rules count) is turned into one of the rules' sixteen headings by the camera's yaw at the moment it is first held, and kept while it is
// held, so a camera swinging round behind the hero never bends the line they walk. A new direction on the stick is read afresh.
export const worldHeading = (screen: number, yaw: number): number =>
  (((Math.round((yaw + Math.PI / 2) / (Math.PI / 8)) + screen) % 16) + 16) % 16;

export function createSteer(
  yaw: () => number,
  move: (dir: number) => void,
): (screen: number) => void {
  let held = -1;
  return (screen) => {
    if (screen === held) return;
    held = screen;
    move(screen < 0 ? -1 : worldHeading(screen, yaw()));
  };
}
