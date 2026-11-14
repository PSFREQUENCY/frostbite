import type { HttpOperation } from "@frostbite/http";
import { unauthenticated } from "@frostbite/http/outcome";
import {
  takeBackInputSchema,
  takeBackResponseSchema,
  takeBackRoute,
  type TakeBackInput,
  type TakeBackResponse,
} from "@frostbite/shared/referrals";

import type { ReferralsRuntime } from "../runtime.ts";
import { administerBase } from "./operations.ts";

// Takes one earning back, as the signed-in administrator, with the reason kept. Who is acting is the session, never a field of the request.
// What happens to the money is answered (`effect`), so the page can say it plainly once it is done.
export function createTakeBackOperation(
  resolve: () => Promise<ReferralsRuntime>,
) {
  const respond = (value: TakeBackResponse) => ({ ok: true, value }) as const;
  return {
    ...administerBase,
    execute: async (input, context) => {
      if (context.actorUserId === null) return unauthenticated;
      const { reversals } = await resolve();
      const result = await reversals.takeBack(
        context.actorUserId,
        input.earningId,
        input.reason,
      );
      if (result.ok) return respond({ effect: result.effect, status: "saved" });
      return respond({
        reason:
          result.code === "reason-required" || result.code === "reason-too-long"
            ? "invalid-reason"
            : result.code,
        status: "refused",
      });
    },
    inputSchema: takeBackInputSchema,
    outputSchema: takeBackResponseSchema,
    ...takeBackRoute,
  } satisfies HttpOperation<TakeBackInput, TakeBackResponse>;
}
