import { describe, expect, it } from "vitest";
import {
  BOOT_DIALOG_ID,
  BOOT_KEY,
  BOOT_SCRIPT,
  DEFAULT_MODE,
  MODES,
  MODE_KEY,
  MODE_SCRIPT,
  claimBoot,
  isExplorer,
  parseMode,
  recordMode,
  type BootStorage,
} from "./boot";

// The boot and profile-select contract (feat/shell-boot-profile), as far as it
// can be reasoned about without a browser: once per session, a session-only
// record of the chosen mode, and Recruiter for every path that never chooses.
// The motion, the focus hand-over and the dialog itself are covered by the
// browser walk-through in the handoff.

/** An in-memory `sessionStorage`: one of these is one browser-tab session. */
function session(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: BootStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
  return { storage, data };
}

/** What a browser with site data blocked does: the property read itself throws. */
const blocked = (): BootStorage => {
  throw new Error("SecurityError");
};

/**
 * Runs an inline script the way a page would, against stand-ins for the two
 * globals it touches. `sessionStorage` is a getter so "blocked" can throw on
 * the read, which is how it fails in a real browser.
 */
function run(script: string, storage: () => BootStorage) {
  const opened: string[] = [];
  const root = { dataset: {} as Record<string, string> };
  const scope = {
    get sessionStorage() {
      return storage();
    },
    document: {
      documentElement: root,
      getElementById: (id: string) => ({ showModal: () => void opened.push(id) }),
    },
  };
  new Function("scope", `with(scope){${script}}`)(scope);
  return { opened, mode: root.dataset.mode };
}

describe("MODES", () => {
  // Brief §1: Recruiter is the default. It is also drawn first, so it is the
  // choice focus lands on when the profile select appears.
  it("is the brief's two renderers, default first", () => {
    expect(MODES).toEqual(["recruiter", "explorer"]);
    expect(DEFAULT_MODE).toBe(MODES[0]);
  });
});

describe("parseMode", () => {
  it("accepts each mode", () => {
    for (const mode of MODES) expect(parseMode(mode)).toBe(mode);
  });

  // A dialog cancelled with Escape has returnValue "", and storage can hold
  // anything a visitor or an older build put there.
  it("treats everything else as no mode", () => {
    for (const value of ["", "Explorer", "admin", " recruiter", null, undefined, 1, {}]) {
      expect(parseMode(value), String(value)).toBeNull();
    }
  });
});

// feat/shell-tile-grid: the one place script reads the mode back. It decides
// whether the index grid takes the arrow keys, so every path that never chose
// Explorer has to read as Recruiter here, as it does in the stylesheets.
describe("isExplorer", () => {
  const root = (mode?: string) => ({ dataset: (mode === undefined ? {} : { mode }) as DOMStringMap });

  it("is true for data-mode=\"explorer\" and for nothing else in MODES", () => {
    expect(isExplorer(root("explorer"))).toBe(true);
    expect(isExplorer(root("recruiter"))).toBe(false);
  });

  it("is false with no attribute — JavaScript off, a deep link, a session that never chose", () => {
    expect(isExplorer(root())).toBe(false);
  });

  it("is false for a value outside MODES", () => {
    for (const value of ["", "Explorer", "EXPLORER", " explorer", "explorer ", "console", "true"]) {
      expect(isExplorer(root(value)), JSON.stringify(value)).toBe(false);
    }
  });

  it("agrees with recordMode", () => {
    for (const mode of MODES) {
      const element = { dataset: {} as DOMStringMap };
      recordMode(mode, session().storage, element);
      expect(isExplorer(element)).toBe(mode === "explorer");
    }
  });
});

describe("claimBoot", () => {
  it("is true on a session's first call and records the claim", () => {
    const { storage, data } = session();
    expect(claimBoot(() => storage)).toBe(true);
    expect(data.get(BOOT_KEY)).toBe("1");
  });

  it("is false for the rest of that session", () => {
    const { storage } = session();
    claimBoot(() => storage);
    expect(claimBoot(() => storage)).toBe(false);
    expect(claimBoot(() => storage)).toBe(false);
  });

  it("is true again in a new session", () => {
    claimBoot(() => session().storage);
    expect(claimBoot(() => session().storage)).toBe(true);
  });

  // No storage means no way to remember the boot ran, and a boot on every
  // visit would break "once per session" — so there is none.
  it("is false, and does not throw, when storage is blocked", () => {
    expect(claimBoot(blocked)).toBe(false);
  });

  it("is false when the claim cannot be written", () => {
    const storage: BootStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(claimBoot(() => storage)).toBe(false);
  });
});

