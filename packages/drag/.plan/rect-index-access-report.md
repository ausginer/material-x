# RectIndex access report

**Unit:** [`rect-index-access-handoff.md`](rect-index-access-handoff.md), implementing `DRD-61`. **Branch:** `drag/rect-index-ownership`, in its worktree, at the owner's direction. **Input:** `2e47e7afe`, whose `packages/drag/src`, `tests` and `bench` equal `8904947f6`'s. **Source and test commit:** `010a9ef39`. The report and its measurements are in the commit after it.

**For the architect, before anything else:**

- **No timing verdict is "slower".** All three cases read "no difference shown", which is an inconclusive result (§Timing).
- **`DRD-61` property 11 and the handoff's item 7 call the A/A figure a bound on the slowdown.** This report doesn't. The A/A figure is the threshold the paired rule uses, and it doesn't limit the size of a slowdown the check could miss. §Wording for the architect proposes a correction. I didn't edit `DRD-61`, because records outside this unit's report and measurements are outside §Boundaries.
- **No return condition was met.**

**Governing records:** `DRD-61` properties 1 to 11, and what it amends (`DRD-52`, `DRD-58`, `DRD-50` and `DRD-33` choice 9); `DRD-60`; `DRD-39`; `DRD-44` property 6; `DRD-51` properties 1 to 3; `DRF-38` and `repo:RF-31`; CONTRIBUTING Part I §Class encapsulation and Part II §0, §8 and §14.

## Tools and environment

