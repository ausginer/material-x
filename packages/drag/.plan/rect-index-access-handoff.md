# RectIndex access handoff

**For:** one `implementer` unit on `drag/size`. **Base:** `drag/size` at `8904947f6`, after the mangling rollback. If `drag/size`'s tip has moved past `8904947f6` and the move changes anything under `packages/drag/src/sortable/`, `packages/drag/tests/displacement-sink.browser.test.ts` or `packages/drag/bench/`, return before item 1.

**The rollback's report isn't accepted yet.** The architect hasn't read [`mangle-rollback-report.md`](mangle-rollback-report.md). On the owner's direction, this unit takes `8904947f6`'s code as its base anyway, and doesn't wait for that acceptance.

**One set of tools.** Read the base and the end with the same installed dependencies. Between item 1 and the end, don't run `npm install` or `npm ci`, and don't change `node_modules`, a lockfile or a browser. Every comparison in this unit is between this unit's base and its end. The architect's readings below are expectations, and the rollback report's figures are a cross-check.

**Chromium only.** Local browser checks, witnesses and probes run in Chromium, with the container's Chrome as `.scripts/vitest-config.ts` configures it ([`performance-plan.md`](performance-plan.md) §3). Firefox and WebKit are deferred to the CI the owner plans, and this unit claims no cross-engine verification.

**Governing records** in [`00-index.md`](00-index.md):

- **`DRD-61`, properties 1 to 11.** This is the owner's approval of proposal P and its sink interface, with the owner's direction of 2026-11-13.
- **What `DRD-61` amends:** `DRD-52`, `DRD-58`, `DRD-50` and `DRD-33` choice 9.
- **`DRD-60`:** the restored names, and the publication as unminified ESM.
- **`DRD-39`:** the installer types are unpublished.
- **`DRD-44` property 6:** the hold for the timing check.
- **`DRD-51` properties 1 to 3:** readings, control rows and the stopped campaigns.
- **`DRF-38` and `repo:RF-31`,** with the 49 lint errors in the rollback report's §Baseline errors.
- **CONTRIBUTING:** Part I §Class encapsulation, and Part II §0, §8 and §14.

**The proposal and its evidence:** [`rect-index-access-proposal.md`](rect-index-access-proposal.md), and [`probes/rect-index-access/`](probes/rect-index-access/README.md).

**Goal:** after this unit, `RectIndex` holds the scratch slot, the placeholder and the destination slots in one `number[]`, and its axis is chosen at construction. Code outside reads one value at a time, and every write to the geometry is a method of the class. `linearShift` decides `lo`, `hi` and `delta`, and `RectIndex.shift` applies them. The sink answers `displaced(element)` and holds `dx` and `dy`, and receives no array. The report gives the size, allocation and timing readings, and keeps what was measured apart from what wasn't.

## The reference patch

[`patches/P-restored-names.diff.txt`](probes/rect-index-access/patches/P-restored-names.diff.txt) applies to `8904947f6` with `git apply`, and changes exactly the seven files that §Boundaries allows. It is P with each `_` removed, then formatted, linted and autofixed as [`handoff.md`](../../../.agents/docs/handoff.md) orders.

**What the architect checked on it,** in a scratch worktree at `8904947f6`, in Chromium ([checks](measurements/2026-11-13-rect-index-access-restored-checks.txt), [size](measurements/2026-11-13-rect-index-access-restored-size.txt)):

- **The suite:** 746 tests, 740 pass. The 6 failures are the size rows that fail at the base. Against the rollback's end verdicts, only the two W7 titles differ.
- **Typecheck:** `repo:RF-31` only. **Lint** of the seven files: only `DRF-38`'s error, now at line 52.
- **Mutations:** M7a fails both W7 tests, M7b only the `xy()` W7 test, M8 fails W8, and M-axis fails 18 of 50 tests on the development check's fault.
- **The flows** pass.
- **Declarations:** only `sortable/axis.d.ts` differs from the base.
- **Size:** −31, +22 and −92 B Brotli on the three `sortable` rows, and the controls read 0/0/0.

