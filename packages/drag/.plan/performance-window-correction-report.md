# Performance window correction report

**Input:** [`performance-window-correction-handoff.md`](performance-window-correction-handoff.md), carried by `6e505dacf` on `drag/performance`. **Governing records:** `DRD-50` in [`00-index.md`](00-index.md), with `DRD-49`, `DRD-47`, `DRD-44` property 6 and `DRD-40` properties 4 and 6. **Bases for comparison:** `packages/drag/src` at `501f60ab7` and at `71f20df20`.

**Outcome: complete. Item 5 didn't apply.** A measurement now settles a slot range of the cache's own buffer and element array, and allocates nothing for the sink. That covers `y()`'s growth and `xy()`'s rebuild. W7 and W8 pass in Chromium, Firefox and WebKit, and M7 and M8 each fail their witness in all three engines. The probe of `xy()`'s rebuild reads **"no difference shown"** in both cases, so the shared rebuild stays. Its A/A bounds are wide, though: 650 µs and 807 µs, which is 27 % and 39 % of a rebuild (see [§Limits](#limits)). The three-engine suite and the hot-path tests pass. Against `501f60ab7`, "sortable + y" is −12 B Brotli, "sortable + xy" −15 B and "complete" −6 B. The seven rows without `sortable` read 0. No return condition was met.

| Commit | Content |
| --- | --- |
| `8d002529a` | Item 2, range settling, and W7 and W8 in their first form. This is the unit's last code commit: `src/` doesn't change after it |
| `0676d801a` | W8 reaches its first gap in one resolution, and W7 checks the buffer's identity before its other assertions |
| `4160d76e4` | W8 compares the settled row with its flow position from before the resolution |
| the commit carrying this report | This report, and the records under `measurements/` |

The two test commits correct W8 under M8. [§Item 3](#item-3-the-witnesses) gives the reasons. The probe, the suite, the hot-path tests and the size table all ran at `4160d76e4`, whose `src/` is the same as `8d002529a`'s (`git diff --stat 8d002529a 4160d76e4 -- packages/drag/src` is empty).

## Item 1: the base

`git diff --stat 501f60ab7 HEAD -- packages/drag/src packages/drag/tests` at `6e505dacf`, before any change: **empty**.

## Item 2: range settling

**The parameter form:** `settle(values, items, first, end)`, a first slot and an end slot, like `measure`'s `lo` and `hi`. The sink settles the slots from `first` to before `end` of `values`. It reads each slot's element at the same index of `items`, and reads or writes nothing outside the range.

| Caller | Call |
| --- | --- |
| `RectIndex.measure` (`y()`'s growth, `xy()`'s rebuild through `refresh`, and the development check) | `settle(values, items, lo, hi)`, with the cache's own buffer and element array |
| `RectIndex.holds`, the drop's confirmation | `settle(scratch, [item], 0, 1)` |
| `linearShift`'s probe in `moved` | `settle(scratch, [probe], 0, 1)` |

- **`axis.ts`:** `settle`'s documentation states the range, that `items` is parallel to the slots, and that nothing outside the range is read or written. The type stays internal.
- **`layout-animation.ts`:** the loop runs from `first` to before `end`. The early return when nothing is in flight is unchanged.
- **`rect-index.ts`:** `measure` passes `values`, `items`, `lo` and `hi`. The comment that described a view and a copy is removed. What remains says that slots hold where flow puts a row.
- **The confirmation and the probe** read and allocate what they did before: one six-value scratch and a one-element array, only when a sink is composed in the probe's case. Only the range argument was added.

## Item 3: the witnesses

Both witnesses are in `tests/sortable.browser.test.ts`. They use real elements and real pointer input through the harness.

**How a test records `settle`.** `recordSettles` replaces the composed sink's `settle` with a function that calls the original and records the call. It also wraps `getBoundingClientRect` and records which destination rows were read since the previous call. This is the same composition as "should call the layoutAnimation sink with its receiver, with rows in flight": the factory installs the real `layoutAnimation` sink, and the test keeps a reference to it. Each record keeps the buffer, the element array, the range, the array's length and the range's elements as they were at the call, and a copy of the range's slots after settling. The array's contents are kept because the drop retires the cache and empties it.

**How W7 tells a measurement's calls from the confirmation's and the probe's (the unit's choice).** It looks at the buffer's `ArrayBuffer`. A measurement's buffer is the cache's: it holds a slot for each destination row, so with 11 rows its byte length is 16 × 6 × 8 = 768. The confirmation and the probe allocate a scratch of one slot, so their byte length is `STRIDE × 8` = 48. A `subarray` view keeps its parent's `ArrayBuffer`, so this rule also identifies M7's calls as measurements.

