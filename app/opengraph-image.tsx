import { ImageResponse } from "next/og";
import { OG_BACKGROUND, OG_MARK_SRC } from "./og-mark";

// /opengraph-image — the one share image for every page (feat/recruiter-seo).
// Because it sits at the root of app/, every route inherits it, and Next
// fills twitter:image and `twitter:card = summary_large_image` from it, so no
// twitter-image route is needed. No page may set its own `openGraph` object:
// that replaces the inherited one wholesale and drops this image (see
// app/layout.tsx).
//
// Mark only, by the owner's choice: text would have to be set in the Geist
// face next/og bundles, which is not the identity's type (DESIGN.md), and the
// repo commits no font files. The card's own text line carries the page
// title.
//
// Rendering mode: no request-time API and no fetch, so it is prerendered at
// build (○) and served as a static file — the badge read in og-mark.ts never
// runs inside a deployed function. There is deliberately no `runtime` export:
// Node.js is the default in Next 16, and 'edge' is deprecated.

export const alt = "KJ monogram";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The badge's edge in the 1200 × 630 frame: large enough to read as a thumbnail, centred with margin. */
const BADGE_EDGE = 280;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: OG_BACKGROUND,
        }}
      >
        {/* Satori's image element, not page markup: the route's `alt` export
            is the image's text alternative. */}
        <img src={OG_MARK_SRC} width={BADGE_EDGE} height={BADGE_EDGE} alt="" />
      </div>
    ),
    size,
  );
}
