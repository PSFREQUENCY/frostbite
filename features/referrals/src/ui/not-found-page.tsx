import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import { ArcadeButton, ConsoleCard } from "@repo/ui/arcade";

import { UserFrame } from "./frames.tsx";

// What a referral page says for something that is not there (a referrer that does not exist, or a page that needs a person who is not
// signed in): the same words either way, with the way back.
export function NotFoundPage({
  navigation,
}: {
  readonly navigation: readonly NavigationItem[];
}) {
  return (
    <UserFrame
      heading="Nothing here"
      intro="That page does not exist, or it is not yours to see."
      navigation={navigation}
    >
      <ConsoleCard glyph="←" title="Go back">
        <ArcadeButton href="/referrals">Referrals</ArcadeButton>
      </ConsoleCard>
    </UserFrame>
  );
}
