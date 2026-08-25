import { defineConfig } from "vitest/config";

// Database integration tests (schema + RLS) against a migrated Postgres at
// DATABASE_URL — `npm run db:test`. Kept out of `npm test`, which stays pure
// unit tests with no services.
export default defineConfig({
  test: {
    include: ["supabase/tests/**/*.test.ts"],
    environment: "node",
    // One shared database: run files serially.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
