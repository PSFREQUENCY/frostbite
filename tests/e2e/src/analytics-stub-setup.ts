import { analyticsStubPort, startIngestStub } from "./ingest-stub.ts";

// Runs once before the browser tests: the analytics provider's stand-in, so that the page views every page sends have somewhere to go and
// nothing fails or waits. Its caller (Playwright) runs the returned function when the run is over.
export default async function startAnalyticsStub(): Promise<
  () => Promise<void>
> {
  const stub = await startIngestStub(analyticsStubPort);
  return stub.close;
}
