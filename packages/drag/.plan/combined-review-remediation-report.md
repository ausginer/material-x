# Combined review remediation report

**Input:** `drag/feature-composition` at `6c1b9f83f`, which carries [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md). **Governing records:** `DRD-39`, `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` in [`00-index.md`](00-index.md), and [`contract.md`](contract.md) as amended at `6c1b9f83f`. **Comparison revision:** `b01a0283d`.

**Outcome:** the six items are implemented. Typecheck and lint pass, and `typedoc` warns only about the two installers. M1 and M2 fail as required. Every emitted `.js` file is byte-identical to `b01a0283d`'s except `shared/invalidation.js`, which differs in one JSDoc line. The owner authorized that exception (§Deviations). The only Chromium failures are the six known size rows, each over its ceiling by the same bytes as at `b01a0283d`. No threshold changed.

**Base check:** at `6c1b9f83f`, `npx just typecheck` and `npx just lint` exited 0, and lint printed nothing from either tool. `b01a0283d` was built in a scratch worktree, and its emitted `.js` and `.d.ts` files were kept for the comparison.

## Items

| Item | Commit | Change |
| --- | --- | --- |
| 1. `DRD-39` exports (`DRF-10`) | `d1a262306` | `src/draggable.ts` exports the type `VerdictAwaiter`. `src/free-drag.ts` exports the types `DragAxis`, `FreeDragSubject` and `ResolveHome`. `src/sortable/operation.ts` and `src/free-drag/operation.ts` import `VerdictAwaiter` from `../draggable.ts`, merged into their existing import from that module. `VerdictAwaiter` (in `src/kernel/behavior.ts`), `DragAxis` and `FreeDragSubject` (in `src/free-drag/domain.ts`) got a JSDoc. `ResolveHome` already had one. The new `tests/published-types.declaration.test.ts` imports each of the four from its entry and annotates a value with it. No name changed. The README lists no entry's exported types, so it is unchanged |
| 2. Reduced-motion scope (`DRF-6`) | `561f2b5af` | `README.md` §Focus and landing limits, **Landing**: "every landing that `landing()` starts has zero duration. A custom `Landing` handles that preference itself." `.agents/docs/accessibility.md`, the `@ydinjs/drag` section: the fulfilled requirement states `landing()`'s scope and drops the clause about a custom behavior with no timing. A new `[Docs]` missing requirement says that a custom `Landing` handles `prefers-reduced-motion` itself. The "Updated" line adds `drag:DRD-33`. `tests/landing.browser.test.ts`: the title is "should give a landing that `landing()` starts zero duration with reduced motion". The body is unchanged |
| 3. DRI-3 tests (`DRF-8`) | `18ba9ab58` | See §Item 3 |
| 4. Titles (`DRF-9`) | `04c522bb0` | `classes` › "should run draggable controller methods called on the controller": the `cancelLanding` clause is removed, and the body is unchanged. `sortable` › "should land at home when a cancel comes between an in-place change and invalidate": the visual's top is recorded right before `requestCancel()`. After the existing assertions, each of the item's animations is paused at time 0, the test asserts that at least one animation exists, and it asserts that the top is within 1 px of the recorded top |
| 5. `RectIndexView` (`DRF-12`) | `a19fd81c6` | The interface and its comment are deleted, and `RectIndex` no longer `implements` it. `grep -rn RectIndexView src tests bench` matches nothing |
| 6. Stale comments (`DRF-16`) | `83f472624` | `src/shared/invalidation.ts:1` names `listener`. `src/sortable/linear-shift.ts:84` names `__DEV__`. `tests/authoring.declaration.test.ts:215` says "`false` is not an operation" |

### Item 1: the import rule

`grep -rn "kernel/" src`, outside `src/kernel/`, matches only `src/draggable.ts`, at lines 1, 2, 4, 9, 10, 11 and 18.

### Item 3

**`tests/terminals.browser.test.ts`:**

