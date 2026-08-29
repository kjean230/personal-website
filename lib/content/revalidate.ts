/**
 * lib/content/revalidate.ts — on-demand revalidation of content reads (S4).
 *
 * Every read in lib/content is cached under `CONTENT_TAG` (see
 * lib/db/client.ts). These two calls are the only way to refresh it before
 * its hourly window; both are Next server-side APIs and may only run inside a
 * Server Function or Route Handler — never during render.
 *
 * Nothing calls them yet. The admin lane (`feat/admin-crud`) calls
 * `revalidateContent()` after a write, or `updateTag(CONTENT_TAG)` from
 * `next/cache` inside its Server Action when it needs to read its own write
 * back immediately; a database webhook or the ingestion cron would call
 * `expireContent()`.
 */

import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "../db/client";

/**
 * Marks every content read stale: the next visitor is still served the
 * cached page while Next refreshes it in the background (stale-while-
 * revalidate — Next 16's recommended `"max"` profile).
 */
export function revalidateContent(): void {
  revalidateTag(CONTENT_TAG, "max");
}

/**
 * Expires every content read immediately: the next visitor waits for a
 * fresh database read. For webhooks and other callers that need the change
 * visible on the very next request.
 */
export function expireContent(): void {
  revalidateTag(CONTENT_TAG, { expire: 0 });
}
