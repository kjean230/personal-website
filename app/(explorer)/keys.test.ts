import { describe, expect, it } from "vitest";
import { isBackKey, isSkipKey, nextIndex, type KeyLike } from "./keys";

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

// The "All Software" grid (feat/shell-tile-grid). 19 tiles in four columns is
// the real index on a wide screen: four full rows and a last row of three.
describe("nextIndex on a grid", () => {
  const TILES = 19;
  const COLUMNS = 4;
  const grid = (k: string, from: number, mods: Partial<KeyLike> = {}) =>
    nextIndex(key(k, mods), from, TILES, COLUMNS);

  it("moves a whole row on ArrowDown and ArrowUp", () => {
    expect(grid("ArrowDown", 1)).toBe(5);
    expect(grid("ArrowUp", 9)).toBe(5);
  });

  it("still steps in reading order on ArrowRight and ArrowLeft, across a row end", () => {
    expect(grid("ArrowRight", 3)).toBe(4);
    expect(grid("ArrowLeft", 4)).toBe(3);
    expect(grid("ArrowRight", TILES - 1)).toBe(0);
    expect(grid("ArrowLeft", 0)).toBe(TILES - 1);
  });

  // Row 3 is tiles 12–15 and the last row is 16–18: nothing sits under tile 15.
  it("lands on the last tile when the row below is too short to have that column", () => {
    expect(grid("ArrowDown", 14)).toBe(18);
    expect(grid("ArrowDown", 15)).toBe(18);
  });

  // null means "not ours": the island does not preventDefault, so the page
  // scrolls. A grid is longer than a screen, and wrapping would move the
  // visitor a page away from where they were looking.
  it("leaves ArrowUp on the top row and ArrowDown on the bottom row to the browser", () => {
    for (let i = 0; i < COLUMNS; i += 1) expect(grid("ArrowUp", i), `up from ${i}`).toBeNull();
    for (let i = 16; i < TILES; i += 1) expect(grid("ArrowDown", i), `down from ${i}`).toBeNull();
  });

  it("never leaves the grid, from any tile, on any key it handles", () => {
    for (let from = 0; from < TILES; from += 1) {
      for (const k of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"]) {
        const next = grid(k, from);
        if (next === null) continue;
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(TILES);
      }
    }
  });

  it("reaches every tile going down each column from the top row", () => {
    const seen = new Set<number>();
    for (let column = 0; column < COLUMNS; column += 1) {
      for (let at: number | null = column; at !== null; at = grid("ArrowDown", at)) seen.add(at);
    }
    expect(seen.size).toBe(TILES);
  });

  it("keeps Home, End and the modifier rule", () => {
    expect(grid("Home", 9)).toBe(0);
    expect(grid("End", 9)).toBe(TILES - 1);
    expect(grid("ArrowDown", 1, { altKey: true })).toBeNull();
  });

  // One column is the narrow-screen stack, and it is the row rule: both axes
  // step and wrap, exactly as the home row does.
  it("is the row rule when the grid is one column wide", () => {
    for (let from = 0; from < TILES; from += 1) {
      for (const k of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"]) {
        expect(nextIndex(key(k), from, TILES, 1)).toBe(nextIndex(key(k), from, TILES));
      }
    }
    expect(nextIndex(key("ArrowDown"), TILES - 1, TILES, 1)).toBe(0);
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

// Brief §5: the boot is "skippable". The island calls preventDefault on a
// skip, so what is *not* on this list matters as much as what is.
describe("isSkipKey", () => {
  it("skips on the keys a visitor reaches for", () => {
    for (const k of ["Enter", "Escape", "Tab", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      expect(isSkipKey(key(k)), k).toBe(true);
    }
  });

  it("skips on any printable key", () => {
    for (const k of ["a", "Z", "1", "/", "é"]) {
      expect(isSkipKey(key(k)), k).toBe(true);
    }
  });

  // F5 reloads, F11 is fullscreen, F12 opens the tools: swallowing one would
  // take a browser function away for the length of the boot.
  it("leaves function, lock and media keys to the browser", () => {
    for (const k of ["F5", "F11", "F12", "CapsLock", "MediaPlayPause", "PageDown", "Unidentified"]) {
      expect(isSkipKey(key(k)), k).toBe(false);
    }
  });

  it("ignores a modifier pressed on its own", () => {
    for (const k of ["Shift", "Control", "Alt", "Meta"]) {
      expect(isSkipKey(key(k)), k).toBe(false);
    }
  });

  // Cmd+R, Ctrl+L, Alt+ArrowLeft: every chord is the browser's or the OS's.
  it("never claims a modified chord", () => {
    for (const mod of ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const) {
      for (const k of ["r", "l", "Enter", "Escape", "Tab", "ArrowLeft"]) {
        expect(isSkipKey(key(k, { [mod]: true })), `${mod}+${k}`).toBe(false);
      }
    }
  });
});