- "should deliver no terminal without a start: %s before start" becomes "should report a throw from activate once and leave the list clean: %s before the throw". The local operation with `start` and `end` hooks, its `void`, and `expect(log).toEqual([])` are removed. What remains: `expect(faultMessages()).toEqual([kind])` and `expect(isClean(list)).toBe(true)`. Each fails if the kernel swallows the throw, reports it twice or leaves a lifted row.
- "should deliver no start or end when activate declines, and no report" becomes "should report nothing when activate declines". `activate` returns `null` with no operation built. What remains: `expect(faultMessages()).toEqual([])`, which fails if the kernel reports a decline.
- The `drag:DRI-3` describe is kept. The two remaining tests witness the clauses "A throw is a fault" and "`null` declines" of DRI-3's sketch (`contract.md`, the `activate` line). The unused `BehaviorOperation` import is removed.

**The five `log` instances.** Each was removed, and none was kept:

| Test | Why no reachable code can make it fail |
| --- | --- |
| `operation-lifecycle` › "should release a partial acquisition with the outcome when activate declines" | `activate` built `logging()` and returned `null`, so the kernel never receives that object. The construction and its `void` are removed with the assertion |
| `operation-lifecycle` › "should release with the fault when the operation constructor throws after a use" | `Failing`'s constructor throws, so no instance exists whose `start` the kernel could call. `start` is removed with the assertion (§Deviations) |
| `operation-lifecycle` › "should keep a cancel recorded in activate when activate then %s" | No operation is built in either case, and nothing else in the test writes `log` |
| `faults` › failed acquisition, "should restore the visual and let the acquisition fault decide" | `lifter.acquire(drag)` throws synchronously from `showPopover` inside `activate`, before the object with `start` and `end` is built (`src/lift.ts`, `acquire`: `visual.popover = 'manual'`, then `showKeepingFocus`). The helper `failAcquisition` now returns `{}` after `acquire` |
| `faults` › failed acquisition, "should report a failed restoration after the acquisition fault, which decides" | The same helper |

If `acquire` stopped throwing in these two tests, the hooks would run, but `expect(faults…)` would fail first. So the `log` assertion added no detection.

## Checks

| Check | Result |
| --- | --- |
| `npx just typecheck` | Exit 0 |
| `npx just lint` | Exit 0. Nothing printed by oxlint or ESLint |
| Per-file loop (`handoff.md`) | Done for every changed `.ts` file. No lint error survived |
| Markdown | `README.md`, `.agents/docs/accessibility.md` and this report were formatted with `oxfmt`. No linter is configured for Markdown. Links in this report were checked by hand. `git diff --check` is clean |
| `npx just test` (Chromium) | 29 files, 387 tests: 381 passed and 6 failed. The six failures are the `DRO-4` size rows below. `hot-path` › "should run no consumer callback per sample" passed in this run |
| `npx just test-engines`, with `webkit-env.sh` sourced | 72 files: 1041 passed and 18 skipped, exit 0. The same counts as at `b01a0283d`. Items 3 and 4 removed no test |
| Emitted `.js` against `b01a0283d` | 33 files. 32 are byte-identical. `shared/invalidation.js` differs in line 2 only, the JSDoc of `listenForInvalidation`. Printed through the TypeScript printer with `removeComments: true`, the two files are identical. No file was added or removed |
| Emitted `.d.ts` | Four differ: `draggable.d.ts`, `free-drag.d.ts`, `free-drag/domain.d.ts` and `kernel/behavior.d.ts`, from item 1's exports and JSDoc |
| `typedoc --options typedoc.json --out <scratch>` | 0 errors and 2 warnings: `DisplacementInstaller` and `AxisInstaller` |

**Size rows.** `tests/size.node.test.ts` was also run at `b01a0283d` in the scratch worktree. The messages are identical:

