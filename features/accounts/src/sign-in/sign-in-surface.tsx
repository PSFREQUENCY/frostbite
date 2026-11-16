"use client";

import { useAnalytics } from "@frostbite/client-react";
import { returnTarget } from "@frostbite/shared/auth/sign-in-path";
import {
  normalizeReferralCode,
  referralCodeLength,
} from "@frostbite/shared/referrals";
import { ArcadeTextField } from "@repo/ui/arcade";
import type { WalletNetwork } from "@frostbite/wallet/contracts";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { signInViews } from "./registry.ts";
import { selectSignInViews, type SignInView } from "./views.ts";

// A full navigation, so everything on the page (the header's wallet, the navigation) is read again under the new session.
const assign = (path: string): void => window.location.assign(path);

// Every way to sign in that the deployment offers, as a row of keys with the chosen one's panel beneath. What is offered comes from the
// server's method registry; `views` is how each kind is shown. Every panel stays mounted (the others are only hidden), so a half-entered
// email survives a look at another key and a method that finds the person already signed in still takes them on.
export function SignInSurface({
  expectedNetwork,
  navigate = assign,
  acceptsInvitation = false,
  offered,
  referralCode = null,
  views = signInViews,
}: {
  readonly expectedNetwork: WalletNetwork;
  // How to go to a page; the destination is checked by `returnTarget`, which only ever gives a path on this site.
  readonly navigate?: (path: string) => void;
  // Whether the page asks for an invitation code, which the person may type or which came with the address. Only the page for signing in
  // does; the page that sets the platform up does not.
  readonly acceptsInvitation?: boolean;
  readonly offered: readonly string[];
  // The code of whoever referred the person, from the address of the page; it starts the field and is handed on to every method's view.
  readonly referralCode?: string | null;
  readonly views?: readonly SignInView[];
}) {
  const shown = selectSignInViews(offered, views);
  const [first] = shown;
  const [chosen, choose] = useState(first?.kind ?? "");
  const group = useId();
  const analytics = useAnalytics();
  // What the person typed (or came with), and the code it is if it is the shape of one. Only a code of that shape is sent on.
  const [typed, setTyped] = useState(referralCode ?? "");
  const invitation = acceptsInvitation ? normalizeReferralCode(typed) : null;
  // The methods a person has begun on this page. A method that finds them already signed in takes them on without a sign-in, which is not
  // one to count.
  const begun = useRef(new Set<string>());
  const keys = useRef<Readonly<Record<string, HTMLButtonElement | null>>>({});
  if (first === undefined)
    return <p role="status">Signing in is not available right now.</p>;
  const current = shown.some(({ kind }) => kind === chosen)
    ? chosen
    : first.kind;
  // Arrow keys move between the keys as in any tab list, Home and End jump to the ends.
  function move(event: KeyboardEvent, index: number) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? shown.length - 1
          : step === undefined
            ? null
            : (index + step + shown.length) % shown.length;
    const kind = target === null ? undefined : shown[target]?.kind;
    if (kind === undefined) return;
    event.preventDefault();
    choose(kind);
    keys.current[kind]?.focus();
  }
  return (
    <div className="sign-in-console">
      <div
        aria-label="How do you want to sign in?"
        className="sign-in-keys"
        data-count={shown.length}
        role="tablist"
      >
        {shown.map(({ glyph, kind, label, tagline }, index) => (
          <button
            aria-controls={`${group}-${kind}`}
            aria-selected={kind === current}
            className="sign-in-key"
            id={`${group}-key-${kind}`}
            key={kind}
            onClick={() => choose(kind)}
            onKeyDown={(event) => move(event, index)}
            ref={(element) => {
              keys.current = { ...keys.current, [kind]: element };
            }}
            role="tab"
            tabIndex={kind === current ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true" className="sign-in-key__glyph">
              {glyph}
            </span>
            <span className="sign-in-key__label" id={`${group}-name-${kind}`}>
              {label}
            </span>
            <small className="sign-in-key__tagline">{tagline}</small>
          </button>
        ))}
      </div>
      {shown.map(({ Component, kind, label }) => (
        <section
          aria-labelledby={`${group}-name-${kind}`}
          className="sign-in-slot"
          hidden={kind !== current}
          id={`${group}-${kind}`}
          key={kind}
          role="tabpanel"
        >
          <h2 className="sign-in-slot__title">{`${label} login`}</h2>
          <Component
            expectedNetwork={expectedNetwork}
            onSignedIn={() => {
              if (begun.current.has(kind))
                analytics.capture("sign_in_succeeded", { method: kind });
              navigate(returnTarget(window.location.search));
            }}
            referralCode={invitation}
            track={{
              failed: (reason) =>
                analytics.capture("sign_in_failed", { method: kind, reason }),
              started: () => {
                begun.current.add(kind);
                analytics.capture("sign_in_started", { method: kind });
              },
            }}
          />
        </section>
      ))}
      {acceptsInvitation ? (
        <details
          className="sign-in-invitation"
          open={referralCode === null ? undefined : true}
        >
          <summary>Have an invitation code?</summary>
          <ArcadeTextField
            autoComplete="off"
            error={
              typed.trim() !== "" && invitation === null
                ? `An invitation code is ${String(referralCodeLength)} letters and numbers.`
                : null
            }
            hint="If signing in makes you a new account, it counts for the person who invited you."
            label="Invitation code (optional)"
            maxLength={referralCodeLength + 8}
            onChange={setTyped}
            value={typed}
          />
        </details>
      ) : null}
    </div>
  );
}
