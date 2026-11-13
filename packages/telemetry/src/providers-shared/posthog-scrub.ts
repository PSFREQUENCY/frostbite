import {
  scrubDeep,
  scrubPath,
  scrubUrl,
  type Scrubbable,
} from "../scrubber.ts";

// What a PostHog event carries that must be left as the platform made it, or made anonymous in a way text scrubbing cannot: our own ids
// (a correlation id is a uuid) are kept; the addresses the library records are cut to origin and anonymous path.
const keptProperties = [
  "app_release",
  "correlation_id",
  "distinct_id",
  "operation_id",
  "route",
] as const;
const addressProperties = new Set([
  "$current_url",
  "$initial_current_url",
  "$referrer",
]);

// A value with the addresses in it made anonymous: the properties the library records by name, and any file name, when they are web addresses.
function withAnonymousAddresses(value: Scrubbable, name = ""): Scrubbable {
  if (typeof value === "string")
    // The page's own path, which the library records beside the address, is made anonymous the same way.
    return name === "$pathname"
      ? scrubPath(value)
      : (addressProperties.has(name) || name === "filename") &&
          /^https?:\/\//u.test(value)
        ? scrubUrl(value)
        : value;
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value))
    return value.map((item: Scrubbable) => withAnonymousAddresses(item));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      withAnonymousAddresses(item, key),
    ]),
  );
}

const sourceContext = ["pre_context", "context_line", "post_context"] as const;

function withoutSourceContext(value: Scrubbable): Scrubbable {
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value))
    return value.map((item: Scrubbable) => withoutSourceContext(item));
  return Object.fromEntries(
    Object.entries(value)
      .filter(([name]) => !sourceContext.some((hidden) => hidden === name))
      .map(([name, item]) => [name, withoutSourceContext(item)]),
  );
}

// The last line of defence on the properties of everything PostHog's library is about to send, in the browser and on the server: every text
// scrubbed at any depth (the library puts an error's message several levels down), every address made anonymous, our own ids left as they
// are, and, on the server, the lines of our own source code the Node library adds to each frame taken out (it has no setting to stop them).
export function scrubPostHogRecord(
  properties: Readonly<Record<string, Scrubbable>>,
  options: { readonly dropSourceContext: boolean },
): Record<string, Scrubbable> {
  return Object.fromEntries(
    Object.entries(properties).map(([name, value]) => {
      if (keptProperties.some((own) => own === name)) return [name, value];
      const scrubbed = scrubDeep(withAnonymousAddresses(value, name));
      return [
        name,
        options.dropSourceContext ? withoutSourceContext(scrubbed) : scrubbed,
      ];
    }),
  );
}
