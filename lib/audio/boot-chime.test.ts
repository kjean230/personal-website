import { describe, expect, it } from "vitest";
import { spec } from "./boot-chime";

// The numbers themselves are the composition (authoritative record:
// design/assets/chime/boot-chime.js). These tests pin the invariants the
// renderer and the identity depend on, so an accidental edit fails loudly.

describe("boot chime spec", () => {
  it("keeps both events inside the total duration", () => {
    const { thud, click, totalDurationMs } = spec;
    const thudEnd = thud.decayMs;
    const clickEnd =
      click.atMs + Math.max(click.noise.durationMs, click.ping.durationMs);
    expect(thudEnd).toBeLessThanOrEqual(totalDurationMs);
    expect(clickEnd).toBeLessThanOrEqual(totalDurationMs);
  });

  it("fits well inside the 1200ms boot (--duration-boot)", () => {
    expect(spec.totalDurationMs).toBeLessThanOrEqual(600);
  });

  it("thud falls in pitch and decays after its attack", () => {
    const { thud } = spec;
    expect(thud.startHz).toBeGreaterThan(thud.endHz);
    expect(thud.attackMs).toBeLessThan(thud.decayMs);
    expect(thud.glideMs).toBeLessThanOrEqual(thud.decayMs);
  });

  it("click lands after the thud attack and before the end", () => {
    const { click, thud, totalDurationMs } = spec;
    expect(click.atMs).toBeGreaterThan(thud.attackMs);
    expect(click.atMs).toBeLessThan(totalDurationMs);
  });

  it("keeps headroom: master at -6 dBFS-ish, every peak within (0, 1]", () => {
    expect(spec.masterGain).toBeLessThanOrEqual(0.5);
    for (const peak of [
      spec.thud.peak,
      spec.click.noise.peak,
      spec.click.ping.peak,
    ]) {
      expect(peak).toBeGreaterThan(0);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  it("matches the numbers in the design/ spec verbatim", () => {
    // Spot-pin the values that define the sound; the full record lives in
    // design/assets/chime/boot-chime.js and DESIGN.md.
    expect(spec.totalDurationMs).toBe(420);
    expect(spec.masterGain).toBe(0.5);
    expect(spec.thud).toMatchObject({ startHz: 90, endHz: 55, glideMs: 220 });
    expect(spec.click.atMs).toBe(170);
    expect(spec.click.noise).toMatchObject({ centerHz: 3200, q: 6 });
    expect(spec.click.ping).toMatchObject({ hz: 2600 });
  });
});