| Witness | Test | What it asserts |
| --- | --- | --- |
| **W7**, `y()` | "drag:DRD-50 should settle each range y() measures in the cache's own buffer and element array" | 12 rows and `layoutAnimation`. The drag moves r0 down in steps of one row, 40 px, one resolution per step, to 260 px below the press, and drops. Across every measurement call there is one buffer object and one element array object. Each buffer is a whole buffer: `byteOffset` 0, and its length equals its `ArrayBuffer`'s. The element array holds 11 slots. The rows read since the previous call are exactly the range's elements. At least 3 measurement calls start after slot 0. Each other call has the range `[0, 1]` and reads its own row. No fault, and `end:accepted` |
| **W7**, `xy()` | "drag:DRD-50 should settle each xy() rebuild in the cache's own buffer and element array" | A wrapping field of 12 cells, 3 per line, with `xy()` and `layoutAnimation`. There are two committed moves, and with a sink each move rebuilds. The same identity, whole-buffer and range assertions as the `y()` case. At least 2 calls have the range `[0, 11]`. No fault, and r0 lands at index 2 |
| **W8** | "drag:DRD-50 should settle a row in flight when the window grows over it, and hold the gap its flow position gives" | Ten 40 px rows, with `layoutAnimation({ duration: 60_000, easing: 'linear' })`. Details below |

**How W8 puts a row in flight inside the window's growth (the unit's choice).**

- A single pointer sample over r3 makes one resolution. Nothing is in flight yet, and it measures slots 0 to 3 and moves the placeholder to gap 3. The committed move displaces r1, r2 and r3 up by a row, and each one starts an animation that draws it a row below its flow position. Two frames later the test asserts that r3 has one animation.
- `controller.invalidate()` then empties the window. The pointer moves to 105 px below the press, which is 125 px into the list. That is above the placeholder's center at 140 px, so the next resolution grows the window up from gap 3, and `measure(2, 3)` reads r3 while it is drawn about 40 px low.
- **The settled geometry:** in the first measurement call whose range holds r3, the range starts after slot 0, and r3's settled top equals its flow top within 0.5 px.
  - The flow top is the list's rect top plus `r3.offsetTop` minus the list's `offsetTop`. `offsetTop` ignores transforms.
  - The test takes it before the resolution, because a wrong resolution moves the placeholder and r3 with it.
- **The gap:** the placeholder's gap equals the gap that `y()`'s rule gives over the rows' flow positions. The test computes that before the move: the nearest flow center, with the placeholder as the incumbent and a strict comparison. Here it is 3. The placeholder's center at 140 px is 15 px from the pointer, and r3's flow center at 100 px is 25 px from it.
- r3 still has its animation at the end, and there is no fault.

