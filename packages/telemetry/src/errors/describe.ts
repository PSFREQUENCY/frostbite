import { z } from "zod";

import { scrubPath, scrubText } from "../scrubber.ts";
import type { ErrorContext, ErrorReport } from "./port.ts";

// How many lines of the stack a report keeps by default: where it happened, not the whole way down.
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
    // A page's address as a template: never the query or the hash, which carry codes and return addresses.
    ...(route === undefined
      ? {}
      : { route: scrubPath(route.split(/[?#]/u)[0] ?? "") }),
  };
}

export interface DescribeOptions {
  // How many lines of the stack to keep.
  readonly maxFrames?: number;
  // "omit" keeps the message out altogether. A server error's message can carry a database query with the player's own values in it, which
  // no pattern can promise to catch, so the server never sends one. A browser error's message is scrubbed and kept.
  readonly message?: "keep" | "omit";
}

// A database error's code, from the error or from the error that caused it: it says what went wrong without saying to whom.
function codeOf(error: Error): string | undefined {
  const source =
    typeof error.cause === "object" && error.cause !== null
      ? error.cause
      : error;
  const code = Reflect.get(source, "code");
  return typeof code === "string" ? code : undefined;
}

// What a report keeps of whatever was thrown: its kind, its message (scrubbed, cut short, or left out), a code if it has one, the lines of
// its stack, and the context the platform gives. A thrown value that is not an Error is described by its type and never printed, because it
// could be anything.
export function describeError(
  error: unknown,
  context: ErrorContext = {},
  options: DescribeOptions = {},
): ErrorReport {
  const known = error instanceof Error;
  const code = known ? codeOf(error) : undefined;
  const omitMessage = options.message === "omit";
  return {
    ...(code === undefined ? {} : { code }),
    context: checkedContext(context),
    frames: known
      ? (error.stack ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("at "))
          .slice(0, options.maxFrames ?? maxStackFrames)
          .map(scrubText)
      : [],
    message:
      known && !omitMessage
        ? scrubText(error.message).slice(0, maxMessageLength)
        : "",
    name: known ? error.name : typeof error,
  };
}
