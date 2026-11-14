import { defaultUploadPolicy } from "@frostbite/shared/uploads";

import { prepareSvg, type PreparedSvg } from "../../src/svg.ts";

export const svgPolicy = defaultUploadPolicy.svg;
export const encode = (text: string) => new TextEncoder().encode(text);
export const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
export const prepare = (text: string, policy = svgPolicy): PreparedSvg =>
  prepareSvg(encode(text), policy);

const namespace = 'xmlns="http://www.w3.org/2000/svg"';

// What a design tool exports: presentation attributes, hex colours, nothing else.
export const figma = `<svg width="64" height="48" viewBox="0 0 64 48" fill="none" ${namespace}>
<rect width="64" height="48" fill="#1E90FF"/>
<circle cx="32" cy="24" r="10" fill="white"/>
</svg>`;

// What an editor that keeps its own state exports: a header, a comment, a title, its own namespaces and metadata, a layer name, and
// `style` attributes instead of presentation attributes.
export const inkscape = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape -->
<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ${namespace} width="100px" height="50px" viewBox="0 0 100 50" version="1.1" id="svg8">
  <title>logo</title>
  <metadata id="m"><rdf:RDF><cc:Work rdf:about=""/></rdf:RDF></metadata>
  <sodipodi:namedview id="base" pagecolor="#ffffff"/>
  <g inkscape:label="Layer 1" id="layer1">
    <rect id="rect1" x="10" y="10" width="30" height="20" style="fill:#ff0000;stroke:#000000;stroke-width:2"/>
  </g>
</svg>`;

// A picture with one thing added to it. Each of these must be refused whole, never repaired or passed on.
export const withBody = (body: string, root = "") =>
  `<svg ${namespace} viewBox="0 0 10 10"${root}>${body}</svg>`;
