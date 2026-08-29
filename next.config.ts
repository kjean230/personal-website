import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The console shell inlines the Phase 0 icons from design/assets/icons/ with
  // readFileSync (app/(explorer)/tiles.ts), so design/ is not just a design
  // artifact directory any more — it is a build input for two routes that
  // render per request. /[section] is ƒ and /[section]/[slug] is ●, which means
  // the read happens at cold start inside the serverless function, not at
  // build, and the files have to be in the bundle for it.
  //
  // The reads use literal paths so @vercel/nft can trace them; this names the
  // directory as well, because nothing local would ever reveal the gap — both
  // `next start` and the Lighthouse job run from the repo root, where the whole
  // repo is on disk. The failure mode it prevents is an ENOENT on /experience
  // in the deploy only.
  outputFileTracingIncludes: {
    "/[section]": ["./design/assets/icons/**"],
    "/[section]/[slug]": ["./design/assets/icons/**"],
  },
};

export default nextConfig;