**Two corrections to W8, both made before any mutation result was accepted.** In the first form, M8 failed W8 in WebKit on the gap, but in Chromium and Firefox the failure was "expected -1 to be 3". The setup moved the pointer in three samples, a frame resolved an intermediate gap, and a later frame grew the window over a row in flight with slot 0 at its start. Under M8 the development check then threw, the operation was cancelled, and the placeholder was removed. So W8 failed because of the check, which the handoff rules out. `0676d801a` reaches gap 3 in one sample, so nothing is in flight while slots 0 to 3 are measured. The next run showed a second problem. Under M8, the settled-top assertion compared against r3's flow top read after the resolution, and the wrong move had shifted r3 by one row, which equals the unsettled drawn position. That assertion passed by coincidence, and the gap assertion failed instead. `4160d76e4` takes the flow top before the resolution. The outputs of those earlier runs were overwritten and aren't kept. The runs below are at `4160d76e4`.

**Results.** The runner, [`…-witness-runner.sh.txt`](measurements/2026-11-12-window-correction-witness-runner.sh.txt), runs `-t "DRD-50"` in all three engines, with the working tree's `src/sortable` difference against `HEAD` at the head of each output.

| Run | Chromium | Firefox | WebKit | First failing assertion |
| --- | --- | --- | --- | --- |
| [Production](measurements/2026-11-12-window-correction-witnesses.txt) | 3 pass | 3 pass | 3 pass | — |
| [**M7**](measurements/2026-11-12-window-correction-mutation-M7.txt) | 3 fail | 3 fail | 3 fail | W7 `y()`: "expected 13 to be 1", 13 distinct buffer objects. W7 `xy()`: "expected 3 to be 1". W8: "expected 0 to be greater than 0" |
| [**M8**](measurements/2026-11-12-window-correction-mutation-M8.txt) | W7 `y()` and W8 fail | W7 `y()` and W8 fail | W7 `y()` and W8 fail | W8: "expected 119.94… to be close to 80, received difference is 39.94…", 119.95 and 119.96 in Firefox and WebKit. That is the settled geometry, before the gap assertion. W7 `y()` fails on its slot count after the development check cancels the drag. W7 `xy()` passes, because `xy()`'s range starts at 0 |

**The mutations, as run:**

- **M7:** `measure`'s call becomes `settle(values.subarray(lo * STRIDE), lo ? items.slice(lo, hi) : items, 0, hi - lo)`. This is `501f60ab7`'s call with a view and a copy. With the range parameters it still settles the right slots, so W7 fails only on the copies. I didn't run `501f60ab7`'s literal three-argument call. Against the new signature it would pass `hi - lo` as `first` and nothing as `end`, so it would settle nothing.
- **M8:** `layout-animation.ts`'s loop becomes `for (let i = 0; i < end - first; i += 1)`. That settles the right number of slots starting at slot 0, so it ignores the range's start.

Each mutation was an uncommitted edit, and `git checkout` reverted it after its run.

**The tests that must still pass** all pass in the three-engine suite (item 6): `DRD-49`'s W5 and W6, `DRD-47`'s W1 and W2, "should call the layoutAnimation sink with its receiver, with rows in flight", and "should animate displaced rows with layoutAnimation, in xy() too". The census and allocation tests pass in `tests/hot-path.browser.test.ts`.

## Item 4: the probe of `xy()`'s rebuild

**Source and output:**

| Part | Record |
| --- | --- |
| Page | [`…-probe-page.ts.txt`](measurements/2026-11-12-window-correction-probe-page.ts.txt) |
| Runner | [`…-probe-runner.ts.txt`](measurements/2026-11-12-window-correction-probe-runner.ts.txt) |
| The bundle that ran | [`…-probe-bundle.js.txt`](measurements/2026-11-12-window-correction-probe-bundle.js.txt) |
| Output, with the machine record at the head and foot | [`…-probe.txt`](measurements/2026-11-12-window-correction-probe.txt) and [`…-probe.json`](measurements/2026-11-12-window-correction-probe.json) |
| The hold | [`…-hold.txt`](measurements/2026-11-12-window-correction-hold.txt) |

