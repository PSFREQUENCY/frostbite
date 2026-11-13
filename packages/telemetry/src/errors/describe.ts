import { z } from "zod";

import { scrubPath, scrubText } from "../scrubber.ts";
import type { ErrorContext, ErrorReport } from "./port.ts";

// How many lines of the stack a report keeps: where it happened, not the whole way down.
export const maxStackFrames = 30;
const maxMessageLength = 500;

// The ids the platform makes itself are short names: anything else in their place is not one of ours and is not sent.
const correlationIdShape = z.string().regex(/^[\w-]{1,64}$/u);
const operationIdShape = z.string().regex(/^[\w.:-]{1,128}$/u);
const releaseShape = z.string().regex(/^[\w.+-]{1,64}$/u);
const routeShape = z.string().max(200);

function kept(
  shape: z.ZodString,
  value: string | undefined,
): string | undefined {
  return value !== undefined && shape.safeParse(value).success
    ? value
    : undefined;
}

function checkedContext(context: ErrorContext): ErrorContext {
  const correlationId = kept(correlationIdShape, context.correlationId);
  const operationId = kept(operationIdShape, context.operationId);
  const release = kept(releaseShape, context.release);
  const route = kept(routeShape, context.route);
  return {
    ...(correlationId === undefined ? {} : { correlationId }),
    ...(operationId === undefined ? {} : { operationId }),
    ...(release === undefined ? {} : { release }),
    ...(route === undefined ? {} : { route: scrubPath(route) }),
  };
}

// What a report keeps of whatever was thrown: its kind, its message (scrubbed, and cut short), the lines of its stack, and the context
// the platform gives. A thrown value that is not an Error is described without being printed, because it could be anything.
export function describeError(
  error: unknown,
  context: ErrorContext = {},
): ErrorReport {
  const known = error instanceof Error;
  return {
    context: checkedContext(context),
    frames: known
      ? (error.stack ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("at "))
          .slice(0, maxStackFrames)
          .map(scrubText)
      : [],
    message: known
      ? scrubText(error.message).slice(0, maxMessageLength)
      : "A value that is not an Error was thrown.",
    name: known ? error.name : "NonError",
  };
}
