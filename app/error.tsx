"use client";

/**
 * app/error.tsx — the request-time error boundary (BUILD_PLAN §7 box 18,
 * "Upstream failure cannot break a page render").
 *
 * The query layer throws rather than returning a partial answer — five sites
 * across lib/content/queries.ts and lib/content/schema.ts, and there is no
 * `catch` anywhere in lib/ or app/ outside tests. That is deliberate: a route
 * that silently swallowed a `ContentQueryError` would render an empty section
 * indistinguishable from a section with no entries. The consequence is that
 * when the Data API is unreachable on a cache miss, the throw reaches the
 * framework, and until this file existed the framework's own error page is
 * what a visitor saw. This is that page, inside the site's own layout.
 *
 * `"use client"` is Next's requirement, not a choice — an error boundary is a
 * React error boundary and has to run on the client to offer `reset()`. Three
 * consequences shape everything below:
 *
 *  1. **Its imports are a client bundle.** Nothing from lib/content/*,
 *     lib/render/*, lib/db/* or zod may appear here; any of them would pull
 *     `marked` or `zod` into the browser and spend the Lighthouse script
 *     budget on a page almost nobody reaches. That is why the two hrefs are
 *     written as literals instead of imported from lib/routes/table.ts, which
 *     reaches zod transitively through lib/content/schema.ts. They are checked
 *     against the route table by error.test.tsx, so the duplication cannot
 *     drift silently.
 *  2. **The recovery has to survive JavaScript being off.** `reset()` is a
 *     function; with no JavaScript the button does nothing at all. The two
 *     links beside it are what a visitor without it uses — `<Link>` renders a
 *     plain `<a href>`, so they are ordinary anchors in the served HTML and
 *     work with nothing running — and the layout's header renders around this
 *     page as it does around every other, so nobody is ever stranded.
 *  3. **No shell island.** `<KeyHints>` mounts `<BackKey>`, which uses
 *     `useRouter`. This page is reached *because* something failed; it does
 *     not add a keyboard binding that depends on the machinery under
 *     suspicion. The affordances here are links, and they are visible.
 *
 * What this boundary does **not** cover, stated rather than implied:
 *
 *  - **Errors thrown by the root layout.** Those need app/global-error.tsx,
 *    which replaces <html> and <body> and so cannot reuse any of this. It is
 *    deferred; app/layout.tsx reads no content and has no throw site.
 *  - **Prerender failures.** `/resume` reads content at build, so a hosted
 *    project outage fails `next build` rather than reaching a request. Box 18
 *    is about page renders; the build case is real and is recorded in the
 *    handoff.
 *
 * In production Next replaces `error.message` with a generic string and hands
 * over `error.digest`, a hash correlating this render with the server log.
 * Showing the digest is the only useful thing that can be said about the
 * failure, and it leaks nothing: it is a hash, not a message.
 */

import Link from "next/link";
import styles from "./site.module.css";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className={styles.main}>
      <h1 className={styles.heading}>Something went wrong</h1>
      <p className={styles.note}>
        This page could not be loaded. Its content is stored elsewhere and the site could not
        reach it just now. Nothing you did caused this, and trying again often works.
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={reset} className={styles.chipButton}>
          Try again
        </button>
        <Link href="/" className={styles.chip}>
          Home
        </Link>
        <Link href="/resume" className={styles.chip}>
          Resume
        </Link>
      </div>
      {error.digest && (
        <p className={styles.note}>
          Reference <code>{error.digest}</code>
        </p>
      )}
    </main>
  );
}
