import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { JsonLd as JsonLdDocument } from "../lib/render/json-ld";
import { JsonLd } from "./json-ld";

// What a crawler actually receives: one ld+json script whose text parses back
// to the document, and no `<` inside it that the HTML parser could act on —
// asserted on React's real server output, not on the serializer alone.

const doc: JsonLdDocument = {
  "@context": "https://schema.org",
  "@type": "Thing",
  name: "</script><script>alert(1)</script> & more",
};
const html = renderToStaticMarkup(<JsonLd data={doc} />);

describe("app/json-ld.tsx", () => {
  it("renders exactly one application/ld+json script", () => {
    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(html.endsWith("</script>")).toBe(true);
  });

  it("carries text that parses back to the document and holds no <", () => {
    const body = html.slice('<script type="application/ld+json">'.length, -"</script>".length);
    expect(body).not.toContain("<");
    expect(JSON.parse(body)).toEqual(doc);
  });
});