The machine record comes from the wrapper that the window unit saved, [`2026-11-12-window-record-wrapper.sh.txt`](measurements/2026-11-12-window-record-wrapper.sh.txt). The runner is in the scratch directory with the page and the four arm files. It resolves `rolldown` and `playwright` through this package.

**How the page loads both classes.**

- The four arm files are copies of `src/sortable/rect-index.ts` and `src/sortable/layout-animation.ts`.
  - The `before` copies are taken from `71f20df20` with `git show`.
  - The `production` copies are taken from `HEAD` (`4160d76e4`).
- `page.ts` imports both pairs. Rolldown bundles it into one IIFE with `__DEV__` defined as `false`, and `@ydinjs/box-quad` aliased to its source, as `compare.ts` does.
- The bundle holds two classes, `RectIndex$1` (`before`) and `RectIndex` (`production`), each with its own `layoutAnimation`.
- The runner launches Chromium 157.0.8103.38 once from `/usr/local/bin/chrome`, sets the page's content, and adds the bundle as a script tag.

**The page.**

- 2,000 cells of 40 × 20 px with `flex: none`, in a `flex-wrap` container 1,000 px wide. That is 81 lines.
- The placeholder is a 40 × 20 px element after cell 1,000.
- The dragged item is a fixed-position element outside the field. It is the first element in the snapshot, so a rebuild skips it, and the cache holds 2,000 slots.
- The field is laid out with `offsetHeight` when it is built. Two animation frames pass before any timing.

**The arms and the cases.**

- `before`, `production` and `control` (a second `production` instance) each get their own `RectIndex` for each case.
- In the case with a sink, each arm also gets its own sink: `before` gets `71f20df20`'s `layoutAnimation()()`, and the other two get the unit's.
- Nothing is reported to a sink, so nothing is in flight.
- Before timing, each arm rebuilds once with no sink. The three packed buffers are equal value for value: `armsPackTheSameValues: true` in both cases.

**The batch and the warm-up.**

- **Batch size:** 128 rebuilds in both cases, the same for every arm and round. Calibration runs after a discarded batch of 64 production rebuilds. It then doubles the size from 1 until one production batch lasts at least 300 ms.
- **Warm-up:** in each round, each arm discards one batch of 128 rebuilds, then times one batch of 128.
- **One rebuild:** `invalidate()` and then `refresh(snapshot, dragged, null, placeholder, sink)`.
- **The reading:** the batch's duration from `performance.now()`, divided by 128, in µs.
- **Rounds:** 7, in the order `before, production, control`, rotated by one arm per round.
- **Batch length:** the shortest timed batch lasted 191.5 ms in the case with no sink and 213.5 ms with the sink, so every batch passed 100 ms.

**The verdict.** The runner copies `compare.ts`'s `pairedVerdict` rule: 6 of 7 signs (`timingSigns(7)`), and the median difference against the largest absolute A/A difference. It works on unrounded µs. `pairedVerdict` itself isn't exported, and `bench/` isn't in scope. The differences are `production − before`, and the A/A differences are `control − production`.

**The process:** probe attempt 2, from 07:43:08 to 07:43:36 UTC, exit 0. `before` load average 2.65, 2.80, 2.77, and `after` 3.69, 3.04, 2.85, on an i7-1255U with P-cores 0 to 3 and E-cores 4 to 11. The process wasn't pinned.

| Case | Differences, µs per rebuild, rounds 1–7 | Higher / lower | Median | A/A, µs, rounds 1–7 | A/A bound | `before` median | Bound as a share of `before` | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| No sink | −660.9, −1,724.2, +110.2, −219.5, −887.5, +181.2, +503.9 | 3 / 4 | −219.5 | +466.4, +617.2, +585.2, −192.2, +167.2, −650.0, −496.9 | 650.0 | 2,383.6 | 27 % | **no difference shown** |
| `layoutAnimation`, nothing in flight | −135.9, +1,494.5, −1,243.0, −228.1, +55.5, −753.9, +68.8 | 3 / 4 | −135.9 | −21.9, +322.7, +807.0, −52.3, +24.2, +104.7, −77.3 | 807.0 | 2,060.9 | 39 % | **no difference shown** |

