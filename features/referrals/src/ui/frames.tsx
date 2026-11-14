import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import {
  referralsAdminPath,
  referralsAdminPayoutsPath,
  referralsAdminProgramPath,
  referralsAdminReferrersPath,
} from "@frostbite/shared/referrals";
import { ConsolePage } from "@repo/ui/arcade";
import type { ReactNode } from "react";

import { adminWords } from "../domain/admin-copy.ts";
import { pageWords } from "../domain/copy.ts";

// The frame of a person's own referral pages: the platform's console frame, so a referrer's page reads as part of their account.
export function UserFrame({
  children,
  heading,
  intro,
  navigation,
}: {
  readonly children: ReactNode;
  readonly heading: string;
  readonly intro: string;
  readonly navigation: readonly NavigationItem[];
}) {
  return (
    <ConsolePage
      eyebrow={pageWords.userEyebrow}
      heading={heading}
      intro={intro}
      navigation={navigation}
    >
      {children}
    </ConsolePage>
  );
}

export type AdminSection = "overview" | "payouts" | "program" | "referrers";

const sections = [
  { href: referralsAdminPath, id: "overview" },
  { href: referralsAdminProgramPath, id: "program" },
  { href: referralsAdminReferrersPath, id: "referrers" },
  { href: referralsAdminPayoutsPath, id: "payouts" },
] as const;

// Whether the person looking may change the program: the Program section is offered only to those who may open it, so its presence in their
// navigation is the answer (the server refuses everyone else regardless).
export const canAdminister = (navigation: readonly NavigationItem[]): boolean =>
  navigation.some(({ href }) => href === referralsAdminProgramPath);

// Likewise for paying: the Payouts section is offered to those who may open it.
export const canPay = (navigation: readonly NavigationItem[]): boolean =>
  navigation.some(({ href }) => href === referralsAdminPayoutsPath);

// The three routes of the admin referral section, as links, so each has its own address and its own check on who may open it. The one
// being shown is marked as the current page.
function SectionLinks({
  current,
  navigation,
}: {
  readonly current: AdminSection;
  readonly navigation: readonly NavigationItem[];
}) {
  const shown = sections.filter(
    ({ id }) =>
      (id !== "program" || canAdminister(navigation)) &&
      (id !== "payouts" || canPay(navigation)),
  );
  return (
    <nav aria-label="Referral sections" className="ref-sections">
      {shown.map(({ href, id }) => (
        <a
          aria-current={id === current ? "page" : undefined}
          className="ref-sections__link"
          href={href}
          key={id}
        >
          {adminWords.sections[id]}
        </a>
      ))}
    </nav>
  );
}

// The frame of every admin referral page: the console frame and the section links above what each page shows.
export function AdminFrame({
  children,
  current,
  heading,
  intro,
  navigation,
}: {
  readonly children: ReactNode;
  readonly current: AdminSection;
  readonly heading?: string;
  readonly intro?: string;
  readonly navigation: readonly NavigationItem[];
}) {
  return (
    <ConsolePage
      eyebrow={adminWords.eyebrow}
      heading={heading ?? adminWords.heading}
      intro={intro ?? adminWords.intro}
      navigation={navigation}
    >
      <SectionLinks current={current} navigation={navigation} />
      {children}
    </ConsolePage>
  );
}