**You may start from the patch, and you own every property.** Read each hunk against `DRD-61`, and change what doesn't meet a property. Where your code differs from the patch, the report says where and why. The patch wasn't run under the allocation probes or a timing check at this base.

## Boundaries

**Change only:**

- **`packages/drag/src/sortable/rect-index.ts`:** `DRD-61` properties 1 to 5 and 9.
- **`packages/drag/src/sortable/axis.ts`:** `DisplacementSink`'s `settle` is replaced by `displaced`, `dx` and `dy`, with their documentation (property 6). Nothing else changes in this file.
- **`packages/drag/src/sortable/layout-animation.ts`:** the sink's `displaced`, `dx` and `dy`, which replace `settle` (property 6).
- **`packages/drag/src/sortable/linear-shift.ts`:** property 7, and the development check's held placeholder x (property 9).
- **`packages/drag/src/sortable/y.ts`:** `new RectIndex(TOP)`, reads through `at`, and the insertion through `insertion`.
- **`packages/drag/src/sortable/xy.ts`:** reads through `at`, `item` and `insertion` (property 8). Its rule and its `before` array don't change.
- **`packages/drag/tests/displacement-sink.browser.test.ts`:** the two W7 tests and their helpers, and W8's settled-top assertion (property 10). No other test's title or assertions change.
- **Records:** the report, and `measurements/` files with the prefix `2026-11-<day>-rect-index-access-unit-`.

**Do not change:**

- **any other file under `packages/drag/`,** including every other test, `bench/` and `bench/size/measure.ts`, every ceiling and the control figure, `tsdown.config.ts`, `tsconfig.json`, `package.json`, `files.json` and every Vitest configuration;
- **`xy.ts`'s `before`,** and any fixed-size buffer outside `src/sortable/`, such as box-quad's out parameters, `free-drag/geometry.ts`, the stories and the fixtures;
- **the existing lint and typecheck errors.** Don't repair `DRF-38`'s error, the other 48 lint errors or `repo:RF-31`, by hand or by autofix. If `lint-fix` changes a line that this unit doesn't otherwise change, revert that change and record it;
- `.scripts/`, the root `package.json`, any lockfile, `node_modules` and browser installations;
- any committed probe under `.plan/probes/`, and `.plan/reviews/`.

**Do not run:**

- `compare.ts` scenarios, or `--prove` or `--floors` without `--dry`;
- the page check, B3' or the in-page floors;
- Firefox or WebKit checks, `npx just test-engines`, or browser installation.

