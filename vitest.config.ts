import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests live next to the code they test.
    include: ["app/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
