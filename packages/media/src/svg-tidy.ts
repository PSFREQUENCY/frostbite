// A vector picture as an editor saves it carries things that cannot matter to how it looks: an XML header, comments, a title, the
// editor's own markup and attributes, a `style` attribute that says what the attributes already could. This takes those away, and
// only takes away or rewrites: what is left is still judged by the strict reader (`@frostbite/milestone-art`), which refuses anything
// it does not know. So a mistake here can refuse a good picture, but it cannot let a bad one through.

const commentPattern = /<!--[\s\S]*?-->/gu;
const declarationPattern = /^\s*<\?xml\s[^>]*\?>/u;
// Elements that are only about the file: the title, the description, the metadata, and what the common editors put under their own
// namespace. An element under any other prefix is not dropped, so the strict reader refuses it. Self-closed ones go first, so a block
// pattern never starts at one and runs on into its neighbours.
const editorPrefixes = "(?:cc|dc|inkscape|rdf|sketch|sodipodi|x)";
const droppedNames = `(?:title|desc|metadata|${editorPrefixes}:[\\w.-]+)`;
const droppedSelfClosed = new RegExp(
  `<${droppedNames}(?=[\\s/>])[^>]*/>`,
  "gu",
);
const droppedBlocks = [
  /<(title|desc|metadata)(?=[\s>])[^>]*>[\s\S]*?<\/\1\s*>/gu,
  new RegExp(
    `<(${editorPrefixes}:[\\w.-]+)(?=[\\s>])[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
    "gu",
  ),
];
const startTag =
  /<([A-Za-z][\w.-]*)((?:\s+[^\s=/>"']+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/gu;
const attributePattern = /\s+([^\s=/>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu;
const pixels = /^\s*(-?\d+(?:\.\d+)?)\s*px\s*$/u;

// Attributes that only an editor or a stylesheet would read; with no stylesheet allowed, they mean nothing.
const droppedAttributes: ReadonlySet<string> = new Set([
  "baseProfile",
  "class",
  "enable-background",
  "version",
]);

// The colour names an editor writes instead of a hex colour (the basic set of CSS), so a picture is not refused for saying `white`. The
// strict reader takes hex colours only.
const colourNames: ReadonlyMap<string, string> = new Map(
  Object.entries({
    aqua: "#00ffff",
    black: "#000000",
    blue: "#0000ff",
    cyan: "#00ffff",
    fuchsia: "#ff00ff",
    gray: "#808080",
    green: "#008000",
    grey: "#808080",
    lime: "#00ff00",
    magenta: "#ff00ff",
    maroon: "#800000",
    navy: "#000080",
    olive: "#808000",
    orange: "#ffa500",
    purple: "#800080",
    red: "#ff0000",
    silver: "#c0c0c0",
    teal: "#008080",
    white: "#ffffff",
    yellow: "#ffff00",
  }),
);
const colourAttributes: ReadonlySet<string> = new Set([
  "fill",
  "stop-color",
  "stroke",
]);

export type Attributes = readonly (readonly [string, string])[];

export function readAttributes(text: string): Attributes {
  return [...text.matchAll(attributePattern)].map(
    ([, name = "", double, single]) => [name, double ?? single ?? ""] as const,
  );
}

// `fill:#fff; stroke:none` as the attributes `fill` and `stroke`. A declaration that is not `name: value` is left as the `style`
// attribute, which the strict reader does not know and refuses.
function declared(style: string): Attributes | null {
  const result: (readonly [string, string])[] = [];
  for (const declaration of style.split(";")) {
    if (declaration.trim() === "") continue;
    const colon = declaration.indexOf(":");
    if (colon < 1) return null;
    result.push([
      declaration.slice(0, colon).trim(),
      declaration.slice(colon + 1).trim(),
    ]);
  }
  return result;
}

function rewriteAttributes(name: string, attributes: Attributes): Attributes {
  const kept = new Map<string, string>();
  for (const [attribute, value] of attributes) {
    if (attribute === "xmlns") kept.set(attribute, value);
    else if (attribute.includes(":")) continue;
    else if (droppedAttributes.has(attribute) || attribute.startsWith("data-"))
      continue;
    else if (attribute === "style") {
      const parts = declared(value);
      if (parts === null) kept.set(attribute, value);
      else for (const [property, setting] of parts) kept.set(property, setting);
    } else kept.set(attribute, value);
  }
  for (const attribute of colourAttributes) {
    const named = colourNames.get((kept.get(attribute) ?? "").toLowerCase());
    if (named !== undefined) kept.set(attribute, named);
  }
  if (name === "svg") {
    for (const side of ["width", "height"]) {
      const match = pixels.exec(kept.get(side) ?? "");
      if (match?.[1] !== undefined) kept.set(side, match[1]);
    }
  }
  return [...kept];
}

// Returns the text the strict reader is to judge, or null when the file has something that is refused outright: a doctype, an entity,
// CDATA, or a comment that never ends.
export function tidySvg(source: string): string | null {
  const byteOrderMark = String.fromCodePoint(0xfeff);
  let text = source.startsWith(byteOrderMark) ? source.slice(1) : source;
  if (/<!(?!--)/u.test(text)) return null;
  text = text.replace(commentPattern, "");
  if (text.includes("<!--")) return null;
  text = text.replace(declarationPattern, "").replace(droppedSelfClosed, "");
  for (const pattern of droppedBlocks) text = text.replace(pattern, "");
  return text.replace(
    startTag,
    (_whole, name: string, attributes: string, closing: string) => {
      const written = rewriteAttributes(name, readAttributes(attributes))
        .map(([attribute, value]) => ` ${attribute}="${value}"`)
        .join("");
      return `<${name}${written}${closing}>`;
    },
  );
}
