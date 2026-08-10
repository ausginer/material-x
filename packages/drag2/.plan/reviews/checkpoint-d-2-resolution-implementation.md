# Checkpoint D review 2 — implementation record

All five findings in [`checkpoint-d-2.md`](checkpoint-d-2.md) are closed. **C2-01** was implemented exactly as specified in the architect's [`checkpoint-d-2-resolution-c2-01.md`](checkpoint-d-2-resolution-c2-01.md); nothing in that decision was substituted, and the two places it turned out to be incomplete rather than wrong are recorded in §Where the decision needed more than it said.

**D2, D5, the frozen public surface and L-11's deferral are untouched.** `src/sortable.ts` still exports exactly the 18 type names and 4 runtime names contract 03's export table specifies; nothing was added to any public entrypoint; `live` sits on an unexported per-operation type and `closed` on the behavior's private runtime. The cancel sentinels were not exported and nothing was folded into L-11.

---

## C2-01 — the terminal barrier

**Implemented per §5, file by file.** `SortableRuntime` gains `closed: boolean`; the D3 latch moved off `createSortableController`'s closure onto it, with `destroy()` setting it before `host.destroy()` exactly as before. `PresentationView` and `InsertionRuntimeView` gain `live: () => boolean`, threaded through `y.ts` and `xy.ts` to `RectIndex.refresh`'s new fourth argument. The check is **inside** the `getVisual !== null` branch, and on a false reading it restores the retired state (`items.length = 0`, `count = 0`, `dirty = true`, `measured = -1`) and returns, rather than `break`ing into the trailing bookkeeping. Four guards read `rt.closed` directly in `spec.ts`: `resolveItem` after `getHandle`, `measureInSeam`'s return, `action.prepare(TAG_SPATIAL)` after `resolveInsertion`, and `action.effect(TAG_SPATIAL)` after `movePlaceholder` — the last returning from inside the `try` so the `finally` still clears `view.insertion`. Admission declines rather than throws. The existing `activation.effect` guard is unchanged and still reads `scope.presentation.signal.aborted`; `release.prepare` takes no guard, with the reason recorded in the source, in I-36 and in F-47. `handle.ts`'s two doc comments state the consequence.

### Where the decision needed more than it said

Neither is a correction to the decision; both are things the tests forced into the open.

1. **`layoutAnimation()` cannot witness §6 case 6 or 7.** The decision says "no `afterMove` hook runs and no animation is created". The second half is not a discriminator: `layoutAnimation()`'s own `retire()` empties its span map, so its `afterMove` is _already_ inert on a destroyed controller and creates no animation whether the barrier exists or not — case 6 passed against pre-fix source when asserted that way. Both cases now assert against a test-authored displacement feature that records each half of the bracket pipeline.
2. **The `action.effect` bracket guard is not observable with an eager `measure` installed.** `measureInSeam`'s `!rt.closed` covers the same continuation, and both first-party axes install a `measure`, so with one composed neither guard can be seen alone. Case 7 therefore composes an axis feature with **no eager `measure`** — a lazy rule the contract explicitly supports — which isolates the outer guard. Reverting it alone then fails the case, as required.

A third, smaller point: the eager rebuild after a site-C destroy is inert for a different reason than the guard — kernel teardown scrubs both frames, so `frame.item` is `null` and the axis `measure` returns before touching the cache. The guard is still the right instrument, because it stops `invalidateInSeam` and the hook pipeline as well, and because a behavior must not depend on the kernel's scrub order for its own barrier.

**One specified guard is unfalsifiable and is kept.** `action.prepare(TAG_SPATIAL)`'s `rt.closed` test is unreachable through any first-party composition: the loop barrier makes a destroyed traversal produce `count === 0`, so the axis rule returns `null` and the `resolved === null` disjunct always fires first. Recorded in `tests/COVERAGE.md` §Equivalent mutants rather than removed — it is defence in depth against an axis rule reaching consumer code by another route, and it costs nothing measurable.

### Tests — nine cases, every one verified against pre-fix source

Verification method: revert the fix, run, confirm the case fails; restore. Not assumed.

