# Callback follow-up report

**Input:** `drag/production` at `72f669ce1`. **Governing record:** [`callback-representation-assessment.md`](callback-representation-assessment.md) §2 and §3, the bounded follow-up in its §4, and the owner's brief for this unit. No `DRD`, `DRF` or `DRO` entry is minted or amended.

**Outcome:** the displacement sink is passed as one object and its members are called on it. The built-in controllers expose the kernel's `requestCancel` and `requestDestroy` directly. `layoutAnimation` reuses one rejection handler. The four known `layoutAnimation` failures pass in every engine that runs them. **No cost is accepted, and no ceiling or control is re-based.** No timing was read, and `compare.ts` was not run.

| Commit | Content |
| --- | --- |
| `7f1aa0f94` | The witness, test file only |
| `aa33ba79a` | The receiver form, R1, R2 and R3 in the touched files |
| the commit carrying this report | This report and [`2026-11-08-callback-follow-up.txt`](measurements/2026-11-08-callback-follow-up.txt), which holds the raw output for every run below |

## Source (`aa33ba79a`)

**The receiver form (§3).**

- `DisplacementSink` declares `report` and `settle` in method syntax, beside `retire`. The function types `DisplacementReport` (`axis.ts`) and `DisplacementSettle` (`rect-index.ts`) are removed. Their comments move to the two methods.
- `AxisContext` carries `displacement: DisplacementSink | null` instead of `settle`. `SortableBehavior.activate` fills it with `this.displacement ?? null`. The context is still a literal built in `activate`, and the operation still owns it. The operation/context separation is unchanged.
- `InsertionGeometry.moved(query, context)` loses its `report` parameter. `y()` and `xy()` read the sink from the context. `SortableOperation.updateInsertion` passes only the query and the context.
- `RectIndex.refresh`, `LinearShift.refresh` and `verifyEquivalence` take the sink and call `displacement?.settle(…)`. `LinearShift.moved` and `xy()`'s `moved` call `displacement.report(…)` and `displacement.settle(…)`.

**Ordering.** Every call keeps its place: `settle` still runs after the scan and before the placeholder is read, the probe in `LinearShift.moved` still settles before the constant is taken, and each `report` still follows the advance or the rebuild. The condition is the same object as before: both detached functions came from the same `this.displacement`, so `settle` and `report` were non-null together. Invalidation order and the `finished.then` reaction are unchanged.

**R1.** `freeDrag` and `sortable` return `requestCancel: kernel.requestCancel` and `requestDestroy: kernel.requestDestroy`. These are `Gesture`'s arrow fields, which `draggable` already copies into its record. `FreeDragBehavior.invalidate` becomes `readonly`, as the assessment's R1 proposes. That change is type-only.

**R2.** `layoutAnimation` passes the module-level `function ignoreRejection(): void {}` as the rejection callback of `finished.then`. The fulfillment callback is unchanged.

**R3, in the touched files only.** `capacityFor` and `verifyEquivalence` in `rect-index.ts` become `function` declarations. `remainingOf` was already one at the base. `lift.ts` isn't touched, so `translate` and `land` are left as they are.

## Witness (`7f1aa0f94`)

`sortable.browser.test.ts` › "should call the layoutAnimation sink with its receiver, with rows in flight". The installer wraps `layoutAnimation({ duration: 3000 })` to keep the sink. `vi.spyOn` puts spies on its `report` and `settle`, and the spies call the class's methods with the receiver they get. A four-row `y()` drag crosses `r1`, waits three frames, takes one more sample and waits three frames again. It asserts:

- no `DragFault`;
- rows still animating, so every call after the first `report` happened with a row in flight;
- at least one `report` call, each one with the sink as `this`;
- at least one `settle` call ordered after the first `report`, each one with the sink as `this`.

| State | Result in Chromium |
| --- | --- |
| `7f1aa0f94`, the source of `72f669ce1` | **Fails:** one `DragFault`, `Cannot read properties of undefined (reading '#running')` |
| `aa33ba79a` | Passes. Also passes in Firefox and WebKit |
| M1: `RectIndex.refresh` reads `settle` off the sink and calls it detached | **Fails:** one `DragFault` |
| M2: `LinearShift.moved` reads `report` off the sink and calls it detached | **Fails:** one `DragFault`, `(reading '#options')` |

The mutations ran in Chromium and were not committed. Their diffs are in the raw output.

## Checks

