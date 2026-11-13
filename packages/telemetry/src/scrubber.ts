// What must never leave the platform in a report, whatever the provider: the one place that knows the shapes of the things we hold that are
// private. Each provider sits behind it, so privacy does not depend on the vendor.
export const removed = "[removed]";

// Longest and most specific first, so a token is taken whole before a shorter pattern can bite a piece of it.
const privateShapes: readonly RegExp[] = [
  /\bBearer\s+[\w.~+/-]+=*/giu,
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/gu,
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu,
  /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/giu,
  /\b(?:bc1|tb1|bcrt1)[a-z0-9]{8,87}\b/giu,
  /\b[13][1-9A-HJ-NP-Za-km-z]{25,34}\b/gu,
  /\b(?:0x)?[a-f0-9]{24,}\b/giu,
];

// Text with every private shape replaced: an email address, a wallet address, a transaction id or key, a uuid (an account or run id), a
// token. A message that names none of them comes back as it was.
export function scrubText(text: string): string {
  return privateShapes.reduce(
    (scrubbed, shape) => scrubbed.replaceAll(shape, removed),
    text,
  );
}

const wholeNumber = /^\d+$/u;
const longIdentifier = /^[A-Za-z0-9]{22,}$/u;

function isIdentifier(segment: string): boolean {
  return (
    wholeNumber.test(segment) ||
    longIdentifier.test(segment) ||
    scrubText(segment) !== segment
  );
}

// A path with the parts that name one thing (a number, a long identifier, anything scrubText would remove) as `:id`, so
// `/s/9f1c2d3e-…` and `/s/7a0b…` are one page. Words and slugs stay.
export function scrubPath(path: string): string {
  return path
    .split("/")
    .map((segment) => (isIdentifier(segment) ? ":id" : segment))
    .join("/");
}

// An address as a report may keep it: the origin if there is one, the path made anonymous, and never the query or the hash (they carry
// codes, return addresses and wallet names).
export function scrubUrl(href: string): string {
  try {
    const url = new URL(href);
    return `${url.origin}${scrubPath(url.pathname)}`;
  } catch {
    return scrubPath(href.split(/[?#]/u)[0] ?? "");
  }
}

export type Primitive = string | number | boolean;

// The properties of an event with every text scrubbed. Numbers and flags hold nothing that can name a person.
export function scrubProperties(
  properties: Readonly<Record<string, Primitive>>,
): Record<string, Primitive> {
  return Object.fromEntries(
    Object.entries(properties).map(([name, value]) => [
      name,
      typeof value === "string" ? scrubText(value) : value,
    ]),
  );
}
