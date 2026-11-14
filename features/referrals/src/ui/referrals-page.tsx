import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import type { Mine, ReferralProgram } from "@frostbite/referrals";
import { referralLinkPath } from "@frostbite/shared/referrals";
import { signInHref } from "@frostbite/shared/auth/sign-in-path";
import { ArcadeButton, ConsoleCard, KeyValueList } from "@repo/ui/arcade";

import { mineWords, pageWords, stateWords, termsOf } from "../domain/copy.ts";
import { CopyLink } from "./copy-link.tsx";
import { UserFrame } from "./frames.tsx";
import { PotCard } from "./pot-card.tsx";

// What a worked example of the cut is worked on: the figure is only an illustration, so it is a round one.
const exampleFee = 3_000n;

function Terms({ program }: { readonly program: ReferralProgram | null }) {
  const terms = program?.enabled === true ? termsOf(program, exampleFee) : [];
  return (
    <ConsoleCard glyph="✦" title="How it works" wide>
      {terms.length === 0 ? (
        <p>{stateWords.off}</p>
      ) : (
        <ul className="ref-terms">
          {terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
      )}
    </ConsoleCard>
  );
}

function YourLink({ mine }: { readonly mine: Mine }) {
  return (
    <ConsoleCard glyph="⛓" title="Your link">
      <CopyLink path={referralLinkPath(mine.code)} />
      <KeyValueList
        items={[
          { label: "Your code", mono: true, value: mine.code },
          {
            label: "Signed up",
            value:
              mine.signedUp === 0 ? null : mineWords.brought(mine.signedUp),
          },
          {
            label: "Minted",
            value: mine.signedUp === 0 ? null : mineWords.minted(mine.minted),
          },
        ]}
      />
      {mine.signedUp === 0 ? <p>{mineWords.noneYet}</p> : null}
    </ConsoleCard>
  );
}

// `/referrals`: readable by anyone, so the incentive is stated before anyone joins (the terms come from the program record in force); a
// signed-in referrer also sees their link, who came, and the pot. `mine` is none for a visitor who is not signed in.
export function ReferralsPage({
  mine,
  navigation,
  program,
}: {
  readonly mine: Mine | null;
  readonly navigation: readonly NavigationItem[];
  readonly program: ReferralProgram | null;
}) {
  return (
    <UserFrame
      heading={pageWords.explainerHeading}
      intro={pageWords.explainerIntro}
      navigation={navigation}
    >
      {mine === null ? (
        <ConsoleCard glyph="→" title="Get your link" wide>
          <p>{stateWords.signedOut}</p>
          <ArcadeButton href={signInHref("/referrals")} tone="mint">
            Sign in
          </ArcadeButton>
        </ConsoleCard>
      ) : (
        <>
          <PotCard frozen={mine.frozen} pots={mine.pots} program={program} />
          <YourLink mine={mine} />
        </>
      )}
      <Terms program={program} />
      {mine === null ? null : (
        <ConsoleCard glyph="☰" title="Your history">
          <ArcadeButton href="/referrals/history">
            See every earning
          </ArcadeButton>
        </ConsoleCard>
      )}
    </UserFrame>
  );
}
