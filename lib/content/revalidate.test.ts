import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "../db/client";
import { expireContent, revalidateContent } from "./revalidate";

// `revalidateTag` only works inside a Next request; here it is a spy so the
// tests pin what the wrappers ask for — the tag every read carries, and the
// Next 16 two-argument form (the one-argument form is deprecated).

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

describe("content revalidation", () => {
  beforeEach(() => vi.mocked(revalidateTag).mockClear());

  it("marks every content read stale with the recommended profile", () => {
    revalidateContent();
    expect(revalidateTag).toHaveBeenCalledWith(CONTENT_TAG, "max");
  });

  it("expires every content read immediately when asked", () => {
    expireContent();
    expect(revalidateTag).toHaveBeenCalledWith(CONTENT_TAG, { expire: 0 });
  });
});
