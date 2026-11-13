"use client";

import { useEffect } from "react";

import { ArcadeActionButton, ArcadePanel, StatusLamp } from "@repo/ui/arcade";

import { browserErrorReporter } from "../telemetry/browser-reporter";

// What a page shows when something in it breaks while it is drawn, instead of the framework's bare message. The error is reported (without
// the person's address or what they typed) and the person can try the page again.
export default function PageError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    browserErrorReporter().captureException(error, {
      route: window.location.pathname,
    });
  }, [error]);
  return (
    <section className="arcade-section arcade-section--raised">
      <StatusLamp label="Page error" tone="attention" />
      <ArcadePanel eyebrow="Something broke" title="This page hit a snag">
        <p>
          The page could not be drawn. The problem has been noted. Try again,
          and if it keeps happening, come back in a little while.
        </p>
        <ArcadeActionButton onClick={reset} tone="cyan">
          Try again
        </ArcadeActionButton>
      </ArcadePanel>
    </section>
  );
}