describe("recordMode", () => {
  it("stores the mode for the session and exposes it on the root element", () => {
    for (const mode of MODES) {
      const { storage, data } = session();
      const root = { dataset: {} as DOMStringMap };
      recordMode(mode, storage, root);
      expect(data.get(MODE_KEY)).toBe(mode);
      expect(root.dataset.mode).toBe(mode);
    }
  });

  it("does not touch the boot claim", () => {
    const { storage, data } = session({ [BOOT_KEY]: "1" });
    recordMode("explorer", storage, { dataset: {} as DOMStringMap });
    expect(data.get(BOOT_KEY)).toBe("1");
  });
});

describe("BOOT_SCRIPT", () => {
  it("opens the boot dialog on a session's first load of the home page", () => {
    const { storage, data } = session();
    expect(run(BOOT_SCRIPT, () => storage).opened).toEqual([BOOT_DIALOG_ID]);
    expect(data.get(BOOT_KEY)).toBe("1");
  });

  it("opens nothing on a later load in the same session", () => {
    const { storage } = session();
    run(BOOT_SCRIPT, () => storage);
    expect(run(BOOT_SCRIPT, () => storage).opened).toEqual([]);
  });

  it("opens nothing, and does not throw, when storage is blocked", () => {
    expect(run(BOOT_SCRIPT, blocked).opened).toEqual([]);
  });

  // The script runs on a full page load and the island's claim on a soft
  // navigation. They are two spellings of one rule, and a session must get one
  // boot whichever of them sees it first.
  it("shares its claim with claimBoot, in either order", () => {
    const first = session();
    run(BOOT_SCRIPT, () => first.storage);
    expect(claimBoot(() => first.storage)).toBe(false);

    const second = session();
    claimBoot(() => second.storage);
    expect(run(BOOT_SCRIPT, () => second.storage).opened).toEqual([]);
  });

  it("does not read or set the mode", () => {
    const { storage, data } = session();
    expect(run(BOOT_SCRIPT, () => storage).mode).toBeUndefined();
    expect(data.has(MODE_KEY)).toBe(false);
  });
});

describe("MODE_SCRIPT", () => {
  it("re-applies a recorded mode to the root element", () => {
    for (const mode of MODES) {
      const { storage } = session({ [MODE_KEY]: mode });
      expect(run(MODE_SCRIPT, () => storage).mode).toBe(mode);
    }
  });

  // No attribute is Recruiter, the default: a session that never chose —
  // every deep link — has nothing set.
  it("sets nothing when no mode was recorded", () => {
    expect(run(MODE_SCRIPT, () => session().storage).mode).toBeUndefined();
  });

  it("sets nothing for a value outside MODES", () => {
    for (const value of ["", "admin", "Explorer", '"><script>']) {
      const { storage } = session({ [MODE_KEY]: value });
      expect(run(MODE_SCRIPT, () => storage).mode, value).toBeUndefined();
    }
  });

  it("agrees with recordMode and parseMode", () => {
    for (const mode of MODES) {
      const { storage } = session();
      recordMode(mode, storage, { dataset: {} as DOMStringMap });
      expect(parseMode(run(MODE_SCRIPT, () => storage).mode)).toBe(mode);
    }
  });

  it("sets nothing, and does not throw, when storage is blocked", () => {
    expect(run(MODE_SCRIPT, blocked).mode).toBeUndefined();
  });

  it("opens nothing", () => {
    const { storage } = session();
    expect(run(MODE_SCRIPT, () => storage).opened).toEqual([]);
  });
});

// Both strings are written into a <script> element as raw text. They are
// constants, so the risk is not injection but a future edit that puts a `<`
// in one and lets `</script` or `<!--` end the element early.
describe("the inline scripts as raw text", () => {
  it("contain no character that could close the script element", () => {
    for (const script of [BOOT_SCRIPT, MODE_SCRIPT]) {
      expect(script).not.toContain("<");
    }
  });

  it("declare no global", () => {
    for (const script of [BOOT_SCRIPT, MODE_SCRIPT]) {
      expect(script).not.toMatch(/\bvar\b/);
      expect(script.startsWith("try{")).toBe(true);
    }
  });
});