Item 7's timing check is a probe of its own, not a `compare.ts` row and not one of the deferred campaigns.

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`. Wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table.**

## Item 1. The base

Before any change, from `packages/drag`:

1. **Record the tools:** the versions of Node, `rolldown`, `tsdown`, `vitest`, `@vitest/browser-playwright`, `playwright`, `typescript` and `typedoc` as they resolve from `packages/drag`, and Chrome's `--version`. Record the list again at the end. The two lists must be identical.
2. **Record the base:** `git rev-parse HEAD`, and `git diff --stat 8904947f6 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench`, which must be empty.
3. **Run the Chromium suite through the runner,** and record every title and verdict. Expected: 746 tests, of which 740 pass, and the 6 failures are the size rows "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". That is the rollback's end ([verdicts](measurements/2026-11-13-rollback-end-suite-verdicts.txt)). If a fresh worktree's suite doesn't start, the rollback report's §Tools and environment lists the three ignored outputs it needed.
4. **Take the base size reading** with `npx just size`, and record every row. Expected: equal to the rollback's end ([log](measurements/2026-11-13-rollback-end-size.log)).
5. **Lint and typecheck the whole package** with `npx just lint` and `npx just typecheck`. Expected: the 49 ESLint errors of [the rollback's end list](measurements/2026-11-13-rollback-end-lint.txt), apart from the absolute path, no oxlint error, and `repo:RF-31` only. Save both outputs. They are this unit's baseline.
6. **Keep the base build.** Copy the emitted `.d.ts` files to a scratch directory outside the checkout, for item 5.
7. **Run `typedoc --options typedoc.json --out <scratch>`** and record its warnings. Expected: exactly `AxisInstaller` and `DisplacementInstaller` (`DRD-39` property 3).
8. **Take the base allocation readings** (item 6), and **copy the base's `src/sortable/`** to the timing probe's `before` source (item 7).

## Item 2. `RectIndex`

**Required properties:** `DRD-61` properties 1 to 5 and 9. In short:

1. **One storage.** `#values` is one `readonly` `number[]`, holding the scratch slot, the placeholder at `PLACEHOLDER` (−1), then the destination slots. `collect` grows it only by appending. `#placeholderRect`, `ReadonlyFloat64Array`, `pack` and `holds`'s scratch go.
2. **The axis at construction:** `constructor(axis: number = LEFT)`. `shift` and `travel` use `axis`, `axis + RIGHT` and `axis + CENTER_X`, and no branch depends on the axis.
3. **Reads:** `at(slot, field)`, `item(slot)` and `insertion(gap)`. The getters `values`, `placeholderRect` and `items` go. `count`, `first` and `end` stay.
4. **Writes:** `shift(lo, hi, delta)` and `travel(slot, getBox, displacement)` are added, and `lend` goes. `holds` and `travel` read into the scratch slot.
5. **One private read path:** it reads the rect, asks `displaced` once, and writes the six fields once, settled.
6. **The development check** (`verifyEquivalence`) copies through `at` and keeps the placeholder's held x, two numbers written only inside `__DEV__` branches. Its message doesn't change.
7. **Comments:** the module JSDoc and each member's JSDoc describe the one storage, the axis, and that every write is a method. No comment mentions `lend`, `settle`, a view or a lifetime.

**Show the ownership by reading, not by an instrument.** The report lists every site in `src/sortable/` that writes the storage or the element array, with its line, and each must be inside `RectIndex`. It also lists every member of `RectIndex` and what it returns, and none may return the storage, the element array or a view of either.

## Item 3. The sink, `linearShift`, `y()` and `xy()`

**Required properties:** `DRD-61` properties 6 to 8.

1. **`DisplacementSink`:** `displaced(element: HTMLElement): boolean`, `readonly dx: number` and `readonly dy: number`. Their documentation states that the offsets hold until the next call, in viewport units, and that the answer reads no layout. `settle` goes.
2. **`layoutAnimation`'s sink:** `displaced` does one `Map` lookup and, for a running row, one `getComputedTiming`, and writes its two closure variables. `dx` and `dy` are getters over them. Nothing else in the sink changes, including `report` and `retire`.
3. **`linearShift.moved`:** `lo` and `hi` as now. `delta` comes from `travel` on the first move after an invalidation, and from the known distance after that. Then it calls `shift(lo, hi, delta)`, and reports through `item`. The writer closure and the `delta` state go. **The scratch and the one-element array go.**
4. **`y()`** constructs `new RectIndex(TOP)`. **`xy()`** constructs `new RectIndex()`, and its rule and `before` are unchanged.

## Item 4. The tests

**Required properties:** `DRD-61` property 10.

1. **W7, replaced.** The two `drag:DRD-50` W7 tests are retitled as `DRD-61` property 10 gives. Their helpers record each `displaced` call with the destination rows read since the previous call, and assert that each call's rows are exactly its element. The `y()` test asserts at least four distinct rows. The `xy()` test asserts 11 distinct rows and at least 22 calls. `recordSettles`, `measurementsOf` and `expectCacheRanges` go.
2. **W8** asserts the settled top as the presented top minus `dy`. Its title and its other assertions don't change.
3. **No other test changes.**
4. **The mutations,** each in a scratch copy, run with `npx vitest run -c vitest.config.ts --project browser` on the named files. Save each patch and its output.

   | Mutation | The change | Must fail |
   | --- | --- | --- |
   | M7a | The read path asks `displaced` about the element at slot 0 (`this.#items[0]!`) instead of the element it read | Both W7 tests, in `tests/displacement-sink.browser.test.ts` |
   | M7b | `xy()`'s rebuild calls `measure` with `null` for the sink | The `xy()` W7 test. Record which other tests fail, if any |
   | M8 | The read path subtracts nothing when `displaced` returns `true` | "drag:DRD-50 should settle a row in flight when the window grows over it, and hold the gap its flow position gives" |
   | M-axis | `y()` constructs its index with `LEFT` | At least one test in `tests/sortable.browser.test.ts` or `tests/equivalence-check.browser.test.ts`, on the development check's fault |

   A mutation that doesn't fail its tests is a return condition.