| Case | Test | Fails when reverted |
| --- | --- | --- |
| 1 admission, pointer | `features.browser.test.ts` — _should not resolve a visual after the handle resolver destroyed_ | `resolveItem` guard |
| 2 admission, command | `features.browser.test.ts` — _…after a keydown handle resolver destroyed_ | `resolveItem` guard |
| 3 candidate loop, composed, `y()` | `features.browser.test.ts` — _should stop the candidate traversal at the destroying candidate_ | loop guard |
| 3 candidate loop, composed, `xy()` | `xy.browser.test.ts` — _should stop the traversal of a composed drag at the destroying candidate_ | loop guard |
| 4 direct drive, both axes | `{y,xy}.browser.test.ts` — _should stop resolving candidates once the controller closes_ | loop guard |
| 5 retired-state equivalence, both axes | `{y,xy}.browser.test.ts` — _should leave the cache retired rather than clean and partial_ | loop guard |
| 6 eager rebuild in the bracket | `features.browser.test.ts` — _should not run the eager rebuild past a destroying candidate_ | `measureInSeam` guard |
| 7 placeholder reaction (site C) | `features.browser.test.ts` — _should not run the bracket past a placeholder reaction that destroyed_ | `action.effect` guard |
| 8, 9 non-regression | D2's call-exactness rows and D3's `updateItems()`-after-destroy rows, unchanged | — |

