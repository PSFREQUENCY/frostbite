import type { Instrumentation } from "next";

// Next.js calls `register` once when the server starts. A setting that cannot work stops the server here, with its name, instead of
// failing the first person to need it. Only the Node.js runtime has the chain; the edge runtime is not used for it.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkRewardsChainAtStartup } =
    await import("@repo/configs/game-rewards");
  await checkRewardsChainAtStartup();
  // The error reporting's settings are checked here too, so a provider that cannot work (no ingest address, an unknown name) stops the server
  // at start with the setting's name, not at the first error.
  const { serverErrorReporter } = await import("./server/telemetry/reporter");
  serverErrorReporter();
}

// Next.js tells this of every error in a page, a route or an action that nothing else caught. Only the Node.js runtime has the reporter.
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportRequestError } =
    await import("./server/telemetry/request-error");
  reportRequestError(error, context);
};