## Item 5. The publication

1. **`.d.ts` files.** Compare every emitted `.d.ts` with item 1 step 6's copy. **Exactly one file differs:** `sortable/axis.d.ts`, where `settle` and its documentation are replaced by `displaced`, `dx` and `dy` with theirs, and the interface's summary line describes the answer. No `.d.ts` is added or removed. Save the diff. The architect's diff is in [the checks](measurements/2026-11-13-rect-index-access-restored-checks.txt).
2. **`typedoc`** warns exactly as at item 1 step 7.

## Item 6. Size and allocation

**Size.** Report every row with `npx just size` at the base and at the end: minified, gzip-9 and Brotli-11, the difference, and each row's verdict at both points.

- **Control rows:** "draggable alone", "draggable + lift", "example: resize handle", "example: drop zone", "example: canvas group", "freeDrag" and "freeDrag + bounds + landing". Each must read exactly 0/0/0. A non-zero control row is a finding: report it before you continue.
- **Expected,** from the reference patch, minified / gzip-9 / Brotli-11: "sortable + y" −205 / −28 / −31, "sortable + xy" +103 / +65 / +22 and "complete" −302 / −93 / −92. If your code differs from the patch, give each row's difference from these figures and its cause.
- **Expected verdicts:** none changes. "complete" stays over its 7,065 B ceiling, by about 101 B instead of 193 B. A changed verdict isn't a return condition: list it and keep the ceiling. The architect routes it to `DRO-4`.
- **The proposal's figures at `f552e0ec9` aren't targets.** They were read with the `_` names, and its "renamed" column under the mangling that `DRD-60` removed.
- Every row's module list must be unchanged.