| Check | At `72f669ce1` | At `aa33ba79a` |
| --- | --- | --- |
| `just test` (Chromium and node) | 7 failed, 339 passed (346) | 3 failed, 344 passed (347) |
| `just test-engines`, Chromium | 4 failed: the four `layoutAnimation` tests | All pass |
| `just test-engines`, Firefox | 3 failed: the same, without the Chromium-only retention test | All pass |
| `just test-engines`, WebKit | 3 failed: the same three | All pass |
| `just test-engines`, total | — | 945 passed, 18 skipped (963), 66 files |
| `npx just typecheck` | Passes, the witness included | Passes |
| Handoff loop (fmt, lint-fix, fmt, lint) on every changed `.ts` file | — | Clean |

**The four cleared failures** are `destruction` › "should cancel a running landing and the row animations", `destruction` › "should retain no item, behavior, view or behavior instance after 3 operations and destruction" (Chromium only), and `sortable` › "should animate displaced rows with layoutAnimation, in xy() too" and "should keep a row animation past the terminal, until destruction". No existing expectation changed.

**The 3 remaining failures were already failing at the base:** `draggable alone`'s control moved by 99 B, and the two `freeDrag` rows are over their ceilings. They now exceed them by 92 B and 100 B, against 102 B and 110 B at the base. The difference is R1.

**On the first engines run, WebKit didn't launch:** it was started without `webkit-env.sh`. The WebKit baseline was run again with that environment, and every later engines run loaded it.

## Size

`just size`, Brotli bytes with minified bytes in parentheses.

| Row | `72f669ce1` | `aa33ba79a` | Change |
| --- | --: | --: | --: |
| `draggable` alone | 2123 (6435) | 2123 (6435) | 0 (0), control |
| `draggable` + `lift`, the three examples | unchanged | unchanged | 0 (0) |
| `freeDrag` | 5069 (15116) | 5059 (15104) | −10 (−12) |
| `freeDrag` + bounds + landing | 5320 (15801) | 5310 (15789) | −10 (−12) |
| `sortable` + `y` | 6657 (20412) | 6641 (20372) | −16 (−40) |
| `sortable` + `xy` | 6601 (20028) | 6584 (19992) | −17 (−36) |
| complete | 7055 (21554) | 7041 (21525) | −14 (−29) |

**The control rows don't move,** because none of them reaches a changed module. The `freeDrag` rows change only by R1. The sortable rows change by R1, R2 and the receiver form together. They are joint figures, not a sum of separate ablations. Reported, not accepted.

## Allocation

**Counted by reading** the source at `72f669ce1` and `aa33ba79a`, under the [ownership report](ownership-report.md)'s rules: library-created functions and objects only.

| When | Change |
| --- | --- |
| Per `freeDrag` controller | **−2 functions**: the `requestCancel` and `requestDestroy` wrappers |
| Per `sortable` controller | **−2 functions**: the same wrappers |
| Per displaced row, per committed move, with `layoutAnimation` | **−1 function**: the rejection callback. The fulfillment callback and the derived promise stay |
| Once per realm | +1 function: `ignoreRejection`, at module evaluation |
| Per activation | None. The context literal has the same four fields |
| Per committed move without `layoutAnimation`, per sample, per frame | None |

The sink is one class instance per controller, with no functions of its own, apart from R2's per-row fulfillment callback. That was already true at the base. The class conversion had removed the factory's two closures.

## Finding

**`unbound-method` doesn't guard the sink's members, even after they became methods.** §3 of the assessment expected the method syntax to make the lint rule guard every extraction. A probe in `src/sortable/` showed otherwise: `const { settle } = sink` and `sink.report` with `sink: DisplacementSink` produced no report. The same extraction from a plain `{ report(a: number): void }` type was reported. `DisplacementSink` is `Readonly<{ … }>`. A mapped type turns its members into property signatures, so the rule sees no method. This applies to every `Readonly<{ m(): void }>` type in the repository, `retire` included. The runtime witness covers the sink. Whether to change the `Readonly<>` convention for method-bearing types, or accept this gap, is the owner's or the architect's decision. This unit doesn't change it.

## Limits

- Firefox and WebKit are Playwright's builds in the user's cache, and Chromium is the image's browser.
- The mutations ran in Chromium only.
- Allocation is counted by reading. No heap or timing instrument was run.

## Next

The owner inspects the branch. No PR is opened, and the combined review isn't started.