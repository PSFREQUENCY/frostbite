import { z } from "zod";

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;
const megabyte = 1_000_000;
const megapixel = 1_000_000;

export const uploadPurposes = [
  "collection-artwork",
  "collection-banner",
  "collection-item-artwork",
  "creator-avatar",
] as const;

export const uploadPurposeSchema = z.enum(uploadPurposes);
export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;

// What a vector picture may be, and for which uses it is accepted. It is read by a strict reader, so its size, depth and number of elements are
// bounded here, and it is drawn once at `rasterSide` (the longest side, in pixels) before the usual thumbnail and preview are made from that.
const svgPolicySchema = z
  .object({
    maxAttributeLength: z.number().int().positive(),
    maxBytes: z.number().int().positive(),
    maxDepth: z.number().int().min(1).max(256),
    maxElements: z.number().int().positive(),
    purposes: z.array(uploadPurposeSchema),
    rasterSide: z.number().int().positive(),
  })
  .strict();

const policySchema = z
  .object({
    activeIntentLimitPerUser: z.number().int().min(1).max(100),
    cleanupDelayMs: z
      .number()
      .int()
      .min(hourMs)
      .max(30 * dayMs),
    // Bounds decoded memory: ADR-004 requires dimension and pixel limits as typed policy.
    // Persisted in PostgreSQL integer columns, so larger limits could never be stored.
    maxImageDimension: z
      .number()
      .int()
      .positive()
      .max(2 ** 31 - 1),
    maxImagePixels: z.number().int().positive(),
    intentRetentionMs: z
      .number()
      .int()
      .min(dayMs)
      .max(365 * dayMs),
    maxBytesByPurpose: z.record(
      uploadPurposeSchema,
      z.number().int().positive(),
    ),
    svg: svgPolicySchema,
    presignedUrlLifetimeMs: z.number().int().min(minuteMs).max(hourMs),
    // How long a signed derivative URL stays valid (ADR-016). A bearer URL, so kept short.
    derivativeReadLifetimeMs: z.number().int().min(minuteMs).max(hourMs),
    // Assets in one page of the library; older pages follow a cursor.
    libraryPageSize: z.number().int().min(1).max(100),
    // Abandoned uploads claimed per cleanup pass; each one costs a storage delete.
    cleanupBatchSize: z.number().int().min(1).max(500),
    // Removals of one pass in flight at once: a slow key delays only its own slot, not the whole batch.
    cleanupConcurrency: z.number().int().min(1).max(20),
    // How long one removal may take before it counts as failed.
    cleanupDeleteTimeoutMs: z
      .number()
      .int()
      .min(1_000)
      .max(5 * minuteMs),
    // A removal that failed is not tried again for this long, doubling with each failure up to the maximum, so a key
    // that always fails stops taking a place in every pass.
    cleanupRetryBaseMs: z.number().int().min(minuteMs).max(dayMs),
    cleanupRetryMaxMs: z
      .number()
      .int()
      .min(minuteMs)
      .max(7 * dayMs),
  })
  .strict()
  .refine(
    ({ cleanupDelayMs, presignedUrlLifetimeMs }) =>
      cleanupDelayMs > presignedUrlLifetimeMs,
    "Cleanup delay must exceed the presigned URL lifetime.",
  )
  .refine(
    ({ cleanupRetryBaseMs, cleanupRetryMaxMs }) =>
      cleanupRetryMaxMs >= cleanupRetryBaseMs,
    "The cleanup retry maximum cannot be less than its base.",
  )
  .refine(
    ({ maxImageDimension, svg }) => svg.rasterSide <= maxImageDimension,
    "A vector picture cannot be drawn larger than the largest image allowed.",
  )
  .refine(
    ({ derivativeReadLifetimeMs, presignedUrlLifetimeMs }) =>
      derivativeReadLifetimeMs <= presignedUrlLifetimeMs,
    "Derivative read lifetime cannot exceed the presigned URL lifetime.",
  );

export type UploadPolicy = z.infer<typeof policySchema>;
export type SvgPolicy = z.infer<typeof svgPolicySchema>;
export type UploadPolicyOverrides = Omit<
  Partial<UploadPolicy>,
  "maxBytesByPurpose" | "svg"
> & {
  readonly maxBytesByPurpose?: Partial<UploadPolicy["maxBytesByPurpose"]>;
  readonly svg?: Partial<UploadPolicy["svg"]>;
};

const svgDefaults: SvgPolicy = {
  maxAttributeLength: 100_000,
  maxBytes: 2 * megabyte,
  maxDepth: 64,
  maxElements: 10_000,
  purposes: [
    "collection-artwork",
    "collection-banner",
    "collection-item-artwork",
  ],
  rasterSide: 1_024,
};
const defaultSvgPolicy = Object.freeze(svgDefaults);

export const defaultUploadPolicy: UploadPolicy = Object.freeze({
  activeIntentLimitPerUser: 2,
  cleanupDelayMs: dayMs,
  intentRetentionMs: 30 * dayMs,
  // Accepted 2026-10-06 for the beta: 8192 px per side and 40 megapixels decoded.
  maxImageDimension: 8192,
  maxImagePixels: 40 * megapixel,
  maxBytesByPurpose: Object.freeze({
    "collection-artwork": 25 * megabyte,
    "collection-banner": 15 * megabyte,
    "collection-item-artwork": 25 * megabyte,
    "creator-avatar": 5 * megabyte,
  }),
  // Vector pictures: collection pictures only, 2 MB, drawn at 1024 px (the preview size), read with a bound on nesting and elements.
  svg: defaultSvgPolicy,
  presignedUrlLifetimeMs: 15 * minuteMs,
  derivativeReadLifetimeMs: 5 * minuteMs,
  libraryPageSize: 48,
  cleanupBatchSize: 50,
  cleanupConcurrency: 5,
  cleanupDeleteTimeoutMs: 30_000,
  cleanupRetryBaseMs: 5 * minuteMs,
  cleanupRetryMaxMs: 6 * hourMs,
});

export function resolveUploadPolicy(
  overrides: UploadPolicyOverrides = {},
): UploadPolicy {
  return Object.freeze(
    policySchema.parse({
      ...defaultUploadPolicy,
      ...overrides,
      maxBytesByPurpose: {
        ...defaultUploadPolicy.maxBytesByPurpose,
        ...overrides.maxBytesByPurpose,
      },
      svg: { ...defaultUploadPolicy.svg, ...overrides.svg },
    }),
  );
}
