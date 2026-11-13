// A report must never change what the person using the page sees: whatever a provider does (throws, rejects, hangs) is contained here and
// told to whoever asked to hear about it.
export type Problem =
  "invalid-event" | "provider-failed" | "shutdown-timed-out";
export type OnProblem = (problem: Problem) => void;

// How long closing a provider may take before the platform stops waiting for it.
export const defaultShutdownTimeoutMs = 2_000;

export function callSafely(
  run: () => void | Promise<void>,
  onProblem: OnProblem,
): void {
  try {
    const pending = run();
    if (pending !== undefined)
      pending.catch(() => {
        onProblem("provider-failed");
      });
  } catch {
    onProblem("provider-failed");
  }
}

export async function closeWithin(
  close: () => Promise<void>,
  timeoutMs: number,
  onProblem: OnProblem,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"timed-out">((resolve) => {
    timer = setTimeout(() => {
      resolve("timed-out");
    }, timeoutMs);
  });
  try {
    const first = await Promise.race([
      close().then(() => "closed" as const),
      timedOut,
    ]);
    if (first === "timed-out") onProblem("shutdown-timed-out");
  } catch {
    onProblem("provider-failed");
  } finally {
    clearTimeout(timer);
  }
}