- **The tools were identical at the base and at the end:** Node v26.13.0, `rolldown` 1.3.2, `tsdown` 0.23.7, `vitest` and `@vitest/browser-playwright` 5.1.0, `playwright` 1.65.0, `typescript` 6.0.2, `typedoc` 0.28.20, and Google Chrome for Testing 157.0.8103.38 at `/usr/local/bin/chrome` ([base](measurements/2026-11-13-rect-index-access-unit-tools-base.txt), [end](measurements/2026-11-13-rect-index-access-unit-tools-end.txt), [script](measurements/2026-11-13-rect-index-access-unit-tools.sh.txt)).
- **The worktree had no `node_modules`.** Before item 1, I reflink-copied the main checkout's installed packages into it: the root `node_modules`, and each package's `node_modules` without the `.vite`, `.vite-temp` and `.cache` directories. Nothing was installed. The worktree's lockfile is byte-identical to the main checkout's, before and after the unit. The main checkout was only read.
- **Ignored outputs built in the worktree before item 1:** `npx just build` in `vite-traits-plugin`, `box-quad`, `vite-custom-element-assets` and `tproc`, and `npx just build-prepare` in `material-x`. The first `box-quad` build failed because `vite-traits-plugin` wasn't built yet, and passed after it.
- **Scratch worktrees:** two detached worktrees in my scratch directory, one at `2e47e7afe` for the base's allocation readings and one at `010a9ef39` for the mutations and the end's allocation readings. Their `node_modules` were symbolic links to this worktree's copy, and they built the same ignored outputs. I removed both at the end.
- **Every long process ran through `node bench/campaign.ts run`,** and I waited for each in the foreground. Base: `ria-base`; end: `ria-end` (in this worktree's ignored `.campaigns/`); allocation: `alloc-base`, `alloc-end`; mutations: `mutations`. Each step ran through [a wrapper](measurements/2026-11-13-rect-index-access-unit-step.sh.txt) that prints the exit code and exits 0, so an expected failure doesn't stop the campaign.
- **Chromium only.**

## Item 1. The base

| Step | Result | Record |
| --- | --- | --- |
| 1.1 Tools | Recorded | [tools](measurements/2026-11-13-rect-index-access-unit-tools-base.txt) |
| 1.2 Base | `2e47e7afe`. `git diff --stat 8904947f6 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench` is empty, and every file that differs from `8904947f6` is under `packages/drag/.plan/` | [revision](measurements/2026-11-13-rect-index-access-unit-base-revision.txt) |
| 1.3 Suite | 746 tests, 740 pass. The 6 failures are the size rows "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". The verdict list is byte-identical to the rollback's end | [log](measurements/2026-11-13-rect-index-access-unit-base-suite.log), [verdicts](measurements/2026-11-13-rect-index-access-unit-base-suite-verdicts.txt), [status](measurements/2026-11-13-rect-index-access-unit-base-status.json) |
| 1.4 Size | Every row equal to the rollback's end | [log](measurements/2026-11-13-rect-index-access-unit-base-size.log) |
| 1.5 Lint, typecheck | 49 ESLint errors, equal to the rollback's end list apart from the path, and no oxlint error. Typecheck: `repo:RF-31` only | [lint](measurements/2026-11-13-rect-index-access-unit-base-lint.txt), [typecheck](measurements/2026-11-13-rect-index-access-unit-base-typecheck.txt) |
| 1.6 Declarations | 27 emitted `.d.ts` files copied to scratch | — |
| 1.7 `typedoc` | 2 warnings: `DisplacementInstaller` and `AxisInstaller` | [output](measurements/2026-11-13-rect-index-access-unit-base-typedoc.txt) |
| 1.8 Allocation, `before` copy | 15 launches, all valid. `src/sortable/` copied, and each file checked equal to `8904947f6`'s | [allocation](measurements/2026-11-13-rect-index-access-unit-alloc-base.txt) |

## `DRD-61`, property by property

| Property | Held | Where |
| --- | --- | --- |
| 1. The storage | Yes | `#values` is one `readonly number[]`: the scratch slot, the placeholder at `PLACEHOLDER` (−1), then the slots, `STRIDE` each. `collect` grows it only by `push`. `#placeholderRect`, `ReadonlyFloat64Array`, `pack`, `holds`'s scratch and `linearShift`'s probe scratch are gone. The held placeholder x is two numbers, `heldLeft` and `heldRight`, written only inside `__DEV__` branches |
| 2. The axis at construction | Yes | `constructor(axis: number = LEFT)`. `y()` constructs `new RectIndex(TOP)`, and `xy()` constructs `new RectIndex()`. `shift` and `travel` use `axis`, `axis + RIGHT` and `axis + CENTER_X`, with no branch on the axis |
| 3. Reads | Yes | `at(slot, field)`, `item(slot)` and `insertion(gap)`. The getters `values`, `placeholderRect` and `items` are gone. `count`, `first` and `end` are unchanged |
| 4. Writes | Yes | `shift(lo, hi, delta)` and `travel(slot, getBox, displacement)` are added, and `lend` is gone. `holds` and `travel` read into the scratch slot |
| 5. One read path | Yes | `#read(slot, element, getBox, displacement)` reads the rect, asks `displaced` once, and writes the six fields once, settled. `measure`, `holds` and `travel` use it, and `measurePlaceholder` uses it without a sink |
| 6. The sink | Yes | `displaced(element): boolean`, `readonly dx` and `readonly dy` in `axis.ts`, with their documentation. `layoutAnimation`'s sink does one `Map` lookup and, for a running row, one `getComputedTiming`, and writes two closure variables behind getters. `report` and `retire` are unchanged |
| 7. `linearShift` decides | Yes | `delta` is a local: from `travel` on the first move after an invalidation, and from `rowDistance` with the move's sign after that. Then `shift(lo, hi, delta)`, and `report` through `item`. The writer closure and the `delta` state are gone |
| 8. `xy()` | Yes | Rebuilds through `collect` and `measure(0, count)`, and reads through `at`, `item` and `insertion`. Its `before` array is unchanged |
| 9. The development check | Yes | `verifyEquivalence` copies the window and the placeholder through `at` and `item`. It replaces the placeholder's predicted x with the held x when `heldLeft` isn't `NaN`. Its message is unchanged |
| 10. Witnesses | Yes | §Tests and mutations |
| 11. Costs | Reported | §Size, §Allocation, §Timing |

### Ownership, read from the code at `010a9ef39`

**Every write to the slot array or the element array in `src/sortable/`:**

| File:line               | Write                       | Member              |
| ----------------------- | --------------------------- | ------------------- |
| `rect-index.ts:148`     | `items[n] = item`           | `RectIndex.collect` |
| `rect-index.ts:156`     | `values.push(0)`            | `RectIndex.collect` |
| `rect-index.ts:162`     | `items.length = n`          | `RectIndex.collect` |
| `rect-index.ts:216–218` | near edge, far edge, center | `RectIndex.shift`   |
| `rect-index.ts:298`     | `this.#items.length = 0`    | `RectIndex.retire`  |
| `rect-index.ts:331–336` | the six fields              | `RectIndex.#read`   |

All of them are inside `RectIndex`. The other element writes in `src/sortable/` are to arrays that aren't the index's: `verifyEquivalence`'s local `predicted` and `predictedItems` (`rect-index.ts:369`, `375–376`, `380`), `xy()`'s `before` (`xy.ts:136–137`), and `layoutAnimation`'s box-quad `local` delta (`layout-animation.ts:84–85`). I found the sites with a search for indexed assignments, `push`, `splice`, `fill` and `length` assignments over every file in `src/sortable/`, and then read each one.

**Every member of `RectIndex`, and what it returns:**

| Member | Returns |
| --- | --- |
| `constructor(axis = LEFT)` | — |
| `get count`, `get first`, `get end` | `number` |
| `at(slot, field)` | `number` |
| `item(slot)` | `HTMLElement`, one element |
| `insertion(gap)` | `Insertion`, a new `{ index, before, after }` from `insertionAt`, which keeps no reference to the array |
| `collect`, `measure`, `shift`, `measurePlaceholder`, `invalidate`, `retire` | `void` |
| `travel(slot, getBox, displacement)` | `number` |
| `holds(gap, snapshot, getBox, displacement)` | `boolean` |
| `#read` (private) | `void` |

No member returns the slot array, the element array or a view of either.

**The handoff's search** (`Float64Array`, `lend`, `settle`, `placeholderRect`) over `rect-index.ts`, `axis.ts`, `layout-animation.ts`, `linear-shift.ts`, `y.ts` and `xy.ts` finds only `xy.ts:51` and `xy.ts:131`, the declaration and the growth of `before`. No comment in these files names `lend`, `settle`, a view of the storage or a lifetime. `xy.ts:151`'s "the destination view" is an unchanged comment about destination order.

### Where the code differs from the reference patch

The size readings at the end equal the patch's on every row, so none of these changes costs a shipped byte.

1. **The held placeholder x is two numbers, not a tuple.** The patch kept `heldX: [number, number] | null` and allocated an array in the development branch. `DRD-61` properties 1 and 9 say two numbers. `linearShift` now holds `heldLeft` and `heldRight`, with `NaN` meaning that no re-read followed the last move. `verifyEquivalence` takes the two numbers. "None" is reachable: an `invalidate` between a move and the next frame clears the stale placeholder, and a later `refresh` can still run the check, so a sentinel is needed. `__DEV__` folds the variables away in the published build.
2. **The sink's `record` literal stays on one line.** The patch reflowed `const record: RowAnimation = { animation, dx: sx, dy: sy };` over five lines. `DRD-61` property 6 changes nothing else in the sink, and `oxfmt` accepts the one-line form.
3. **`rect-index.ts`'s module JSDoc** names all three reads, states that every write is a method, and states that the axis is chosen at construction (item 2.7). The patch named only `at`, and didn't mention the axis.
4. **The `#axis` comment** says that an index that never shifts keeps the default. The patch said it "has none", which isn't true of `xy()`'s index, constructed with `LEFT`.
5. **Three comments are rewrapped** to 80 columns: `DisplacementSink`'s summary in `axis.ts`, `LinearShift.moved`'s JSDoc, and the test file's header. The emitted `axis.d.ts` therefore wraps the summary differently from the architect's diff. The words are the same.

**One forced change outside W7 and W8.** The receiver test, "should call the layoutAnimation sink with its receiver, with rows in flight", spied on `settle`, which no longer exists. It spies on `displaced` now, as in the patch. Its title and assertions are unchanged, and it passes.

## Tests and mutations

**The two W7 tests** are retitled as `DRD-61` property 10 gives. `recordDisplaced` records each `displaced` call with the destination rows read since the previous call, and `expectOwnRows` asserts that each call's rows are exactly its element. The `y()` test asserts at least 4 distinct rows. The `xy()` test asserts 11 distinct rows and at least 22 calls. `recordSettles`, `measurementsOf` and `expectCacheRanges` are gone. **W8** asserts the settled top as the presented top minus `dy`.

**The suite at the end,** all projects, Chromium: 746 tests, 740 pass, and the 6 failures are the base's size rows ([log](measurements/2026-11-13-rect-index-access-unit-end-suite.log), [verdicts](measurements/2026-11-13-rect-index-access-unit-end-suite-verdicts.txt)).

| Project | Base | End |
| --- | --- | --- |
| browser (chromium) | 354 pass | 354 pass |
| shipped (chromium) | 9 pass | 9 pass |
| consumer (chromium) | 326 pass | 326 pass, the same files and titles |
| declaration | 20 pass | 20 pass |
| node | 31 pass, 6 size rows fail | the same |

Against the base's list, only the two W7 titles differ. W8 and the receiver test keep their titles and verdicts at new line numbers. `drag:DRD-52 development equivalence check` passes. No size verdict changes.

**Mutations,** at `010a9ef39` in a scratch worktree, each with `npx vitest run -c vitest.config.ts --project browser`:

| Mutation | The change | Files run | Failed | Required | Record |
| --- | --- | --- | --- | --- | --- |
| M7a | `#read` asks `displaced(this.#items[0]!)` | `tests/displacement-sink.browser.test.ts` | 4 of 4: both W7 tests, W8 and the receiver test | Both W7 tests | [patch](measurements/2026-11-13-rect-index-access-unit-mutation-M7a.diff.txt), [output](measurements/2026-11-13-rect-index-access-unit-mutation-M7a.txt) |
| M7b | `xy()`'s rebuild measures with `null` for the sink | the whole `browser` project | 1 of 354: the `xy()` W7 test only | The `xy()` W7 test | [patch](measurements/2026-11-13-rect-index-access-unit-mutation-M7b.diff.txt), [output](measurements/2026-11-13-rect-index-access-unit-mutation-M7b.txt) |
| M8 | `#read` subtracts nothing when `displaced` answers `true` | `tests/displacement-sink.browser.test.ts` | 3 of 4: W8, the `y()` W7 test and the receiver test | W8 | [patch](measurements/2026-11-13-rect-index-access-unit-mutation-M8.diff.txt), [output](measurements/2026-11-13-rect-index-access-unit-mutation-M8.txt) |
| M-axis | `y()` constructs `new RectIndex(LEFT)` | `tests/sortable.browser.test.ts`, `tests/equivalence-check.browser.test.ts` | 18 of 50. The development check's message appears 20 times in the output | At least one, on the check's fault | [patch](measurements/2026-11-13-rect-index-access-unit-mutation-M-axis.diff.txt), [output](measurements/2026-11-13-rect-index-access-unit-mutation-M-axis.txt) |

Under M8, the `y()` W7 test and the receiver test also fail because the development check faults on the unsettled slot and the drag cancels. The runner script is [here](measurements/2026-11-13-rect-index-access-unit-mutation-run.sh.txt).

## The publication

- **One `.d.ts` file differs: `sortable/axis.d.ts`.** `settle` and its documentation are replaced by `displaced`, `dx` and `dy` and theirs, and the interface's summary describes the answer. No `.d.ts` is added or removed: 27 at both ends ([diff](measurements/2026-11-13-rect-index-access-unit-dts.diff.txt)).
- **`typedoc`** warns as at the base: `DisplacementInstaller` and `AxisInstaller` only ([end output](measurements/2026-11-13-rect-index-access-unit-end-typedoc.txt)).

## Size

`npx just size`, minified / gzip-9 / Brotli-11 ([base](measurements/2026-11-13-rect-index-access-unit-base-size.log), [end](measurements/2026-11-13-rect-index-access-unit-end-size.log)). The gate is Brotli-11.

| Row | Base | End | End − base | Modules | Verdict, base → end |
| --- | --: | --: | --: | --: | --- |
| draggable alone | 6728 / 2422 / 2189 | the same | 0 / 0 / 0 | 7 | fails → fails: over 2,139 B by 50 B, and "control moved by 165 B" |
| draggable + lift | 11539 / 4397 / 3968 | the same | 0 / 0 / 0 | 9 | passes → passes |
| example: resize handle | 9385 / 3664 / 3314 | the same | 0 / 0 / 0 | 9 | fails → fails: over 3,313 B by 1 B |
| example: drop zone | 13178 / 5101 / 4598 | the same | 0 / 0 / 0 | 13 | fails → fails: over 4,431 B by 167 B |
| example: canvas group | 9521 / 3623 / 3300 | the same | 0 / 0 / 0 | 9 | passes → passes |
| freeDrag | 15157 / 5565 / 5018 | the same | 0 / 0 / 0 | 15 | fails → fails: over 4,967 B by 51 B |
| freeDrag + bounds + landing | 16322 / 6055 / 5450 | the same | 0 / 0 / 0 | 19 | fails → fails: over 5,210 B by 240 B |
| sortable + y | 20435 / 7323 / 6619 | 20230 / 7295 / 6588 | **−205 / −28 / −31** | 20 | passes → passes, 145 B under 6,733 B |
| sortable + xy | 19979 / 7206 / 6515 | 20082 / 7271 / 6537 | **+103 / +65 / +22** | 19 | passes → passes, 80 B under 6,617 B |
| complete | 22114 / 8049 / 7258 | 21812 / 7956 / 7166 | **−302 / −93 / −92** | 24 | fails → fails: over 7,065 B by 193 B, then by 101 B |

- **The seven control rows read exactly 0/0/0.**
- **The three `sortable` rows equal the handoff's expected figures exactly.**
- **No verdict changes,** and every row's module count and list is unchanged. No ceiling or control figure was changed.

## Allocation

**Bytes allocated, not speed.** These are heap-sampling readings in the `shipped` project, Chromium, with `__DEV__` false. They are not gated. Three launches per probe and tree, one probe per launch, the base first, with the same probe text at both trees. All 30 launches are valid: each line names at least one function under `sortable/`, and none was discarded ([base](measurements/2026-11-13-rect-index-access-unit-alloc-base.txt), [end](measurements/2026-11-13-rect-index-access-unit-alloc-end.txt)).

| Probe | Base, mean (range) | End, mean (range) | End − base | Larger than the spread in either tree? |
| --- | --: | --: | --: | --- |
| Per `y()` sample | 85.74 B (83.21–87.33) | 50.99 B (49.96–52.01) | **−34.74 B (−40.5 %)** | Yes. The ranges don't overlap |
| Per `xy()` sample | 49.49 B (48.46–50.29) | 49.69 B (48.35–51.09) | +0.21 B | No |
| Per committed move, cold | 128.75 B (124.62–133.98) | 116.97 B (115.14–118.10) | **−11.77 B (−9.1 %)** | Yes. The ranges don't overlap |
| Per committed move, warm | 15.29 B (14.56–16.28) | 16.68 B (15.92–17.16) | +1.39 B | No. The ranges overlap |
| Per drop with `layoutAnimation()` | 3721.15 B (3706.80–3728.93) | 3314.62 B (3292.87–3335.60) | **−406.53 B (−10.9 %)** | Yes. The ranges don't overlap |

These match the proposal's expectation: reductions per `y()` sample, per cold move and per drop with a sink, and no difference shown per `xy()` sample and per warm move.

**Functions whose bytes grew,** as the mean over three launches:

- **Per `y()` sample:** `operation.ts:move`, 19,701 → 20,397 B. That function isn't changed by this unit, and it is the only sortable function at the end. At the base, `y.ts:resolve` (~9,170 B) and `linear-shift.ts:refresh` (~5,360 B) also allocated.
- **Per `xy()` sample:** `operation.ts:move`, 19,795 → 19,877 B, within its spread.
- **Per cold move:** `rect-index.ts:shift` (13,572 B), `#read` (8,480 B) and `collect` (75 B) are new. They replace `linear-shift.ts:advance` (~11,204 B), `rect-index.ts:pack` (~5,169 B), `measurePlaceholder` (~3,216 B) and `linear-shift.ts:refresh` (~4,852 B).
- **Per warm move:** `#read` (3,312 B) and `collect` (24 B) are new. They replace `linear-shift.ts:refresh` (~3,035 B) and `pack` (24 B).
- **Per drop:** `#read` (14,737 B), `shift` (9,084 B), `at` (3,396 B), `travel` (2,468 B) and `displaced` (19 B) are new, and `layoutAnimation`'s anonymous function grew from 4,611 to 4,636 B. At the base, `pack` (7,424 B), `advance` (8,764 B), `refresh` (3,644 B), `measurePlaceholder` (2,101 B) and `measure` (1,925 B) allocated, and they no longer do. `moved` fell from 17,989 to 1,892 B, and `holds` from 18,341 to 4,432 B.

**What allocates in the new functions isn't established here.** `shift`, `#read` and `at` construct no object in their source. A likely cause is numbers stored as heap objects, but I didn't verify it, and it doesn't change the totals above.

## Timing

**Run:** one Chromium process, one page, 7 rounds in rotated order per case, one attempt. It completed, and it wasn't repeated. The probe is built on `DRD-50` property 2's paired probe. It isn't a `bench/` file or a `compare.ts` row, and it changes no instrument ([page](measurements/2026-11-13-rect-index-access-unit-timing-page.ts.txt), [runner](measurements/2026-11-13-rect-index-access-unit-timing-runner.ts.txt), [bundle](measurements/2026-11-13-rect-index-access-unit-timing-bundle.js.txt), [output](measurements/2026-11-13-rect-index-access-unit-timing-output.txt), [JSON](measurements/2026-11-13-rect-index-access-unit-timing.json)).

- **Arms:** `before` drives the copy of `8904947f6`'s `src/sortable/`, and `production` and `control` drive `010a9ef39`'s `src/sortable/`, imported from the worktree. `rolldown` bundles both trees into one IIFE with `__DEV__` defined as `false`. Each arm uses its own tree's `y()` or `xy()` installer through `resolve` and `invalidate`, and in case B its own tree's `layoutAnimation()` sink.
- **Surfaces:** a wrapping flex field of 2,000 cells of 40 × 20 px in 81 rows, and a column of 2,000 rows of 20 px. Each has a placeholder after item 1,000, so the committed gap is 1,001, and the dragged item is in the snapshot and outside the container.
- **Cases:** A is `invalidate()` then `resolve` at a fixed pointer over cell 500. B is A with the sink, with nothing in flight. C is `resolve` at a pointer over the last row, after one `resolve` there grew the window to the end of the list.
- **Check before timing:** one operation per arm with `getBoundingClientRect` counted. A and B read 2,001 rects per arm, and **C read 0 in every arm**. Every arm answered the same gap: 500 in A and B, and 2,000 in C.
- **Machine:** 12th Gen Intel Core i7-1255U, 12 CPUs (cores 0–3, atoms 4–11), not pinned (affinity mask `fff`). Load averages 2.45, 3.31, 3.55 before, and 2.95, 3.27, 3.52 after.
- **The hold (`DRD-44` property 6):** confirmed by the owner at 13:04:04 UTC. The probe ran from 13:04:04 to 13:05:01, and the owner confirmed the release at 13:06:57. Nothing else from this session ran in that interval ([hold](measurements/2026-11-13-rect-index-access-unit-timing-hold.txt)).

**The rule** is `compare.ts`'s paired rule, as in `DRD-50` property 2. "Slower" needs `production` above `before` in at least 6 of 7 rounds, and a median difference above the A/A threshold. The A/A threshold is the largest absolute `control` − `production` difference across the 7 rounds. "Faster" is the mirror. Anything else is "no difference shown".

| Case | Before median per operation | Rounds higher / lower | Median `production` − `before` | A/A threshold | Verdict |
| --- | --: | --- | --: | --: | --- |
| A: `xy()` rebuild, no sink | 1,438.672 µs | 4 / 3 | +27.344 µs (+1.9 %) | 336.719 µs (23.4 %) | no difference shown |
| B: `xy()` rebuild, `layoutAnimation()`, nothing in flight | 1,470.313 µs | 3 / 4 | −32.812 µs (−2.2 %) | 669.922 µs (45.6 %) | no difference shown |
| C: `y()` scan of a grown window, no sink | 2.335 µs | 0 / 7 | −0.424 µs (−18.2 %) | 0.460 µs (19.7 %) | no difference shown |

Percentages are shares of the base's median operation. Batches: 256, 256 and 262,144 operations. The shortest timed batches were 302.3, 270.6 and 398.0 ms, all at least 100 ms.

**How to read the three verdicts:**

- **Each is inconclusive.** The run met neither the "slower" rule nor the "faster" rule, so it doesn't show the two trees at equal speed.
- **The A/A threshold isn't a limit on the slowdown.** It is the rule's threshold, taken from this run's noise. A slowdown of any size, including one larger than the threshold, can produce "no difference shown" when its rounds don't agree 6 times in 7. So the check can't exclude a slowdown above the threshold, and a slowdown below it is unmeasured.
- **Case C isn't reported as faster.** `production` was lower in 7 of 7 rounds, but the median, 0.424 µs, is below the threshold, 0.460 µs. Whether `y()`'s scan is faster or slower is unmeasured.
- **The noise was large in A and B.** Single rounds ran up to 47 % above their arm's median: `before` in A's round 3, and `before` and `production` in B's rounds 3 and 5.

**Allocation isn't speed.** The reductions in §Allocation are bytes allocated. No speed is inferred from them.

## Lint and typecheck

- **Whole-package lint at the end:** the base's 49 errors by file, rule and message, and no other. The only change is `DRF-38`'s `func-name-matching` error, which moves from 57:3 to 53:3 in `tests/displacement-sink.browser.test.ts` with the edit. oxlint reports none ([base](measurements/2026-11-13-rect-index-access-unit-base-lint.txt), [end](measurements/2026-11-13-rect-index-access-unit-end-lint.txt)).
- **Typecheck:** `repo:RF-31` only, at both ends ([base](measurements/2026-11-13-rect-index-access-unit-base-typecheck.txt), [end](measurements/2026-11-13-rect-index-access-unit-end-typecheck.txt)).
- **The changed files** went through [`handoff.md`](../../../.agents/docs/handoff.md)'s loop from `packages/drag`: `fmt`, `lint-fix`, `fmt` and `lint`. `lint-fix` changed nothing; I compared the diff before and after it. The only error left is `DRF-38`'s. No error was repaired, by hand or by autofix.

## Verification

| Check | Result |
| --- | --- |
| Item 1 | All recorded, and each matched the handoff's expectation |
| The tools | Identical at the base and at the end |
| `git diff --stat 2e47e7afe..HEAD -- packages/drag .scripts` | The seven allowed files, this report and `measurements/2026-11-13-rect-index-access-unit-*` |
| The handoff's search | Only `xy.ts`'s `before`, at its declaration and its growth |
| Ownership lists | Every write site is inside `RectIndex`, and no member returns the storage, the element array or a view |
| Source projects | The same titles and verdicts as at the base, apart from the two replaced W7 titles, which pass |
| Node project | The same titles and verdicts. No size verdict changes |
| Consumer project | The same files and tests, and all pass |
| Development check, W8, receiver test | Pass in Chromium |
| M7a, M7b, M8, M-axis | Each fails what item 4 names |
| Publication | One `.d.ts` differs, and `typedoc` is unchanged |
| Lint, typecheck | The baseline, and nothing new |
| Size | Every row at both ends. The controls read 0/0/0 |
| Allocation | 30 valid launches, all saved |
| Timing | Three verdicts, medians and thresholds, the machine and the hold |
| Markdown | `oxfmt`, and a script check of this report's 43 links: none missing. `git diff --check` passes on this report. It reports trailing whitespace and blank last lines only inside the saved tool outputs, which are kept unedited, as earlier units' logs are. No linter is configured for Markdown |

## Wording for the architect

**`DRD-61` property 11, the timing bullet:** "'No difference shown' bounds only a slowdown larger than its A/A bound." **The handoff's item 7, §How the report reads it:** "Report the median difference and the A/A bound … A slowdown smaller than the bound is unmeasured", with "`DRD-50`'s bounds were 27 % and 39 % of a rebuild".

Both read the A/A figure as a limit on the slowdown the check would have caught. It isn't one. The rule's "slower" needs two things: 6 of 7 rounds in the same direction, and a median above the A/A figure. A real slowdown larger than the A/A figure can fail the first in a noisy run, and then reads "no difference shown". The figure is one run's largest A/A difference, with no stated confidence level. In this run it was 46 % of the operation in case B.

A proposed wording: "'No difference shown' is inconclusive: the run met neither directional rule. The report gives the median difference and the A/A threshold that the rule used. Neither limits the size of a slowdown the check could have missed."

This unit didn't change the rule or `DRD-61`.

## What didn't run

- **Firefox and WebKit,** deferred to the owner's planned CI. This unit claims no cross-engine verification.
- **`compare.ts` scenarios, `--prove`, `--floors`, the page check, B3' and the in-page floors.** The handoff forbids them, and the deferred campaigns stay stopped.
- **The inlining trace** (`inline-check.ts.txt`). The handoff doesn't ask for it.
- **Budgets:** no ceiling or control figure changed.

## Scratch work

- **Removed:** both scratch worktrees and the timing probe's scratch directory, after their files were saved here.
- **Kept, owned by this unit:** this worktree's copied `node_modules`, the ignored builds in the sibling packages, and `packages/drag/.campaigns/ria-base` and `ria-end`. All are ignored, and the next role in this worktree can use them.

## Next

The architect reads this report, decides its acceptance, and decides on §Wording for the architect. `DRO-4`'s re-base, `DRF-38`'s scope and the rollback report's acceptance stay separate.

## Follow-up after the independent review

The owner's request moved this follow-up onto `drag/size`, where it landed with the owner's edits. The old comment, the new comment and the checks are in [`owner-edits-integration-report.md`](owner-edits-integration-report.md) §What changed and §Lint. The list's entries kept their routing. The only entry that changed is the renamed `tests/callbacks.browser.test.ts`.