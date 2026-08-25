import { describe, expect, it } from "vitest";
import { deterministicId } from "./uuid.mjs";

const V5_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("deterministicId", () => {
  it("is a lower-case version-5-shaped UUID", () => {
    expect(deterministicId("linkedin|Positions.csv|Acme|Engineer|May 2026")).toMatch(V5_SHAPE);
  });

  it("is stable for the same name and distinct for different names", () => {
    const a = deterministicId("x");
    expect(deterministicId("x")).toBe(a);
    expect(deterministicId("y")).not.toBe(a);
    expect(deterministicId("X")).not.toBe(a);
  });

  it("never lands in the fixture's fixed-id range", () => {
    expect(deterministicId("anything")).not.toMatch(/^00000000-0000-4000-8000-/);
  });
});
