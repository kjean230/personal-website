import { describe, expect, it } from "vitest";
import { NONE, activated, arrived, hasPanelContext, historyKeys, opensWithMorph, returnsWithMorph, traversed, type Opener, type Trail } from "./trail";

const opener: Opener = { href: "/projects/alpha", origin: null, morph: true };
const opening = activated(opener.href, "source", opener);
const keys = { current: "detail", previous: "source" };
const arrival = { detail: opener.href, explorer: true, keys, traversal: false };
const opened = arrived(opening, arrival).next;

describe("actual detail provenance", () => {
  it("an actual activation becomes one bounded panel context", () => {
    expect(opened).toMatchObject({ phase: "opened", fromKey: "source", detailKey: "detail", opener });
    expect(hasPanelContext(opened, opener.href, keys)).toBe(true);
    expect(arrived(opening, arrival).focus).toEqual({ kind: "title" });
  });
  it.each([NONE, { phase: "traversing" } as Trail])("direct/reload or unexplained arrival creates no opener: %j", trail => {
    expect(arrived(trail, arrival).next).toEqual(NONE);
    expect(hasPanelContext(trail, opener.href, keys)).toBe(false);
  });
  it.each([
    { current: "detail", previous: "other" },
    { current: "other", previous: "source" },
    { current: null, previous: null },
  ])("stale/missing history fails closed: %j", stale => {
    expect(hasPanelContext(opened, opener.href, stale)).toBe(false);
  });
  it("an opener without history identity cannot enable the panel or morph", () => {
    const unknown = activated(opener.href, null, opener);
    expect(arrived(unknown, arrival).next).toEqual(NONE);
    expect(opensWithMorph(unknown, opener.href, keys)).toBe(false);
  });
  it("an activation arriving elsewhere is discarded", () => {
    expect(arrived(opening, { ...arrival, detail: "/projects/beta" }).next).toEqual(NONE);
  });
  it("a stale activation with a different prior entry is discarded", () => {
    expect(arrived(opening, { ...arrival, keys: { current: "detail", previous: "other" } }).next).toEqual(NONE);
  });
  it("Recruiter never establishes or retains panel state", () => {
    expect(arrived(opening, { ...arrival, explorer: false })).toEqual({ next: NONE, focus: null });
  });
  it("return focus names the exact recorded opener and consumes provenance", () => {
    const result = arrived(traversed(opened), { ...arrival, detail: null, keys: { current: "source", previous: "older" }, traversal: true });
    expect(result).toEqual({ next: NONE, focus: { kind: "opener", opener, orTitle: false } });
  });
  it("navigating up never fabricates the section row as an opener", () => {
    expect(arrived(opened, { ...arrival, detail: null, keys: { current: "section", previous: "detail" } })).toEqual({ next: NONE, focus: null });
  });
  it("Related rows preserve their exact relation identity without morph", () => {
    const related = { ...opener, origin: "outgoing:part_of:alpha", morph: false };
    const trail = activated(opener.href, "source", related);
    expect(opensWithMorph(trail, opener.href, keys)).toBe(false);
    expect(arrived(trail, arrival).next).toMatchObject({ opener: related });
  });
  it("only a recorded morph opener can share on opening", () => {
    expect(opensWithMorph(opening, opener.href, keys)).toBe(true);
    expect(opensWithMorph(opening, "/projects/beta", keys)).toBe(false);
    expect(opensWithMorph(NONE, opener.href, keys)).toBe(false);
  });
  it("only returning to the recorded history entry can reverse a morph", () => {
    expect(returnsWithMorph(opened, "source")).toBe(true);
    expect(returnsWithMorph(opened, "other")).toBe(false);
    expect(returnsWithMorph(opened, null)).toBe(false);
  });
  it("unsupported Navigation API returns no invented keys", () => {
    expect(historyKeys({})).toEqual({ current: null, previous: null, previousUrl: undefined });
  });
});
