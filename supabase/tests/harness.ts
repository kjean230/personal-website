// Shared helpers for the database integration tests (`npm run db:test`).
// Not a test file: vitest.db.config.ts only picks up `*.test.ts`.
//
// The query layer (lib/content) reads through supabase-js, whose only
// transport is PostgREST. Locally and in CI that is the `postgrest` service
// in docker-compose.yml / .github/workflows/ci.yml, a bare PostgREST with no
// gateway in front of it. Two things differ from the hosted project and are
// bridged here, nothing else:
//   * the hosted gateway turns a publishable key into an `anon` JWT; here the
//     tests mint that JWT themselves with the sidecar's local-only secret;
//   * the gateway serves PostgREST under `/rest/v1/`; the sidecar serves it
//     at `/`, so the transport strips that prefix.
// The role, grants, RLS, SQL and the client code path are identical.

import { createHmac } from "node:crypto";
import pg from "pg";
import { createAnonClient, type ContentClient, type Fetch } from "../../lib/db/client";

/** The compose database; DATABASE_URL overrides it (local only — never hosted). */
export const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/** The PostgREST sidecar (docker-compose.yml / ci.yml `postgrest`, port 54321 = config.toml [api] port). */
export const REST_URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";

/** Must equal PGRST_JWT_SECRET in docker-compose.yml and ci.yml. Local-only; not a secret. */
export const JWT_SECRET =
  process.env.PGRST_JWT_SECRET ?? "local-postgrest-jwt-secret-not-a-secret-0123456789";

/** @returns a pool on the test database, sized for the serial test runner. */
export function createPool(): pg.Pool {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL, max: 2 });
}

const base64url = (input: string | Buffer): string => Buffer.from(input).toString("base64url");

/**
 * Mints an HS256 JWT the way the hosted gateway does for a keyless request.
 * @returns a token PostgREST accepts, running the request as `claims.role`.
 */
export function mintJwt(claims: Record<string, unknown>, secret = JWT_SECRET): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iss: "local-tests", iat: now, exp: now + 3600, ...claims }));
  const signature = base64url(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

/** The anon token the tests hand to supabase-js as its "key". */
export const ANON_JWT = mintJwt({ role: "anon" });

/** Transport that maps supabase-js's `<url>/rest/v1/…` onto the bare sidecar's `<url>/…`. */
export const restFetch: Fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return globalThis.fetch(url.replace(/^(https?:\/\/[^/]+)\/rest\/v1\//, "$1/"), init);
};

/** @returns a client identical to the app's, pointed at the sidecar as `anon`. */
export function createTestClient(key = ANON_JWT): ContentClient {
  return createAnonClient({ url: REST_URL, key, fetch: restFetch });
}

/**
 * Waits for the sidecar to serve the migrated schema. PostgREST starts
 * before `db:apply` runs, so its schema cache may predate the tables; the
 * image's `pgrst_ddl_watch` trigger asks for a reload on every DDL commit
 * and this asks once more, then polls until `entries` answers.
 */
export async function awaitPostgrest(pool: pg.Pool, timeoutMs = 30_000): Promise<void> {
  await pool.query("select pg_notify('pgrst', 'reload schema')");
  const deadline = Date.now() + timeoutMs;
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${REST_URL}/entries?select=id&limit=1`, {
        headers: { Authorization: `Bearer ${ANON_JWT}` },
      });
      if (response.ok) return;
      last = `${response.status} ${await response.text()}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`PostgREST at ${REST_URL} did not become ready: ${last} — is the postgrest service up (npm run db:up)?`);
}
