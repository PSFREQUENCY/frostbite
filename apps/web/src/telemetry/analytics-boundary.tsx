"use client";

import { AnalyticsProvider } from "@frostbite/client-react";
import type { ReactNode } from "react";

import { pageAnalytics } from "./browser-analytics";

// Gives the whole page its analytics. It is a client component so the server can render the layout and hand it the page.
export function AnalyticsBoundary({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <AnalyticsProvider analytics={pageAnalytics}>{children}</AnalyticsProvider>
  );
}
