import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests live next to the code they test. scripts/ holds the
    // zero-dependency tooling (S3 LinkedIn importer); its tests use inline
    // fixtures and no services.
    include: [
      "app/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "scripts/**/*.test.ts",
    ],
    environment: "node",
  },
});
