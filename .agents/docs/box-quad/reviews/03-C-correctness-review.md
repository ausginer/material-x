## Review findings

1. P0 — The contracted package-root import is broken. `packages/box-quad/package.json:6` exports `./index.js`, but the contract requires `@ydinjs/box-quad` and no subpath entrypoint (.agents/docs/box-quad/contract/01-public-api.md:5). Verified: importing the package root throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. Tests miss this because they import `packages/box-quad/tests/api.browser.test.ts:2`.

2. P1 — Individual 3D rotation throws instead of returning false. `packages/box-quad/src/index.ts:128` turns computed individual rotation into `new DOMMatrix(rotate(${rotate}))`. Chromium serializes `rotate: x 90deg` as `x 90deg`; `rotate(x 90deg)` is invalid `DOMMatrix` syntax and throws before `is2D` is checked. The contract requires genuinely 3D geometry to fail atomically ([FAIL-3D](/workspaces/material-x/.agents/docs/box-quad/contract/03-failure-table.md:27)).`rotate: x 0deg` also throws despite being 2D-equivalent identity geometry. Existing tests cover only classic `transform: rotateX(...)` (`packages/box-quad/tests/advanced.browser.test.ts:659`).

3. P1 — Cached geometry can cross document/realm boundaries after adoption. `Space` has no document identity (`packages/box-quad/src/index.ts:7`), and `packages/box-quad/src/index.ts:232` reuses entries solely by element identity. After measuring an element in iframe A, adopting it into iframe B, and reusing the cache, the old A coordinates are returned and can be composed with a B target. This violates the current-owner-document rule (`.agents/docs/box-quad/contract/01-public-api.md:214`) and the prohibition against composing cached data across documents (`.agents/docs/box-quad/contract/05-cache-semantics.md:163`). Confirmed in Chromium.

4. P1 — `display: contents` ancestors are treated as rendered transform contributors. `packages/box-quad/src/index.ts:85` evaluates transforms, perspective, and preserve-3d on every flat ancestor. These computed properties can remain present on a boxless display: contents node even though they do not affect its child’s rendered quad. Results range from incorrect rotation to an erroneous false. The contract explicitly supports boxless display: contents ancestry (`.agents/docs/box-quad/contract/03-failure-table.md:47`) and limits rejection to relevant rendered contributions.

5. P2 — `BoxQuadCache` is not actually opaque at the TypeScript boundary. It is declared as object (`packages/box-quad/src/index.ts:5`), so {} and any other non-primitive are valid `BoxQuadCache` values. They then throw at cache?.map.get. A private/unique-symbol brand is needed to make only factory-created values structurally assignable, matching the opaque- holder contract.

## Important test misses

- No packaged-entrypoint or declaration smoke test.
- No individual 3D transform classification test.
- No cached cross-document adoption test.
- No display: contents ancestor test; only a display: contents source is covered.
- Fragmented targets are explicitly contracted to fail, but only fragmented sources are tested.
- The iframe test uses target-relative coordinates (packages/box-quad/tests/api.browser.test.ts:126), so parent-frame offsets cancel; it does not validate default output against the iframe document’s own viewport.

## Performance and bundle size

The current bundle is already small: 1.21 kB brotli.

The best performance opportunities are:

- `packages/box-quad/src/index.ts:202` eagerly reads both offsetWidth and offsetHeight because fallback arguments are evaluated even when computed dimensions are finite. Make these reads lazy.

- Cache ancestor/cumulative linear contributions. Multiple cached sibling reads currently repeat getComputedStyle across the entire ancestry; the existing cache only helps when that exact source or target was previously completed.

- Consider storing six scalar matrix fields and performing scalar affine inversion. This reduces retained DOMMatrix objects and inverse allocations, but should be benchmarked because it adds code.

- `packages/box-quad/.size-limit.json:1` has no limit, so bundle regressions are reported but never rejected. [USER_MADE]

Verification: all 98 browser tests passed, and typecheck, lint, and formatting checks passed. No files were changed.