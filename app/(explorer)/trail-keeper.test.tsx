import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrailKeeper } from "./trail-keeper";
import { NONE, readTrail, writeTrail } from "./trail";

// Execute the production island's effects with a small browser adapter. The
// click recorder, state machine, resolver and focus application are unmocked.
const effects = vi.hoisted(() => ({ cleanups: [] as (() => void)[] }));
vi.mock("react", () => ({
  useLayoutEffect: (effect: () => void) => effect(),
  useEffect: (effect: () => (() => void)) => effects.cleanups.push(effect()),
}));

const origin = "https://example.test";
const target = "/projects/alpha";
let links: Link[];
let active: Link | "title" | null;
let panel: boolean;
let location: URL;
let click: (event: object) => void;
let popstate: () => void;
let current: string;
let previous: string;
let traversal: boolean;
function focusLink(link: Link) { active = link; }
const title = { focus: vi.fn(() => { active = "title"; }) };
const main = { querySelectorAll: () => links.filter(link => link.inMain) };

// Only DOM primitives are adapted here: URL parsing, containment and focus.
// No opener authorization or matching rule is implemented by this fixture.
class Link extends URL {
  dataset: { detailOpener?: string; origin?: string } = {};
  inMain = true;
  inMorph = false;
  inRelated = false;
  target = "";
  constructor(href = target) { super(href, origin); }
  closest(selector: string): unknown {
    switch (selector) {
      case "a[href]": return this;
      case "#main": return this.inMain ? main : null;
      case "[data-morph]": return this.inMorph ? this : null;
      case "nav[aria-label='Related']": return this.inRelated ? this : null;
      default: return null;
    }
  }
  hasAttribute() { return false; }
  focus = vi.fn(() => { focusLink(this); });
  scrollIntoView = vi.fn();
}

const surfaces = [
  { name: "/all card", path: "/all?facet=research", marker: "morph", morph: true, relation: undefined },
  { name: "section row", path: "/projects", marker: "morph", morph: true, relation: undefined },
  { name: "Related row", path: "/experience/source", marker: "related", morph: false, relation: "outgoing:part_of:alpha" },
  { name: "resume title", path: "/resume", marker: "resume", morph: false, relation: undefined },
] as const;
type Surface = typeof surfaces[number];

function marked(surface: Surface): Link {
  const link = new Link();
  link.dataset = { detailOpener: surface.marker, origin: surface.relation };
  link.inMorph = surface.morph;
  link.inRelated = surface.marker === "related";
  return link;
}

async function render(detail?: string) {
  TrailKeeper({ detail });
  await Promise.resolve(); // The production queueMicrotask applies focus.
}

async function open(surface: Surface) {
  location = new URL(surface.path, origin);
  vi.stubGlobal("location", location);
  const original = marked(surface);
  links = [original];
  await render(surface.marker === "related" ? location.pathname : undefined);
  click({ target: original, button: 0 });
  expect(readTrail()).toMatchObject({ phase: "opening", opener: { href: target, origin: surface.relation ?? null, morph: surface.morph } });
  current = "detail";
  previous = "source";
  vi.stubGlobal("location", new URL(target, origin));
  await render(target);
  expect(panel).toBe(true);
  expect(active).toBe("title");
  active = null;
  title.focus.mockClear();
  return original;
}

async function back(surface: Surface) {
  current = "source";
  previous = "older";
  traversal = true;
  vi.stubGlobal("location", new URL(surface.path, origin));
  popstate();
  await render(surface.marker === "related" ? new URL(surface.path, origin).pathname : undefined);
  expect(readTrail()).toEqual(NONE);
}

