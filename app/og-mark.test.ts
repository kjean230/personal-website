import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import tokens from "../design/tokens/tokens.json";
import { OG_BACKGROUND, OG_MARK_SRC, resolveColorFallbacks } from "./og-mark";

// The share image cannot use CSS custom properties, so its colours are the
// badge's own `var(--color-*, #fallback)` fallbacks plus one value read from
// tokens.json. These tests are what keep that from becoming a second palette:
// every substituted colour must equal the light-theme token it stands in for.

const source = readFileSync(join(process.cwd(), "design/assets/mark/kj-badge.svg"), "utf8");
const svg = Buffer.from(OG_MARK_SRC.replace(/^data:image\/svg\+xml;base64,/, ""), "base64").toString("utf8");
const light: Record<string, string> = tokens.themes.light;

describe("app/og-mark.ts", () => {
  it("is a base64 SVG data URI of the badge", () => {
    expect(OG_MARK_SRC.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(svg).toContain("<svg");
    expect(svg).toBe(resolveColorFallbacks(source));
  });

  // Attribute values only: the file's own XML comment mentions var() in prose,
  // which the renderer ignores.
  it("leaves no custom-property reference in any attribute for the renderer to choke on", () => {
    const inAttributes = (text: string) => [...text.matchAll(/="[^"]*var\(/g)].length;
    expect(inAttributes(source)).toBeGreaterThan(0);
    expect(inAttributes(svg)).toBe(0);
  });

  it("substitutes exactly the light-theme value of each token the badge names", () => {
    const refs = [...source.matchAll(/var\((--color-[a-z0-9-]+),\s*(#[0-9A-Fa-f]{3,8})\)/g)];
    expect(refs.length).toBeGreaterThan(0);
    for (const [, token, fallback] of refs) {
      expect(light[token]?.toUpperCase()).toBe(fallback.toUpperCase());
      expect(svg).toContain(fallback);
    }
  });

  it("paints the background the light theme's surface", () => {
    expect(OG_BACKGROUND).toBe(light["--color-surface"]);
    expect(OG_BACKGROUND).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe("resolveColorFallbacks", () => {
  it("replaces every var(--color-*, #hex) and nothing else", () => {
    expect(
      resolveColorFallbacks('<g fill="var(--color-primary, #E8B11B)" stroke="var(--color-on-primary,#17160F)" x="var(--other, 1)"/>'),
    ).toBe('<g fill="#E8B11B" stroke="#17160F" x="var(--other, 1)"/>');
  });
});