**Allocation,** at the base and at the end, in Chromium, in the `shipped` project. Follow [the `DRD-52` probe README](probes/rect-index-ownership/README.md#launching-the-allocation-probes):

- a scratch worktree for each tree, with the checkout's installed packages and nothing installed into either;
- the probe files appended to a scratch copy of `tests/hot-path.browser.test.ts`, never to the committed file;
- one probe test per launch, three launches per probe, through the runner;
- the base's launches first, then the end's, with the same probe text in both.

| Probe | File | `-t` pattern |
| --- | --- | --- |
| Per `y()` sample | [`alloc-probe.test.ts.txt`](probes/rect-index-ownership/alloc-probe.test.ts.txt) | `'C6 probe y:'` |
| Per `xy()` sample | the same file | `'C6 probe xy:'` |
| Per committed move, cold | [`move-probe.test.ts.txt`](probes/rect-index-ownership/move-probe.test.ts.txt) | `'C6 move probe'` |
| Per committed move, warm | [`warm-move-probe.test.ts.txt`](probes/rect-index-ownership/warm-move-probe.test.ts.txt) | `'C6 warm move probe'` |
| Per drop with `layoutAnimation()` | [`sink-drop-probe.test.ts.txt`](probes/rect-index-access/sink-drop-probe.test.ts.txt) | `'RIA sink drop probe'` |

Save every printed line, with each function's bytes. Report the means and ranges at both trees and the difference. Say for each probe whether the difference is larger than the spread inside either tree, and name every function whose bytes grew. **These readings aren't gated.** A line that reads 0 B with no function under `sortable/` isn't a reading. Discard its launch, keep it in the record with the reason, and repeat that launch alone.

**Expected, from the proposal at `f552e0ec9`:** reductions per `y()` sample, per cold committed move and per drop with a sink, and no difference shown per `xy()` sample and per warm committed move. The names don't change what is allocated, so a reading far from these is worth a sentence.

## Item 7. The timing check

**The owner asked for this check** in the direction that `DRD-61` records. It is the proposal's §4.3, built on `DRD-50` property 2's paired probe: [page](measurements/2026-11-12-window-correction-probe-page.ts.txt) and [runner](measurements/2026-11-12-window-correction-probe-runner.ts.txt). It separates the end from the base on the two paths where P adds work: an accessor call per candidate, and a sink lookup per measured row.

**Required properties:**

1. **One Chromium process, one page,** bundled by `rolldown` into one IIFE with `__DEV__` defined as `false`, as `DRD-50`'s runner does. The probe isn't a `bench/` file, and changes no instrument. Its source, the bundle that ran and its output are kept under `measurements/` with this unit's prefix.
2. **The arms.**
   - `before` is item 1 step 8's copy of `8904947f6`'s `src/sortable/`.
   - `production` is the unit's end.
   - `control` is a second `production` instance, for the A/A reading.

   Each arm drives its own tree's `y()` or `xy()` installer through `resolve` and `invalidate`, with its own `RectIndex`, and in the sink case its own tree's `layoutAnimation()` sink. The page calls only members that both trees have under the same names. It never calls a copy of a tree's code.

3. **The cases:**
   - **A, `xy()`'s rebuild with no sink:** a laid-out field of 2,000 fixed-size items that wraps, with a placeholder at item 1,000. One operation is the arm's `invalidate()`, then `resolve` at a fixed pointer.
   - **B:** A, with the arm's `layoutAnimation()` sink and nothing in flight.
   - **C, `y()`'s scan with no sink:** a column of 2,000 fixed-height rows, with a placeholder at row 1,000. Before timing, one `resolve` at a pointer over the last row grows the window to the end of the list. One operation is `resolve` at that same pointer.

   **Before timing, check case C:** one operation reads no rect. Count `getBoundingClientRect` calls during one operation per arm, and stop if any arm reads one. Otherwise case C would time a measurement and not the scan.

4. **The rounds:** 7, each running the arms in a rotated order. Each arm discards a warm-up batch, then times a batch that lasts at least 100 ms, calibrated toward 300 ms as `DRD-50`'s final probe did. The reading is the mean per operation.
5. **The verdict:** `compare.ts`'s paired rule, as in `DRD-50` property 2. "Slower" means `production` is higher than `before` in at least 6 of 7 rounds, and the median difference is above the largest absolute A/A difference. "Faster" is the mirror. Anything else is "no difference shown".
6. **The machine and the hold.**
   - **Record the machine:** CPU model, load averages before and after, and whether the process was pinned, as `DRD-50`'s probe output records it.
   - **The hold (`DRD-44` property 6).** Ask the owner to hold the owner's sessions before the first browser process, and release them after the last one. Record both times, and nothing else from this session runs in that interval.
7. **Attempts.** A process that fails before its first timed batch may be fixed and run again, and each attempt is kept with its reason. **A completed run isn't repeated** to change a verdict.

**How the report reads it:**

- **"No difference shown"** is inconclusive: the run met neither the "slower" rule nor the "faster" rule. It isn't a finding of equal speed. Report the sign counts, the median difference and the A/A threshold that the rule used, in µs and as a share of the base's operation. None of them limits the size of a slowdown that the check could have missed. A slowdown smaller than the threshold can't read "slower", and a larger one can also fail the rule when fewer than 6 of 7 rounds agree. The speed the check doesn't resolve is unmeasured, and the report says so.
- **"Faster"** applies to that case only.
- **"Slower"** in any case doesn't return the unit and reverts nothing. Finish the report and flag it at the top. The architect takes it to the owner before the report is accepted (Part II §0 and §14).
- **Allocation isn't speed.** The report gives item 6's reductions as bytes allocated. No sentence infers a speed-up from them, and the speed that item 7 doesn't resolve is stated as unmeasured.

**Corrected on 2026-11-13,** after the unit's report ([assessment](rect-index-access-assessment.md) §3.2). The first bullet said: "Report the median difference and the A/A bound, in µs and as a share of the base's mean operation. A slowdown smaller than the bound is unmeasured, and the report says so. `DRD-50`'s bounds were 27 % and 39 % of a rebuild." The report contents below asked for "each case's verdict and bound". Both read the A/A threshold as a limit on the slowdown the check would catch. The rule in property 5 doesn't change.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Tools, base revision, base suite, size, lint, typecheck, `.d.ts` copy, `typedoc` warnings and allocation readings recorded |
| The tools | Identical at the base and at the end |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files that §Boundaries allows, the report and `measurements/` |
| `grep -nE "Float64Array\|\blend\b\|\bsettle\b\|placeholderRect"` over `src/sortable/` `rect-index.ts`, `axis.ts`, `layout-animation.ts`, `linear-shift.ts`, `y.ts` and `xy.ts` | Only `xy.ts`'s `before`, at its declaration and its growth. `operation.ts`'s own `settle` is another member and isn't searched |
| Item 2's ownership lists | Every write site is inside `RectIndex`, and no member returns the storage, the element array or a view |
| The source projects | `browser`, `shipped` and `declaration` run the same titles with the same verdicts as at the base, apart from the two W7 titles, which are replaced and pass |
| The node project | The same titles and verdicts as at the base, apart from size rows. Each size verdict that changes is listed |
| The consumer project | The same files and tests as at the base. All pass |
| `drag:DRD-52 development equivalence check`, W8 and the receiver test | Pass in Chromium |
| M7a, M7b, M8 and M-axis | Each fails what item 4 names |
| Item 5 | One `.d.ts` file differs, as item 5 states, and `typedoc` is unchanged |
| Whole-package lint | The base's 49 errors by file, rule and message, and no other. A line number may differ only in `tests/displacement-sink.browser.test.ts`, where `DRF-38`'s error moves with the edit |
| Typecheck | `repo:RF-31` only |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck, from `packages/drag`, within §Boundaries' rule on autofix |
| Item 6 | Every row at both points, the controls at 0/0/0, and every allocation line saved |
| Item 7 | The verdict, median and bound for each case, the machine record and the hold times |
| Markdown | `handoff.md`'s Markdown checks |
| Firefox and WebKit | Deferred to the owner's planned CI, not run here |

## Commits

- **The source and test change,** in one commit.
- **The report and its measurements,** in their own commit.

## Report

Write `rect-index-access-report.md` beside this file. Save under `measurements/`, unedited:

- the tool list at the base and at the end;
- the runner's status and logs for the base and end suites;
- the base and end size readings, lint outputs and typecheck outputs;
- every allocation line, with each discarded launch and its reason;
- each mutation's patch and output;
- the `.d.ts` diff and both `typedoc` outputs;
- the timing probe's source, bundle and output, every attempt, the machine record and the hold times.

**The report gives:**

- the base, the commits and the governing records;
- each property of `DRD-61`, held or not, with item 2's ownership lists;
- where the code differs from the reference patch, and why;
- the size table, with each `sortable` row's difference and the verdicts;
- **allocation, under its own heading,** as bytes allocated;
- **timing, under its own heading,** with each case's verdict, sign counts, median difference and A/A threshold, and what stays unmeasured;
- the lint and typecheck baselines and end, with no new error and no repair;
- what didn't run, and why.

## Return conditions

Stop and return to the architect, with what you have recorded, when:

- the base differs from `8904947f6` in the paths that the §Base line names;
- a control row reads other than 0/0/0;
- a test other than the two W7 titles changes its verdict, or a W7 or W8 test fails at the end;
- a mutation doesn't fail what item 4 names;
- a new lint or typecheck error appears, or a property of `DRD-61` can't be met within §Boundaries;
- case C reads a rect during an operation.

A "slower" timing verdict, a changed size verdict or an allocation reading that grew isn't a return condition. Each is reported, and the architect routes it.

## After this unit

The architect reads the report and decides its acceptance. A "slower" verdict goes to the owner first. `DRO-4`'s re-base, `DRF-38`'s scope and the rollback report's acceptance stay separate.