Reverting the loop guard fails six cases at once (both axes' direct-drive pairs plus both composed traversals); each behavior guard fails only its own case, which is what makes them separable evidence rather than one test repeated.

**Fixture cost, as predicted:** `live` added to nine hand-built views (`sortable.browser.test.ts` ×4, `y.browser.test.ts` ×2, `xy.browser.test.ts` ×2, plus the default in each axis suite's `resolve` helper) and two `rt.view` null-narrowings.

### Measured cost

| composition                 | before   | after        | Δ     |
| --------------------------- | -------- | ------------ | ----- |
| minimal                     | 10.01 kB | **10.07 kB** | +60 B |
| minimal (xy)                | 10.05 kB | **10.12 kB** | +70 B |
| minimal + `layoutAnimation` | 10.42 kB | **10.51 kB** | +90 B |
| minimal + `landing`         | 10.29 kB | **10.36 kB** | +70 B |
| complete                    | 10.82 kB | **10.85 kB** | +30 B |
| baseline A                  | 10.54 kB | **10.60 kB** | +60 B |

Module counts unchanged; every composition inside its budget. Five of the six land inside the architect's predicted band; `+ layoutAnimation` came in 20 B above it, which is inside brotli's noise for a single-composition delta and changed no decision. **Headroom is now 0.16–0.21 kB** against budgets set with ~0.3 kB, which is the Phase 21 note.

---

## C2-02 — the public landing contract

`LandingOptions.duration` in contract 03 is now `number | (() => number)`, and §Public option domains distinguishes **fixed options, validated at construction** from **the thunk, invoked and validated once per landing at settlement, ahead of the reduced-motion collapse**. The domain table row and the `landing({ run })` bullet were amended with it. The README's all-at-construction claim is replaced by the same distinction. In the ledger, §2's `landingTiming()` row no longer opens with "fixes timing at construction" — the two readings it gave at once are reconciled into one — and **L-6 no longer names a future Phase 15-or-22 change that Phase 15 already made**, with what probe 13b established and what actually closed it separated.

## C2-03 — the loss accounting

D5 is not reopened; only the ledger's accounting changed.

- **`AnimationTiming`** is reclassified _redesign_ → **drop** in both rows (§2.1, §7), because a name that no longer exists on the surface is a drop whatever replaces its members — the reading §2.1's `DragSubject` row already takes. **What a consumer loses** is now stated: a real named export of shipped `sortable.ts:26-30` (verified), and the annotation shipped consumers used for `landingTiming()`. The **"strictly wider" rationale is withdrawn as false** — DOM `EffectTiming.duration` is `number | CSSNumericValue | string` and drag2's is `number | (() => number)`; the domains overlap and neither contains the other. The decision never needed it.
- **`CancellationReason`**: "nothing against shipped" is replaced by the actual loss — direct access to the built-in reason's `type` and `detail`. It is not a named export of shipped `sortable.js`, but the numeric literals are **in the exported `SortableCancelResult`**, so the discrimination was writable without importing anything. The previous reasoning ("L-2 records that the `CANCEL_*` values were unexported") was true and beside the point. The redesign remains preferable on the stage axis; §L-11 carries the reason axis and **stays deferred to Phase 23** — nothing was folded into it and no sentinel was exported.
- The **four deliberate absences** (`AnimationTiming`, `DragSubject`, `ResolutionContext`, `CancellationReason`) now carry negative assertions in `tests/consumer.node.test.ts`, beside the ones already there for the internal SPI names and `OUTCOME_*`. A `@ts-expect-error` that stops erroring is itself a compile failure, so re-adding any of the four cannot happen silently.
- §Coverage recounted: redesign 16 → 14, drop 7 → 9. 77 rows, unchanged.

## C2-04 — the normative documents

**Chosen approach: advance every _current_ statement in 00–04 to `y()`/`xy()`.** The alternative — relabelling parts of 00–04 as intentionally historical — was rejected because contract 00's precedence ranking is itself normative and is load-bearing for every other document in the set: a contract that has to tell the reader which of its paragraphs are true is worse than one that is true. Weakening the ranking to accommodate stale prose would also have cost more than fixing the prose.

Advanced: `00:75` (the cache's home, with a parenthetical pointing at the rename), `00:113` (the dead `§vertical()` link → `§y()` and `§xy()`), `00:192` (F-26's "minimal _vertical_ sortable" → "one-dimensional"), `01:99-111` (the consumer-facing construction example), `01:243`, `01:268`, `04:23`, `04:169`, `04:292`, `04:302` — the last four are 04's own current code sketches and feature-state table, which the review did not name but which fail the same test. In 03, `:111` and `:311` were current statements and are advanced.

Contract 03's remaining `vertical()` uses are **all** narrative about an earlier draft or an earlier probe, and each already carries its frame in its own sentence ("an earlier draft", "review 5, §10", "probe 1 typed feature seams", "probe 1's open question Q-5", and the rename record itself). §The composition surface now says so explicitly and enumerates them, replacing D7's claim that Part I's prose is provenance — which was the sentence C2-04 correctly rejected. `plan.md` and the review files are genuine provenance and are untouched.

## C2-05 — the residues

- `readinessTimeout?: number` added to contract 03's `SortableCallbacks` listing.
- Eight TypeDoc entrypoints → **nine**, in contract 03 and the README, with the reason (`sortable/xy.js`, Phase 17).
- The **"deltas unchanged since M-3" claim is withdrawn**, not restated: M-3 recorded `landing()` at +0.27 kB and complete at +0.76–0.81 kB, and the deltas have moved with every absolute figure since. The module-graph _property_ is what that section now asserts, and the numbers are re-measured **after** C2-01: `xy` +0.05, `layoutAnimation` +0.44, `landing` +0.29, complete +0.78. Composition cost 0.28 → 0.25 kB; migration cost 3.12 → 3.18 kB.
- Both axis module headers now say candidate **visual** — rebased onto C2-01's edit to the `InsertionRuntimeView` block a few lines below, as the sequencing note asked.
- `plan.md`'s eleven-test attribution corrected to **4 D1 / 3 D3 / 4 D4-D6**.

---

## Verification

From `packages/drag2`:

```text
npx just fmt <changed files>      PASS
npx just lint-fix <changed files> PASS
npx just typecheck                PASS
npx just test                     33 test files, 734 passed, 18 skipped, no type errors
npx just size                     PASS — every composition inside budget
  minimal                                     10.07 kB brotli (31 modules, 0.19 kB under budget)
  minimal (xy)                                10.12 kB brotli (31 modules, 0.19 kB under budget)
  minimal + layoutAnimation                   10.51 kB brotli (32 modules, 0.16 kB under budget)
  minimal + landing                           10.36 kB brotli (32 modules, 0.20 kB under budget)
  complete                                    10.85 kB brotli (35 modules, 0.19 kB under budget)
  baseline A - feature-matched, non-composed  10.60 kB brotli (30 modules, 0.21 kB under budget)
  baseline B - shipped sortable.js             6.89 kB brotli (26 modules, 0.21 kB under budget)
```

Test count **724 → 734**, with nothing removed or weakened: ten new cases (two admission, six candidate-loop across both axes and both drive levels, two bracket) plus four negative type assertions in the consumer fixture, which the type-fixture suite counts as part of one existing test.

## What remains open

- **L-11** — the cancel reason sentinels. Deferred to Phase 23 by owner decision, untouched here. C2-03 sharpened the `CancellationReason` loss accounting that is _related_ to it; nothing was folded in.
- **Q-12** — unchanged.
- **The size headroom** is now 0.16–0.21 kB against budgets set with ~0.3 kB. Flagged as a Phase 21 deliverable to re-base rather than absorb again. Nothing is over budget.
- **Phase 18's terminal-barrier enumeration** is a deliverable, not deferred work: there is no free-drag code to guard, so the rule lands now and its second application lands with the second behavior. The stated falsifier for keeping the latch behavior-owned rather than kernel-supplied is a **third** copy of it.
- **A `panic()`-initiated destroy does not reach the behavior's latch.** The argument that it is unreachable from inside a resolver is reachability, not a type property. If a future path makes it reachable, that is an SPI question and must be argued as one rather than patched.