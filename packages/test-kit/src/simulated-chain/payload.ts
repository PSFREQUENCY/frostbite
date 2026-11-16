import { z } from "zod";

import {
  chainFamilyIdSchema,
  type AssetRef,
  type ChainRef,
  type SignedTransaction,
  type UnsignedTransaction,
} from "@frostbite/shared/chain";

// The simulated family's payload: the body it carries, the constants of its format, and the simulated wallet's marker.
export const simulatedFamily = chainFamilyIdSchema.parse("simulated");
export const simulatedAdapterVersion = "1.0.0";
export const simulatedFormat = "sim-json/1";
export const simulatedFee = 1n;
export const lifetimeMilliseconds = 10 * 60 * 1000;

// What the simulated payload carries. The wallet bridge and the adapter read it; nothing else does.
const bodySchema = z
  .object({
    amount: z.string().optional(),
    claimLimit: z.number().optional(),
    collectibleAt: z.string().optional(),
    contract: z.string().optional(),
    drawingBytes: z.number().optional(),
    drawingSha: z.string().optional(),
    expiresAt: z.string(),
    fee: z.string(),
    maxDrawingBytes: z.number().optional(),
    milestoneId: z.string().optional(),
    nonce: z.number(),
    operation: z.string(),
    paused: z.boolean().optional(),
    // For a batch: "recipient:amount" for each payment, in order.
    payments: z.array(z.string()).optional(),
    platformFeeAmount: z.string().optional(),
    platformFeeTo: z.string().optional(),
    recipient: z.string().optional(),
    sender: z.string(),
    templateAt: z.string().optional(),
    templateId: z.string().optional(),
    templateVersion: z.string().optional(),
  })
  .strict();
export type SimulatedBody = z.infer<typeof bodySchema>;

export function nativeAsset(chain: ChainRef): AssetRef {
  return { chain, id: "sim", kind: "native" };
}

// The simulated wallet: appends a marker the verifier checks. It stands in for a real signature.
export function signSimulated(
  unsigned: UnsignedTransaction,
): SignedTransaction {
  return {
    chain: unsigned.chain,
    family: unsigned.family,
    format: unsigned.format,
    payload: `${unsigned.payload}${signatureMarker}`,
  };
}

export const signatureMarker = ".sig";

// The payload as the simulated network reads it, or undefined for text that is not one. A signed payload is the built one
// followed by the wallet's marker, which the network does not read.
export function decodeSimulated(payload: string): SimulatedBody | undefined {
  try {
    const body = payload.endsWith(signatureMarker)
      ? payload.slice(0, -signatureMarker.length)
      : payload;
    return bodySchema.safeParse(JSON.parse(body)).data;
  } catch {
    return undefined;
  }
}
