import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTENT_REVALIDATE_SECONDS,
  CONTENT_TAG,
  contentTagsFor,
  createAnonClient,
  withContentCache,
} from "./client";

// Pins the caching contract lib/content relies on: which requests carry
// Next's `next.revalidate` / `next.tags`, that the request itself is passed
// through unchanged, and that the runtime `globalThis.fetch` — the one Next
// patches — is what actually sends. No network: every transport is a spy.

const ok = () => Promise.resolve(new Response("[]", { status: 200 }));

function lastInit(spy: ReturnType<typeof vi.fn>): RequestInit & { next?: unknown } {
  return spy.mock.calls[spy.mock.calls.length - 1][1] as RequestInit;
}

describe("content cache tags", () => {
  it("tags a Data API request with the content tag and its table", () => {
    expect(contentTagsFor("https://x.supabase.co/rest/v1/entries?select=id")).toEqual([
      CONTENT_TAG,
      "content:entries",
    ]);
    expect(contentTagsFor("https://x.supabase.co/rest/v1/entry_relations?or=(a,b)")).toEqual([
      CONTENT_TAG,
      "content:entry_relations",
    ]);
  });

  it("falls back to the global tag when the path is not a Data API table", () => {
    expect(contentTagsFor("https://x.supabase.co/storage/v1/object/x")).toEqual([CONTENT_TAG]);
  });
});

describe("withContentCache", () => {
  it("adds next.revalidate and next.tags to GET requests and keeps the init", async () => {
    const transport = vi.fn(ok);
    const headers = new Headers({ apikey: "k", Authorization: "Bearer k" });
    const signal = new AbortController().signal;
    await withContentCache(transport)("https://x.supabase.co/rest/v1/entries?select=id", {
      method: "GET",
      headers,
      signal,
    });
    const init = lastInit(transport);
    expect(init.next).toEqual({
      revalidate: CONTENT_REVALIDATE_SECONDS,
      tags: [CONTENT_TAG, "content:entries"],
    });
    expect(init.headers).toBe(headers);
    expect(init.signal).toBe(signal);
    expect(init.method).toBe("GET");
    expect(init.cache).toBeUndefined();
  });

  it("treats a missing method as GET", async () => {
    const transport = vi.fn(ok);
    await withContentCache(transport)("https://x.supabase.co/rest/v1/tags");
    expect(lastInit(transport).next).toEqual({
      revalidate: CONTENT_REVALIDATE_SECONDS,
      tags: [CONTENT_TAG, "content:tags"],
    });
  });

  it("never caches a write", async () => {
    const transport = vi.fn(ok);
    await withContentCache(transport)("https://x.supabase.co/rest/v1/reactions", {
      method: "POST",
      body: "{}",
    });
    const init = lastInit(transport);
    expect(init.next).toBeUndefined();
    expect(init.body).toBe("{}");
  });

  it("resolves globalThis.fetch at call time, not at wrap time", async () => {
    const original = globalThis.fetch;
    const wrapped = withContentCache();
    const patched = vi.fn(ok);
    globalThis.fetch = patched as unknown as typeof fetch;
    try {
      await wrapped("https://x.supabase.co/rest/v1/entries");
      expect(patched).toHaveBeenCalledTimes(1);
      expect(lastInit(patched).next).toMatchObject({ revalidate: CONTENT_REVALIDATE_SECONDS });
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("createAnonClient", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("fails loudly without the two public variables", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(() => createAnonClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("reads through the Data API as the key holder with the caching fetch", async () => {
    const transport = vi.fn(ok);
    const client = createAnonClient({
      url: "https://example.supabase.co",
      key: "public-key",
      fetch: transport,
    });
    const { error } = await client.from("entries").select("id").limit(1);
    expect(error).toBeNull();
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0] as unknown as [string, RequestInit & { next?: unknown }];
    expect(String(url)).toMatch(/^https:\/\/example\.supabase\.co\/rest\/v1\/entries\?/);
    const headers = new Headers(init.headers);
    expect(headers.get("apikey")).toBe("public-key");
    expect(headers.get("authorization")).toBe("Bearer public-key");
    expect(init.next).toEqual({
      revalidate: CONTENT_REVALIDATE_SECONDS,
      tags: [CONTENT_TAG, "content:entries"],
    });
  });
});
