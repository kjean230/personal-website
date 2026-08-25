// @ts-check
// Deterministic entry ids for the content seed (S3).
//
// A name-based UUID (RFC 4122 version 5 shape: SHA-1 over a fixed namespace
// plus the name) so re-running the importer yields the same id for the same
// export row, and the seed's upserts stay idempotent. Ids are keyed on the
// export row's natural key — never on the slug, which the owner is expected
// to edit. Changing NAMESPACE changes every id; do not.

import { createHash } from "node:crypto";

const NAMESPACE = Buffer.from("5f1c0a3e9b7d4c2e8a6f0d1b3c5e7a90", "hex");

/**
 * @param {string} name
 * @returns {string} lower-case hyphenated UUID
 */
export function deterministicId(name) {
  const hash = createHash("sha1").update(NAMESPACE).update(name, "utf8").digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