The `production` and `control` medians are 1,825.0 and 2,291.4 µs with no sink, and 1,882.8 and 1,872.7 µs with the sink.

**Two earlier processes under the same hold, kept and not used as the reading.**

- **[Attempt 0](measurements/2026-11-12-window-correction-probe-attempt-0.txt)** stopped before any browser launched, because Playwright's CommonJS entry exposes `chromium` on `default`. The runner was fixed.
- **[Attempt 1](measurements/2026-11-12-window-correction-probe-attempt-1.txt)** ([JSON](measurements/2026-11-12-window-correction-probe-attempt-1.json)) ran to the end, exit 0, and also read "no difference shown" in both cases.
  - In the no-sink case, calibration timed cold code and chose 64 rebuilds. Five of its 21 timed batches lasted less than 100 ms, and the shortest was 87.5 ms. That breaks item 4's batch rule, so I didn't use the run.
  - Its no-sink figures were a median of −32.8 µs against a bound of 450.0 µs. With the sink, the median was −67.2 µs against 798.4 µs, higher in 2 of 7.
  - [`…-probe-attempt-1-source.diff.txt`](measurements/2026-11-12-window-correction-probe-attempt-1-source.diff.txt) is the whole difference between attempt 1's source and the final source: the discarded calibration batch, the 300 ms target instead of 150 ms, and a check that fails the process when a timed batch lasts less than 100 ms.
  - Attempt 1's bundle and attempt 2's differ only in the calibration lines, so the reconstructed source is the one that ran.
- I decided on the rerun from the batch rule alone, and I'd have made the same decision for any verdict. Item 4 allows one process when item 5 doesn't apply, so this is a deviation, and it is recorded here.

**The hold** (`DRD-44` property 6). The owner confirmed the hold at 07:42:21 UTC, before the first process. The owner confirmed the release at 07:46:17 UTC, after the last process ended at 07:43:36. Nothing else from this session ran in that interval. In the hold record, the "exit 0" line for attempt 0 is the exit status of the shell's `echo`, as a note there says. The probe's own record foot says exit 1.

## Item 5: one pass

**Not applied.** Neither case reads "slower", so `xy()`'s rebuild stays as `collect` followed by `measure(0, count)`, and no second probe ran for item 5. The bounds are in the item 4 table: 650.0 µs with no sink and 807.0 µs with the sink.

## Item 6: the other checks

All ran after the probe and the release.

- **[The three-engine suite](measurements/2026-11-12-window-correction-engines.txt)** (`npx just test-engines` at `4160d76e4`): 72 files passed. 1,068 tests passed and 18 were skipped, with no failure. That is the 1,059 passed at `501f60ab7` plus W7's two tests and W8 in each engine. The development equivalence check didn't throw in any engine.
- **[The per-sample and census tests](measurements/2026-11-12-window-correction-hot-path.txt)** (`npx just test tests/hot-path.browser.test.ts`, the shipped project, Chromium): 9 passed.
- **[The size table](measurements/2026-11-12-window-correction-size.txt)** (`npx just size` at `4160d76e4`, exit 1 because of the red rows below). The comparisons are against [`501f60ab7`](measurements/2026-11-12-window-size.txt) and [`71f20df20`](measurements/2026-11-12-window-size-base.txt):

