# `@frostbite/media`

Pure structural validation of PNG, JPEG, and WebP bytes, and the cleaning of vector pictures (SVG), with no third-party dependencies
(ADR-004, D07, W3-04). It depends only on the shared contract types in `@frostbite/shared` and the strict drawing reader of `@frostbite/milestone-art`.

## Public API

`validateImage({ bytes, declaredMediaType, limits, svg })` returns either geometry, byte length and a
SHA-256, or a stable `AssetRejectionReason`. `mediaValidatorVersion` names this parser generation
(`structural-v1`) and is stored with every outcome. The package imports no storage, database, or
framework code and performs no I/O.

## Vector pictures (SVG)

A vector picture is a program, not pixels (it can carry script, link to files and addresses, and run animation), so it is **never kept or
shown as sent**. `@frostbite/media/svg` exports `prepareSvg(bytes, policy)`, used in two places that must agree: validation records the
size it will be drawn at and the hash of what was sent, and processing cleans the same bytes again before the decoder sees them.

1. `tidySvg` takes away what an editor adds and cannot matter: the XML header, comments, titles and descriptions, metadata, the markup of
   the common editors (`inkscape`, `sodipodi`, `rdf`, `cc`, `dc`, `sketch`, `x`), namespaced and `data-`/`class` attributes, `px` units on
   the root, and it turns a `style` attribute and a basic colour name into the attributes the strict reader takes. It only removes or
   rewrites, and a doctype, an entity, CDATA, or a comment that never ends is refused outright.
2. `sanitizeDrawing` (`@frostbite/milestone-art`) is the real gate: an allow-list of shapes, gradients, clip paths and groups, with every
   attribute value checked against a fixed shape, no text between elements, no entity, and references only to an id inside the picture.
   Anything else (script, text, image, link, `use`, style element, filter, animation, `foreignObject`) is **refused whole**, not repaired.
3. The text is written out again in one canonical form with `width` and `height` set so the longest side is `svg.rasterSide`, and only that
   is drawn, by the same decoder as every other picture, into the usual WebP thumbnail and preview. The uploaded file stays private and is
   never served.

Nothing the tidy step does can let something through: whatever it leaves is still judged by step 2, so a mistake there can refuse a good
picture but not accept a bad one. Limits (bytes, nesting, elements, attribute length, drawn size, and which uses accept SVG) are the
`svg` part of the upload policy in `@frostbite/shared/uploads`. The cleaner is also loaded by the worker under Node's type stripping, so it
and `@frostbite/milestone-art` use no constructor parameter properties or enums (guarded by a test that loads it that way).

**Known limits** (a picture with these is refused with "svg-unsupported"; the person is told to export it again with text turned into
outlines and nothing embedded): text, embedded images, filters, masks, patterns, `use`/`symbol`, stylesheets, and colour names beyond the
basic set. Gradients that inherit through `xlink:href` lose the inheritance (the link is dropped), which can change how they look.

## What is and is not validated

- The leading bytes decide the format; the declared type must then match (`media-type-mismatch`).
- PNG: every chunk and CRC, one IHDR first, IDAT present, one IEND, no trailing bytes, no APNG.
- JPEG: every marker segment, one baseline/extended/progressive Huffman frame, at least one scan,
  a final EOI, no trailing bytes. Lossless, arithmetic, and hierarchical frames are unsupported.
- WebP: RIFF size equals the file length and chunks tile it exactly; one VP8/VP8L image; an
  extended canvas must equal the coded image; animation is rejected.
- Width, height, and pixel count are checked against the typed limits, but only after the
  container is proven well formed. The limits apply to the dimensions the container _declares_: a
  header that lies about its pixel stream is still a well-formed container and is not detected
  here. The W3-05 decoder must reject any stream whose decoded size differs from the recorded size
  and enforce its own pixel limit while decoding.
- **Not validated:** the compressed pixel stream. A file can be a well-formed container whose
  pixels fail to decode. That is detected by the vetted decoder introduced with W3-05 thumbnails,
  which must treat a decode failure as a terminal rejection. Metadata (EXIF, ICC, XMP) is
  neither trusted nor stripped here; derivatives strip it.
- Bytes are fully buffered, bounded by the caller: the uploads activity caps each read at the
  declared size, itself capped by upload policy (at most 25 MB today). That bound is per run;
  nothing here limits concurrent runs, so the trigger that invokes the activity must.

## Processing port

`@frostbite/media/processing` defines `ImageProcessor` and its typed `media-processing:image-derivatives`
capability. It is the boundary between platform code and a decoder; the `sharp` implementation is the
provider adapter `@frostbite/provider-media-processing-sharp` (ADR-013). This package stays decoder-free.

## Invariants

Parsers are written to return a rejection rather than throw: every length is checked against the
buffer before it is used, and a seeded fuzz test (about 18,000 mutated and random inputs per run)
fails on any thrown error. Every rejection maps to one reason code. Limits and the reason
vocabulary come from `@frostbite/shared/uploads`; nothing is configured here.

## Tests

`test:unit` covers each parser with real encoder output (`test/fixtures`, see its README),
every-prefix truncation of each format, every-byte corruption of a PNG, and boundary limits.
`test:integration` feeds adversarial files (bomb headers, polyglots, spoofed types, out-of-scope formats) through the public
API under the real default policy. Platform engineering owns this package.

## Ownership

Platform engineering.
