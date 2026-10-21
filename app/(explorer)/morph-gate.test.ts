import { describe, expect, it } from "vitest";
import { MORPH_TRIGGERS, morphAllowed, parseTime, readTokens, tokenized, type MorphSupport } from "./morph-gate";
const support: MorphSupport = { api: true, names: true, classes: true, types: true, group: true, old: true, new: true, tokens: true };
const tokens = { ms: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
const timing = { duration: ".32s", easing: "cubic-bezier(.16,1,.3,1)", name: "morph" };

describe("fail-closed detail morph", () => {
  it("enables only the shared morph trigger", () => expect(MORPH_TRIGGERS).toEqual({ default: "none", share: "morph" }));
  it("requires Explorer and permits no boundary under reduced motion", () => {
    expect(morphAllowed(true, false, support)).toBe(true);
    expect(morphAllowed(false, false, support)).toBe(false);
    expect(morphAllowed(true, true, support)).toBe(false);
  });
  it.each(Object.keys(support) as (keyof MorphSupport)[])("fails closed without %s", key => {
    expect(morphAllowed(true, false, { ...support, [key]: false })).toBe(false);
  });
  it("reads production-minified and source timing as the same 320 ms", () => {
    expect(parseTime("320ms")).toBe(320); expect(parseTime(".32s")).toBe(320); expect(parseTime("auto")).toBe(null);
  });
  it("rejects missing tokens and reduced-motion zero durations", () => {
    expect(readTokens({ getPropertyValue: () => "" })).toBe(null);
    expect(readTokens({ getPropertyValue: key => key === "--duration-slow" ? "0ms" : tokens.easing })).toBe(null);
  });
  it("accepts only token timing with no page-root animation", () => {
    expect(tokenized([timing], [{ ...timing, name: "none" }], tokens)).toBe(true);
    expect(tokenized([{ ...timing, duration: "250ms" }], [], tokens)).toBe(false);
    expect(tokenized([{ ...timing, easing: "ease" }], [], tokens)).toBe(false);
    expect(tokenized([timing], [timing], tokens)).toBe(false);
  });
});
