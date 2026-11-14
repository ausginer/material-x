# Heap-test comment report

**Handoff:** [`heap-comment-handoff.md`](heap-comment-handoff.md). **Base:** `87c688fd3` on `drag/size`. **Implementation commit:** `3c7028cc9`. **Governing records:** `DRF-41` in [`00-index.md`](00-index.md), §Disposition of the final cleanup, and CONTRIBUTING §Comments and JSDoc. The defect is `final-cleanup-reviewer-1` in the [feature proof](reviews/final-cleanup/proof-reviewer.md), with rows 3 and 4 of its heap table as evidence.

**Outcome:** the comment meets the three required properties. Only the two comment lines changed. No deviation from the handoff.

## The change

In `drag:DRI-10 destruction` › "should retain no item, behavior, view or behavior instance after 3 operations and destruction", `tests/destruction.browser.test.ts:411` to `:412`:

```diff
-            // The callback reads `behavior`, so the controller keeps it
-            // reachable until the controller is released.
+            // The callback captures the variable, not its object, so clearing
+            // `behavior` below releases the object whether or not the controller is.
```

This is the handoff's suggested wording, unchanged. `oxfmt` keeps the second line at 87 characters and doesn't wrap it.

- **Property 1:** the comment says that the callback captures the variable and not the object, and that clearing `behavior` releases the object whether or not the controller is released. `behavior = null` is at `:429`, after the read, so "below" is correct.
- **Property 2:** the comment no longer says that the controller keeps the object reachable. Row 3 (a live controller, sentinel collected) and row 4 (`behavior = null` removed, sentinel retained) agree with it.
- **Property 3:** no finding id, review name or commit.

`assertType(behavior)`, `behavior = null`, the `WeakRef` list, every assertion and the test's title are unchanged.

## Checks

Run in `packages/drag` at `3c7028cc9`.

| Check | Result |
| --- | --- |
| `npx just fmt`, `lint-fix`, `fmt`, `lint` on the test file | Exit 0, no diagnostics |
| `npx just lint` | Exit 0 |
| `npx just typecheck` | Exit 1 with only drag2's two `TS2724` errors, at `../drag2/src/kernel/presentation.ts(13,3)` and `(15,3)`: no exported members `box` and `space` from `@ydinjs/box-quad`. These are expected |
| `git diff -U0 87c688fd3..HEAD -- tests` | One hunk, `@@ -411,2 +411,2 @@`, two comment lines removed and two added |
| `git diff --stat 87c688fd3..HEAD -- src bench` | Empty |
| `npx vitest run -c vitest.config.ts --project browser tests/destruction.browser.test.ts -t "<the title>"` in Chromium | 1 passed, 22 skipped (1 file) |

## Limits

- No full suite, mutation, build comparison, size reading or other engine was run. The handoff doesn't require them, because no executable line changed.
- The full-suite evidence stays tied to `27c60a9ac`, as §Disposition of the final cleanup records.
- `DRF-42` (the sentinel's coverage) is out of scope and unchanged.

## Next

Stopping point. The architect reads this report and `3c7028cc9` and decides `DRF-41`. This unit closes nothing.