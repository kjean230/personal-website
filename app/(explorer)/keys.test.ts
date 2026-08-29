import { describe, expect, it } from "vitest";
import { isBackKey, nextIndex, type KeyLike } from "./keys";

// The shell's key rules (brief §2.2: "arrows navigate, Enter = A, Escape = B,
// roving tabindex"). The DOM wiring lives in the two islands and is covered by
// the keyboard walk-through in the handoff; this is the part that can be
// reasoned about without a browser, so this is where the rules are pinned.

const COUNT = 6; // the six brief §4.3 sections
const key = (k: string, mods: Partial<KeyLike> = {}): KeyLike => ({ key: k, ...mods });

describe("nextIndex", () => {
  it("steps forward on ArrowRight and ArrowDown", () => {
    expect(nextIndex(key("ArrowRight"), 0, COUNT)).toBe(1);
    expect(nextIndex(key("ArrowDown"), 0, COUNT)).toBe(1);
  });

  it("steps back on ArrowLeft and ArrowUp", () => {
    expect(nextIndex(key("ArrowLeft"), 3, COUNT)).toBe(2);
    expect(nextIndex(key("ArrowUp"), 3, COUNT)).toBe(2);
  });

  // Both axes move, because the same row is horizontal on a wide viewport and
  // a vertical stack on a narrow one (brief §5.2).
  it("treats the two axes identically", () => {
    for (let i = 0; i < COUNT; i += 1) {
      expect(nextIndex(key("ArrowDown"), i, COUNT)).toBe(nextIndex(key("ArrowRight"), i, COUNT));
      expect(nextIndex(key("ArrowUp"), i, COUNT)).toBe(nextIndex(key("ArrowLeft"), i, COUNT));
    }
  });

  it("wraps at both ends", () => {
    expect(nextIndex(key("ArrowRight"), COUNT - 1, COUNT)).toBe(0);
    expect(nextIndex(key("ArrowLeft"), 0, COUNT)).toBe(COUNT - 1);
  });

  it("jumps to the ends on Home and End", () => {
    expect(nextIndex(key("Home"), 4, COUNT)).toBe(0);
    expect(nextIndex(key("End"), 1, COUNT)).toBe(COUNT - 1);
  });

  // Alt+ArrowLeft, and Cmd+ArrowLeft on macOS, is browser back. Swallowing a
  // modified arrow would break history navigation for keyboard visitors.
  it("never claims a modified arrow", () => {
    for (const mod of ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const) {
      for (const k of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]) {
        expect(nextIndex(key(k, { [mod]: true }), 2, COUNT), `${mod}+${k}`).toBeNull();
      }
    }
  });

  // Anything else is left to the browser — Tab must still leave the row (no
  // trap) and Enter must still follow the link (Enter = A, natively).
  it("returns null for keys the row does not handle", () => {
    for (const k of ["Tab", "Enter", "Escape", " ", "a", "PageDown"]) {
      expect(nextIndex(key(k), 0, COUNT)).toBeNull();
    }
  });

  it("returns null for an empty row", () => {
    expect(nextIndex(key("ArrowRight"), 0, 0)).toBeNull();
    expect(nextIndex(key("Home"), -1, 0)).toBeNull();
  });

  it("stays in range from an out-of-range current index", () => {
    for (const current of [-1, COUNT, 99]) {
      for (const k of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
        const next = nextIndex(key(k), current, COUNT);
        expect(next).not.toBeNull();
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(COUNT);
      }
    }
  });

  it("walks every tile and returns to the start", () => {
    let index = 0;
    for (let step = 0; step < COUNT; step += 1) {
      index = nextIndex(key("ArrowRight"), index, COUNT) as number;
    }
    expect(index).toBe(0);
  });
});

describe("isBackKey", () => {
  it("claims a bare Escape", () => {
    expect(isBackKey({ key: "Escape" }, false)).toBe(true);
  });

  it("ignores every other key", () => {
    for (const k of ["Enter", "Backspace", "ArrowLeft", "b", "Esc"]) {
      expect(isBackKey({ key: k }, false), k).toBe(false);
    }
  });

  it("ignores a modified Escape", () => {
    for (const mod of ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const) {
      expect(isBackKey({ key: "Escape", [mod]: true }, false), mod).toBe(false);
    }
  });

  // Escape cancels an IME composition, and a handler that already ran owns it.
  it("ignores a composing or already-handled Escape", () => {
    expect(isBackKey({ key: "Escape", isComposing: true }, false)).toBe(false);
    expect(isBackKey({ key: "Escape", defaultPrevented: true }, false)).toBe(false);
  });

  it("leaves Escape to a field or dialog that owns it", () => {
    expect(isBackKey({ key: "Escape" }, true)).toBe(false);
  });
});
