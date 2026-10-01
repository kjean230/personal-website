// Relative, not the `@/` alias: this file has a test beside it and Vitest
// resolves no tsconfig paths.
import { serializeJsonLd, type JsonLd as JsonLdDocument } from "../lib/render/json-ld";

// The one element in the tree that writes a JSON-LD script. The body is
// produced by lib/render/json-ld.ts, which escapes every `<`, so nothing here
// can be handed raw text. A server component: structured data is part of the
// server-rendered HTML, reaches a crawler with JavaScript off, and adds no
// client code.

/** @returns a `<script type="application/ld+json">` carrying `data`. */
export function JsonLd({ data }: { data: JsonLdDocument }) {
  return (
    <script
      type="application/ld+json"
      // Built from an object and escaped by serializeJsonLd — never hand-written.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
