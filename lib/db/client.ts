/**
 * lib/db/client.ts — the app's one database read path (S4, BUILD_PLAN §4).
 *
 * The site reads its own Postgres through Supabase's Data API (PostgREST)
 * with supabase-js and the *publishable* key. A publishable key with no user
 * session runs as the `anon` Postgres role, so every read is bounded by the
 * S2 grants and RLS policies (brief §7) — this client cannot escalate. The
 * two inputs are the public `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` already set in Vercel and in the
 * git-ignored local `.env`; nothing else is ever read here.
 *
 * Caching and revalidation (brief §3 "caching", plan row S4) ride Next's
 * fetch Data Cache rather than `'use cache'`: every PostgREST read is a GET
 * through the fetch below, which tags it and gives it a revalidation window.
 * Inside Next that means one database round-trip per hour per distinct
 * query, deduplicated within a render, durable on Vercel across requests and
 * deploys, and invalidated on demand through lib/content/revalidate.ts.
 * Outside Next (Vitest, scripts) the `next` field is ignored and reads are
 * live. Nothing here decides a route's rendering mode; S5/S6 own that.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** The fetch shape supabase-js accepts; `globalThis.fetch` is one. */
export type Fetch = typeof globalThis.fetch;

/** A supabase-js client typed against the generated schema. */
export type ContentClient = SupabaseClient<Database>;

/** Cache tag carried by every content read; revalidate it to refresh all. */
export const CONTENT_TAG = "content";

/**
 * Seconds a cached read is served before Next revalidates it in the
 * background. One hour: content changes are owner edits, not live data. A
 * route that performs these reads while prerendering inherits this as its
 * ISR interval unless it declares its own.
 */
export const CONTENT_REVALIDATE_SECONDS = 3600;

/**
 * Cache tags for one PostgREST request: the global content tag plus a
 * per-table tag (`content:entries`) taken from the `/rest/v1/<table>` path.
 */
export function contentTagsFor(url: string): string[] {
  const table = /\/rest\/v1\/([^/?#]+)/.exec(url)?.[1];
  return table ? [CONTENT_TAG, `${CONTENT_TAG}:${table}`] : [CONTENT_TAG];
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  const method =
    init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
  return method.toUpperCase();
}

/**
 * Wraps a fetch so that GET/HEAD requests carry Next's `next.revalidate` and
 * `next.tags` options. The transport defaults to `globalThis.fetch` *resolved
 * at call time* — Next installs its patched fetch on `globalThis` at runtime,
 * so a reference captured at import would bypass the Data Cache. Everything
 * in `init` (method, headers, body, signal) is passed through untouched;
 * non-GET requests are never cached.
 */
export function withContentCache(transport?: Fetch): Fetch {
  return (input, init) => {
    const send: Fetch = transport ?? ((i, o) => globalThis.fetch(i, o));
    const method = requestMethod(input, init);
    if (method !== "GET" && method !== "HEAD") return send(input, init);
    return send(input, {
      ...init,
      next: {
        revalidate: CONTENT_REVALIDATE_SECONDS,
        tags: contentTagsFor(requestUrl(input)),
      },
    });
  };
}

export interface AnonClientOptions {
  /** Project URL. Default: `NEXT_PUBLIC_SUPABASE_URL`. */
  readonly url?: string;
  /** Publishable key (or, in tests, a locally minted anon JWT). Default: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. */
  readonly key?: string;
  /** Underlying transport. Default: `globalThis.fetch` at call time. */
  readonly fetch?: Fetch;
}

/**
 * Builds an anon client. Environment is read here, not at import, so a
 * build or test that never reads content never needs the variables.
 * @returns a supabase-js client that reads as `anon` through the caching fetch.
 */
export function createAnonClient(options: AnonClientOptions = {}): ContentClient {
  const url = options.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = options.key ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createAnonClient: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required " +
        "(set in Vercel for Production/Preview and in the git-ignored .env locally)",
    );
  }
  return createClient<Database>(url, key, {
    // Anonymous reads only: no session is ever created, stored or refreshed.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: withContentCache(options.fetch) },
  });
}

let shared: ContentClient | undefined;

/**
 * The process-wide anon client used by lib/content when no client is passed.
 * @returns the shared client, created on first use from the environment.
 */
export function getAnonClient(): ContentClient {
  shared ??= createAnonClient();
  return shared;
}
