Two correctness issues remain:

1. packages/box-quad/tests/advanced.browser.test.ts:264 was over-corrected. Chromium reports:

   20,140, 60,140, 60,160, 20,160

2. packages/box-quad/tests/advanced.browser.test.ts:398 still has the old expectation. Chromium reports:

   20,180, 60,180, 60,200, 20,200

All other reviewed revisions check out, including sticky behavior, fragmentation fixtures, cache semantics, iframe-relative operation, and transform composition.

Checks:

- Formatting: pass
- Typecheck: pass
- Lint: still fails at the two previously reported no-misused-spread locations
- Contract IDs: 98/99 represented; omitted UNSUPPORTED-06 is appropriate because it has no runtime behavioral guarantee
- Collection-red state: accepted per your decision