beforeEach(() => {
  writeTrail(NONE);
  links = [];
  active = null;
  panel = false;
  current = "source";
  previous = "older";
  traversal = false;
  title.focus.mockClear();
  vi.stubGlobal("document", {
    documentElement: { dataset: { mode: "explorer" } },
    getElementById: () => main,
    querySelector: (selector: string) => selector === "[data-detail-title]" ? title : { toggleAttribute: (_: string, enabled: boolean) => { panel = enabled; } },
    addEventListener: (_: string, listener: typeof click) => { click = listener; },
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("window", {
    get event() { return traversal ? { type: "popstate" } : undefined; },
    navigation: {
      get currentEntry() { return { key: current, index: 1, url: null }; },
      entries: () => [{ key: previous, index: 0, url: null }],
    },
    addEventListener: (_: string, listener: typeof popstate) => { popstate = listener; },
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  effects.cleanups.splice(0).forEach(cleanup => cleanup());
  vi.unstubAllGlobals();
  writeTrail(NONE);
});

describe.each(surfaces)("exact opener: $name", surface => {
  it("restores the original marked opener, ignoring an unmarked same-destination link", async () => {
    const original = await open(surface);
    const substitute = new Link();
    links.push(substitute);
    await back(surface);
    expect(active).toBe(original);
    expect(original.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(original.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest", behavior: "instant" });
    expect(substitute.focus).not.toHaveBeenCalled();
  });

  it("rejects an unmarked substitute when the original opener disappears", async () => {
    const original = await open(surface);
    const substitute = new Link();
    // Even a copied relation identity is not authorization without the marker.
    substitute.dataset.origin = surface.relation;
    links = [substitute];
    await back(surface);
    expect(substitute.focus).not.toHaveBeenCalled();
    expect(original.focus).not.toHaveBeenCalled();
    expect(active).toBe(surface.marker === "related" ? "title" : null);
  });

  it("rejects multiple matching marked openers", async () => {
    const original = await open(surface);
    const duplicate = marked(surface);
    links = [original, duplicate];
    await back(surface);
    expect(original.focus).not.toHaveBeenCalled();
    expect(duplicate.focus).not.toHaveBeenCalled();
    expect(active).toBe(surface.marker === "related" ? "title" : null);
  });

  it("rejects the right marker outside its permitted container", async () => {
    const original = await open(surface);
    original.inMorph = false;
    original.inRelated = false;
    if (surface.marker === "resume") original.inMain = false;
    await back(surface);
    expect(original.focus).not.toHaveBeenCalled();
  });
});

describe("opener identity boundaries", () => {
  it("rejects a different Related relation to the same detail", async () => {
    const surface = surfaces[2];
    const original = await open(surface);
    original.dataset.origin = "incoming:related_to:alpha";
    await back(surface);
    expect(original.focus).not.toHaveBeenCalled();
    expect(active).toBe("title");
  });

  it("rejects a different marked surface to the same detail", async () => {
    await open(surfaces[3]);
    const substitute = marked(surfaces[0]);
    links = [substitute];
    await back(surfaces[3]);
    expect(substitute.focus).not.toHaveBeenCalled();
  });

  it.each(["?other=1", "#other"])("rejects changed destination suffix %s", async suffix => {
    const original = await open(surfaces[0]);
    original.href = origin + target + suffix;
    await back(surfaces[0]);
    expect(original.focus).not.toHaveBeenCalled();
  });

  it.each(["direct", "reload"])("%s detail has ordinary page behavior without provenance", async navigation => {
    if (navigation === "reload") {
      await open(surfaces[0]);
      writeTrail(NONE); // A fresh document starts with the module's NONE state.
      active = null;
    }
    vi.stubGlobal("location", new URL(target, origin));
    current = "detail";
    previous = "source";
    await render(target);
    expect(panel).toBe(false);
    expect(active).toBeNull();
    expect(readTrail()).toEqual(NONE);
  });

  it("unmarked navigation cannot fabricate provenance", async () => {
    vi.stubGlobal("location", new URL("/resume", origin));
    await render();
    click({ target: new Link(), button: 0 });
    expect(readTrail()).toEqual(NONE);
  });
});