| Row | Minified | Brotli | Ceiling | Brotli vs `501f60ab7` | Brotli vs `71f20df20` | State |
| --- | --- | --- | --- | --- | --- | --- |
| draggable alone | 6,733 | 2,197 | 2,139 | 0 | 0 | red, as saved |
| draggable + lift | 11,544 | 3,974 | 4,169 | 0 | 0 | green |
| example: resize handle | 9,390 | 3,310 | 3,313 | 0 | 0 | green |
| example: drop zone | 13,183 | 4,610 | 4,431 | 0 | 0 | red, as saved |
| example: canvas group | 9,526 | 3,306 | 3,314 | 0 | 0 | green |
| freeDrag | 15,201 | 5,036 | 4,967 | 0 | 0 | red, as saved |
| freeDrag + bounds + landing | 16,366 | 5,476 | 5,210 | 0 | 0 | red, as saved |
| **sortable + y** | 20,741 (−25) | 6,721 | 6,733 | **−12** | +143 | green, 12 B left |
| **sortable + xy** | 20,297 (−27) | 6,602 | 6,617 | **−15** | +36 | green, 15 B left |
| **complete** | 22,420 (−23) | 7,356 | 7,065 | **−6** | +149 | red, 291 B over, was 297 |

The seven rows without `sortable` read the same as both saved records, in minified and in Brotli bytes, so I didn't run the base again. The "draggable alone" control line, "control moved by 173 B", is the same as at `501f60ab7`. **The reason for the delta:** `measure`'s call to the sink no longer builds a view and a copy, and three call sites pass one more small integer. No module was added or removed, and each row's module count is unchanged.

## Verification

| Check | Result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat 6e505dacf..HEAD -- packages/drag` | `src/sortable/axis.ts`, `layout-animation.ts`, `rect-index.ts` and `linear-shift.ts`. `tests/sortable.browser.test.ts`. This report, and the records under `measurements/`. No other file |
| W7 and W8 | Pass in Chromium, Firefox and WebKit |
| M7 and M8 | M7 fails W7, and M8 fails W8, in all three engines. M8 fails W8 on the settled geometry |
| Item 4 | One valid process, attempt 2, exit 0, with both cases judged on 7 rounds. Two earlier processes are reported above |
| The seven rows without `sortable` | 0 against `501f60ab7` |
| Changed `.ts` files | `just fmt`, `just lint-fix`, `just fmt` and `just lint` on all five, clean. `just typecheck` clean |
| Markdown | `just fmt` on this report. Its links were checked by a scratch script against the files under `.plan/`. `git diff --check` is clean on this report. It reports trailing spaces only in the raw outputs under `measurements/`, which keep what the tools printed, unedited, as the window unit's records do. Lint doesn't apply to Markdown |

## Limits

- **The probe can only rule out a large slowdown.** Its A/A bounds are 27 % and 39 % of a rebuild, against an added cost that `DRD-50` infers is well under 1 %. Within one round the arms differed by up to about 1.7 ms, which is the size of a whole rebuild. The likely sources are garbage collection from 2,000 `DOMRect` objects per rebuild and an unpinned process on a mixed-core machine, but no measurement attributes the spread. So "no difference shown" doesn't show that the two rebuilds run at the same speed. It shows that `production` isn't slower by more than about a third of a rebuild. `DRD-50`'s result rule keeps the shared rebuild on this reading. Whether a probe with a tighter bound is owed is for the architect.
- `xy()`'s rebuild with something in flight wasn't timed. The handoff's cases don't include it.
- The probe ran in Chromium only, as the handoff specifies.

## For the architect

- Record the result under `DRD-50`:
  - range settling is in place, and W7 and W8 are shown by M7 and M8;
  - the probe reads "no difference shown" in both cases, with the bounds above;
  - item 5 didn't apply;
  - one probe process was rerun for its batch length.
- The owner then accepts or refuses the window's bytes with this unit's figures. "sortable + y" is +143 B Brotli against `71f20df20` with 12 B left, and "sortable + xy" is +36 B with 15 B left. "complete" was already red and is now 291 B over. No ceiling moved.
- `DRF-21`, and `DRD-45` property 9 before any `--prove` or `--floors`, are unchanged. No `compare.ts` run, campaign, `--prove` or `--floors` ran.