| Row | `b01a0283d` | Unit |
| --- | --- | --- |
| `draggable` alone | over its 2139 B ceiling by 63 B; control moved by 178 B | Same |
| example: resize handle | over its 3313 B ceiling by 4 B | Same |
| example: drop zone | over its 4431 B ceiling by 177 B | Same |
| `freeDrag` | over its 4967 B ceiling by 73 B | Same |
| `freeDrag` + bounds + landing | over its 5210 B ceiling by 265 B | Same |
| complete | over its 7065 B ceiling by 41 B | Same |

## Mutations

Made in the working tree and restored. None was committed.

**M1.** Each export was removed separately, and `tsc -p tsconfig.json --noEmit` failed each time:

| Removed | Failing location |
| --- | --- |
| `VerdictAwaiter,` from `src/draggable.ts`'s `export type { … } from './kernel/behavior.ts'` | `tests/published-types.declaration.test.ts(3,34)`: TS2305, no exported member `VerdictAwaiter`. Also both operation modules |
| `DragAxis,` from `src/free-drag.ts`'s `export type { … }` | `tests/published-types.declaration.test.ts(5,3)`: TS2459, `DragAxis` declared locally but not exported |
| `FreeDragSubject,` from the same list | `(7,3)`: TS2459 for `FreeDragSubject` |
| `ResolveHome,` from the same list | `(8,3)`: TS2459 for `ResolveHome` |

**M2.** W1's mutation, with the test's `faults` assertion removed:

```diff
--- a/packages/drag/src/sortable/operation.ts
+++ b/packages/drag/src/sortable/operation.ts
@@ -251,7 +251,10 @@
     } else {
-      movePlaceholder(this.#context.placeholder, this.#home);
+      movePlaceholder(
+        this.#context.placeholder,
+        homeInsertion(this.#query.snapshot, this.#query.item),
+      );
     }
--- a/packages/drag/tests/sortable.browser.test.ts
+++ b/packages/drag/tests/sortable.browser.test.ts
@@ "should land at home when a cancel comes between an in-place change and invalidate"
     controller.invalidate();
-    expect(faults).toEqual([]);
     expect(results).toEqual([
```

The test failed at `tests/sortable.browser.test.ts:185`, `expect(animations.length).toBeGreaterThan(0)`: "expected 0 to be greater than 0". The landing target throws `sortable/anchor-outside-container`, so the landing is reported and skipped, and no animation runs. Both are assertions this item adds.

## Deviations

- **`shared/invalidation.js` is not byte-identical.** Item 6 changes the JSDoc of the exported `listenForInvalidation`, and tsdown keeps that JSDoc in the emitted file. The handoff's return condition applied. The owner authorized this exception: the file may differ only in that JSDoc comment. The comment-free comparison above shows that no executable code changed.
- **A lint directive in `operation-lifecycle`.** With `start` removed, `Failing` has only a constructor, and oxlint reports `typescript/no-extraneous-class`. The test needs an operation class whose constructor throws, so the class is kept with `// oxlint-disable-next-line typescript/no-extraneous-class -- an operation class whose constructor throws`. The `class-methods-use-this` directive on the removed `start` went with it.
- **Commit messages** carry the session's attribution trailers after the subject line.

## Observed, not changed

- `faults` › "should report a platform throw and keep the controller: a hidden visual has no box" asserts `expect(log).toEqual([])` after the first drag, whose `acquire` throws before the operation is built. It has the same property as the two failed-acquisition instances. The test's later `expect(log).toEqual(['start'])` uses the same hook on a second drag, so the hook is reachable in that test. Neither the review nor the handoff names it, so it is left for the reviewer to classify.

## Limits

- M1 and M2 ran in Chromium only.
- WebKit ran with `~/.cache/ms-playwright/webkit-env.sh`.
- The scratch worktree at `b01a0283d` and the scratch build outputs were removed after the comparison.

## Next

One fresh `reviewer` pass over `7afece05a..<this report's commit>`, as the handoff's §Review describes. It repeats M1 and M2.