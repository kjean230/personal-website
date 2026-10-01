import { describe, expect, it } from "vitest";
import Image, { alt, contentType, size } from "./opengraph-image";

// The route is prerendered at build, so a render failure would fail the build
// — but an image that renders *something* would not. This renders it for
// real (next/og's Node build: Satori, then resvg) and reads the PNG header:
// the file must be a PNG of the size the route declares in its metadata,
// with enough bytes to be more than an empty frame.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("app/opengraph-image.tsx", () => {
  it("declares a 1200 × 630 PNG with a text alternative", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    expect(alt).toBe("KJ monogram");
  });

  it("renders a PNG of exactly the declared size", async () => {
    const response = Image();
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 8)]).toEqual(PNG_SIGNATURE);
    // IHDR is the first chunk: width and height are big-endian u32 at 16 and 20.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(16)).toBe(size.width);
    expect(view.getUint32(20)).toBe(size.height);
    expect(bytes.byteLength).toBeGreaterThan(2048);
  }, 20_000);
});
