## Findings

1. **High — Several CSS `zoom` expectations are incorrect**. Independent Chromium measurements show zoom scales authored positions and transform translations:
   - packages/box-quad/tests/advanced.browser.test.ts:146 should begin at (20, 30), not (10, 15).
   - packages/box-quad/tests/advanced.browser.test.ts:179 should be approximately (-180,10) … (-153.333,23.333).
   - packages/box-quad/tests/advanced.browser.test.ts:197 should begin at (30,54), not (20,34).
   - packages/box-quad/tests/advanced.browser.test.ts:350 should begin at (20,180).
   - packages/box-quad/tests/advanced.browser.test.ts:598 should begin at (10,14).

2. High — The sticky fixtures do not test pre-stuck versus stuck behavior correctly. In packages/box-quad/tests/advanced.browser.test.ts:48, top:30px immediately constrains the sticky element to viewport y=30. Chromium reports y=30 both before and after scrollTop = 40; the y=0 expectation at line 81 is wrong. Add normal-flow space above the source so it begins below the inset and later sticks at y=30.

3. High — TRANSFORM-15 has the wrong composition result. packages/box-quad/tests/layout-and-transform.browser.test.ts:343 should be:

   -3, 6, -3, 46, -23, 46, -23, 6

   Chromium independently reports bounds x=-23, y=6, width=20, height=40.

4. High — Inline and fragmentation fixtures are blockified. createBox defaults to position:absolute (packages/box-quad/tests/support/ fixtures.ts:19), so authored inline/inline-block computes to display:block.
   - packages/box-quad/tests/layout-and-transform.browser.test.ts:87 does not test inline-block layout.
   - packages/box-quad/tests/advanced.browser.test.ts:603 are identical empty, zero-sized, single-box fixtures—not multiline or fragmented layout.

   Use in-flow elements and actual wrapping content inside a constrained container.

5. High — CACHE-04 turns permitted staleness into required staleness. packages/box-quad/tests/advanced.browser.test.ts:652 rejects a conforming implementation that recomputes within an epoch. The contract explicitly says staleness is permitted, not required.

6. Medium — UNSUPPORTED-06 over-specifies out-of-contract input. packages/box-quad/tests/advanced.browser.test.ts:631, but the contract deliberately guarantees no particular result or error for non-HTMLElement inputs after TypeScript is bypassed.

7. Medium — Some scenarios are tagged but not effectively exercised.
   - packages/box-quad/tests/api.browser.test.ts:122 tests only a source inside an iframe, while the scenario specifies source and target wholly inside the same iframe document.

   - packages/box-quad/tests/advanced.browser.test.ts:676 proves only atomic failure; it does not demonstrate that the previous epoch was discarded.

   - Perspective and preserve-3d are placed on the source at packages/box-quad/tests/advanced.browser.test.ts:614, although their contract cases concern relevant ancestry.

8. Medium — The browser suite currently executes zero tests. Vite cannot resolve ../src/index.js; all three suites fail during collection. A red phase should ideally load a test-only placeholder so each behavioral test runs and fails independently, without adding production geometry.

9. Low — Global prototype restoration is not exception-safe. packages/box-quad/tests/api.browser.test.ts:97 should restore Element.prototype.getBoxQuads in finally; otherwise the intended failure can contaminate later tests.

## Checks

- All 99 accepted contract IDs are represented exactly once.
- Formatting and typecheck pass.
- Test files lint cleanly.
- Browser expectations above were independently checked with the repository-configured Chromium.
- No files were changed.