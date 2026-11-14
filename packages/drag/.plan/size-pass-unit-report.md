# Size pass unit report

**Input:** [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md), carried by `b86f61133` on `drag/size`. **Governing records:** `DRD-51` (§First unit, items 1 and 2, and properties 1, 2 and 4), `DRD-52` and `DRD-53` in [`00-index.md`](00-index.md). **Base for comparison:** `1d304128b`, whose `packages/drag/src`, `tests`, `bench` and `tsconfig.json` the handoff's commit carries unchanged.

**Outcome: complete, and no return condition was met.** `DRD-53`'s references are completed, U1 is in, and `RectIndex` holds no axis policy: `y()`'s prediction writes the slot buffer only through `lend`. Size equals the architect's joint reading on every row: −62 B Brotli on "sortable + y", −56 B on "sortable + xy", −65 B on "complete", −1 B on "freeDrag" and 0 B on "freeDrag + bounds + landing". The five control rows read 0/0/0. The development check still reports a placeholder that a committed move displaces along x: the witness passes in three engines and at `1d304128b`'s source, and fails under M1. **Allocation stands.** A committed move allocates +0.84 B more after warm-up, against the 7 B limit, and per sample `y()` is +0.80 B and `xy()` +0.55 B. **Timing holds.** All ten selected rows read "no difference shown" in script and task time, with layout counts equal to the base's. The suites fail only on the six known size rows. **Two findings for the architect:** a lint error that the decided `DRF-14` change introduces (§Item 3), and a blind spot in the per-sample allocation probe (§Item 6).

| Commit | Content |
| --- | --- |
| `15e9d1ef2` | Item 2, `DRD-53`. The browser test, the allocation probe and the size test's module list use `src/kernel/callbacks.ts`. Comments in `callbacks.ts` and `drag.ts` |
| `312f4ec32` | Item 3, U1 (`DRF-13`, `DRF-14`) |
| `237d65d2f` | Item 4, `DRD-52`, with the witness. **The unit's last code commit:** `src/` and `tests/` don't change after it |
| the commit carrying this report | This report, and the records under `measurements/` |

Every reading below was taken at `237d65d2f` or, for the base, in a detached worktree of `1d304128b` in this session's scratch directory, whose `node_modules` were symbolic links to the main checkout's.

## Item 1: the base

`git diff --stat 1d304128b HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json` at `b86f61133`, before any change: **empty** (exit 0, no output).

The size probe at the base reproduces the base readings' "base" table on every row and column ([`…-sizes.txt`](measurements/2026-11-12-size-unit-sizes.txt)).

## Item 2: the callback lists (`DRD-53`), `15e9d1ef2`

- **`tests/callback-list.browser.test.ts`** imports the module's namespace, `import * as Callbacks from '../src/kernel/callbacks.ts'`, as `gesture.ts` and `session.ts` do, and makes every list with `Callbacks.queue()` or `Callbacks.stack()`. The file comment names "the lists that `queue()` and `stack()` make", and the first `describe` is "drag:DRD-35 callback lists". The other titles are unchanged.
- **`.plan/probes/callback-list/allocation.ts`** imports the same namespace and types its helper with `Callbacks.List<null>`. Its header names `queue()` and `stack()` in `src/kernel/callbacks.ts`, and says that a list holds the shared array method it adds with, under `DRD-36` and `DRD-53`.
- **`tests/size.node.test.ts`** expects `src/kernel/callbacks.ts` in "draggable alone"'s module list.
- **`callbacks.ts`'s class comment** now says that a list holds only the array method it adds with, the shared builtin read once when the module is evaluated, and that a queue adds with `unshift` and a stack with `push`. The code is unchanged.
- **`drag.ts`'s `runDisposers` JSDoc** names `stack()`. The alias `List as CallbackList` and its use are unchanged.

**The `grep`** of the handoff finds `drag.ts`'s alias (line 2) and its use (line 101), and two more lines that name the probe's directory, `.plan/probes/callback-list/`: `tsconfig.json`'s include of `allocation.ts`, and the probe's own run command in its header. The test file's name doesn't appear in its own contents. Neither extra line names the removed module or the class, and `tsconfig.json` is outside §Boundaries, so neither changed.

**The allocation probe**, run once with `node --expose-gc .plan/probes/callback-list/allocation.ts` ([output](measurements/2026-11-12-size-unit-callback-allocation.txt)): a bare array 32.0 B empty and 167.1 B used, `queue()` 72.1 B and `stack()` 72.0 B empty, and 239.5 B and 239.3 B used. These are observations, not gated.

**The size table at this commit against the base reads 0/0/0 on every row** ([table](measurements/2026-11-12-size-unit-commit1-sizes.txt)). `tests/callback-list.browser.test.ts` and `tests/size.node.test.ts` then ran: the callback test file passes, and the only failures are the six size rows over their ceilings. The module list test passes.

Format, lint and typecheck on the five changed files: clean.

## Item 3: U1, `312f4ec32`

U1's patch applied to the base with `git apply` unchanged. Beyond it:

- **`operation.ts`:** `#query` is `Writable<AxisQuery>`. `SetNonNullable` and its import are gone.
- **`linear-shift.ts`:** `refresh`'s JSDoc no longer offers `-1` for `gap`. The patch had already removed the comment above `collect` ("With no gap, the window starts at the list's start and grows down").
- **`free-drag/behavior.ts`:** the step's comment says that it calls the operation's `handleEvent`, so the operation's bounds and drop targets are re-read at their next read. With no operation nothing is stale, because each activation marks the bounds stale before its first read (`activate`'s `this.bounds?.invalidate()`).

`lastGap`'s own `-1`, `RectIndex.holds` and `xy.ts`'s `last` stay.

**One lint error, from this change and left as found** ([output](measurements/2026-11-12-size-unit-commit2-lint.txt)): `src/free-drag/behavior.ts:77:12 eslint(class-methods-use-this): Expected method 'invalidate' to have this`. Without the bounds call, the `invalidate` arrow property no longer reads `this`. `handoff.md` says not to resolve lint errors by hand. A `static` member or a module function would change how `free-drag.ts` passes `behavior.invalidate` to `requestStep`, which is a structure change outside the decided patch. **The decision on it belongs to the architect.** The other five files lint clean, and typecheck has no error.

Size at this commit against the base: −26/0/−1 on "freeDrag", −26/−1/0 on "freeDrag + bounds + landing", −44/−15/−12 on "sortable + y", −30/−9/−10 on "sortable + xy" and −44/−14/−15 on "complete". The five control rows read 0/0/0. This equals the base readings' `u1` column on every row ([table](measurements/2026-11-12-size-unit-commit2-sizes.txt)).

## Item 4: `RectIndex`'s ownership (`DRD-52`), `237d65d2f`

P5 applied over U1 with `git apply --3way`, with no conflict. Its only overlap with U1 is a context line that U1 had removed, and the result is P5's change on U1's text. Written beyond the patch:

- **`values`'s lifetime (property 6),** on the getter: valid until the next `collect`, the only operation that replaces the buffer.
- **`lend`'s JSDoc (property 4):** it calls `write` once with the writable buffer, to change the slots from `lo` to before `hi`. This is the rule `measure` gives the sink's `settle`, and nothing checks it at runtime. The reference is valid during the call only. The range is inside the window, and `write` reads and writes nothing outside it. `write` calls neither `collect` nor a rebuild that calls it, because `collect` may replace the buffer, and it may call any other member.
- **The module header:** the window is "the slots `measure` added after `collect`. A rebuild measures every slot, so its window is all of them." It also says that the cache makes every measurement and alone allocates the buffer, and that an axis rule reads through the getters' read-only views and writes only through `lend`.

**Comments corrected beyond the handoff's list:**

- `verifyEquivalence`'s JSDoc said "the window the previous advance wrote". `advance` is no longer a `RectIndex` method, so it now says "the previous committed move". It also documents `heldPlaceholder`: the placeholder as the cache held it before the re-read after a committed move, or `null` when there was none, whose x the relocation must have left where the last rebuild measured it.
- The writer's comment in `linear-shift.ts` now opens with what it does: "Advances the lent slots by `delta`." The rest of the patch's text is unchanged.

The shipped arithmetic, the report loop, `y()`'s window, growth, scan and confirmation slot, the check's message and `EQUIVALENCE_SLACK` are as in P5. Format, lint and typecheck on `rect-index.ts`, `linear-shift.ts`, `xy.ts` and `tests/sortable.browser.test.ts`: clean.

### The witness and M1

**The witness** is "drag:DRD-52 development equivalence check" › "should report a placeholder that a committed move displaces along x", in `tests/sortable.browser.test.ts`, which runs in the development project. A style gives `[data-drag-placeholder]:nth-child(even)` a 9 px left margin, so only the placeholder moves along x. An 8-row `basicSortable` list is dragged from `#r1` with real input across four rows, one row per step, with a frame after each. Then Escape. The test asserts that `faultMessages()` contains the check's message, the one the handoff quotes. It is the architect's probe in the form of a test.

| Run | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| [The unit](measurements/2026-11-12-size-unit-witness-unit.txt) | passes | passes | passes |
| [`1d304128b`'s source](measurements/2026-11-12-size-unit-witness-base.txt): the base worktree with the unit's test file | passes | passes | passes |
| [**M1**](measurements/2026-11-12-size-unit-witness-m1.txt): `linear-shift.ts` passes `null` to `verifyEquivalence` in place of `heldPlaceholder` | fails: "expected [] to include 'drag: the predicted insertion geometr…'" | fails, same | fails, same |

All three runs used `vitest.engines.config.ts` after `source ~/.cache/ms-playwright/webkit-env.sh`. A first M1 run without the script couldn't launch WebKit ("Host system is missing dependencies to run browsers"). Chromium and Firefox failed the witness in that run too. Its output was overwritten by the run above, so it isn't kept. M1 was an uncommitted edit, and the landed `linear-shift.ts` was restored from a scratch copy, with `cmp` confirming the restore before the commit.

## Item 5: size readings

Through [`size.ts.txt`](probes/size-pass/size.ts.txt), the base worktree and then the unit, one after the other ([tables](measurements/2026-11-12-size-unit-sizes.txt), JSON: [base](measurements/2026-11-12-size-unit-base-size.json), [unit](measurements/2026-11-12-size-unit-commit3-size.json)). **The control rows,** named before measuring in the handoff and in `DRD-51`: "draggable alone", "draggable + lift" and the three examples. No change reaches their modules: the kernel change is comments only, and U1 and `DRD-52` touch only `free-drag/` and `sortable/`.

| Row                         | Expected     | Read         | Difference |
| --------------------------- | ------------ | ------------ | ---------- |
| draggable alone             | 0/0/0        | **0/0/0**    | none       |
| draggable + lift            | 0/0/0        | **0/0/0**    | none       |
| example: resize handle      | 0/0/0        | **0/0/0**    | none       |
| example: drop zone          | 0/0/0        | **0/0/0**    | none       |
| example: canvas group       | 0/0/0        | **0/0/0**    | none       |
| freeDrag                    | −26/0/−1     | −26/0/−1     | none       |
| freeDrag + bounds + landing | −26/−1/0     | −26/−1/0     | none       |
| sortable + y                | −188/−73/−62 | −188/−73/−62 | none       |
| sortable + xy               | −200/−81/−56 | −200/−81/−56 | none       |
| complete                    | −188/−71/−65 | −188/−71/−65 | none       |

Every row equals the architect's `u1p5` reading.

**Where gzip-9 and Brotli-11 disagree in sign:** nowhere. Two rows have a zero beside a non-zero: "freeDrag" (gzip 0, Brotli −1) and "freeDrag + bounds + landing" (gzip −1, Brotli 0). Both rows are 26 B smaller minified, from `DRF-14`'s removed call.

**`bench/size/measure.ts`** ([unit](measurements/2026-11-12-size-unit-measure.txt), [base](measurements/2026-11-12-size-unit-measure-base.txt)) prints the same Brotli figures. Its violations are the six rows of item 1 and nothing else. "freeDrag" is now 56 B over its ceiling (57 B at the base), and "complete" 219 B (284 B). "freeDrag + bounds + landing" stays 249 B over. "draggable alone" is unchanged, and so is its control's move of 172 B. **No green row turned red.** "draggable + lift" keeps 206 B of headroom and "example: canvas group" 12 B. "sortable + y" now has 81 B and "sortable + xy" 76 B. No ceiling or control figure changed.

## Item 6: allocation, with warm-up

Chromium, the `shipped` project, heap sampling at 16 B. The probes were appended to scratch copies of `tests/hot-path.browser.test.ts` in the two worktrees, never to the committed file. Base and unit runs alternated. Raw output: [the runner and every line](measurements/2026-11-12-size-unit-alloc.txt), and [`xy()` alone](measurements/2026-11-12-size-unit-alloc-xy.txt). The warm variant is the move probe with `cross(2000)` before the 200 sampled crossings and a 900 s timeout. Every move run counted `moves=200`.

**One instrument finding, for the architect.** Run as the README gives it, `-t 'C6 probe'` runs `y()` and then `xy()` in one page. **Every `xy()` line in that run read `perMove=0.00 keys={}` at both trees**, while the architect's readings show about 50 B. One diagnostic run of `xy()` alone printed the whole profile: the drag started, and `sortable/operation.ts:move` allocated 20,636 B, which is 51.59 B per sample. So in this run `xy()` after `y()` reads nothing, and those six lines are discarded. The `xy()` reading was taken again alone, three runs per tree. The `y()` lines of the first run are kept. I didn't establish why the second probe in one run reads an empty profile.

| Reading | Base, per run | Base mean | Unit, per run | Unit mean | Unit − base | Limit |
| --- | --- | --: | --- | --: | --: | --: |
| Per sample, `y()` | 84.27, 86.52, 85.74 | 85.51 | 86.60, 84.96, 87.37 | 86.31 | +0.80 | 4 |
| Per sample, `xy()` (alone) | 47.78, 50.90, 50.12 | 49.60 | 50.76, 49.06, 50.64 | 50.15 | +0.55 | 4 |
| **Per committed move, warm (2,000)** | 14.44, 17.56, 16.48 | **16.16** | 16.96, 16.48, 17.56 | **17.00** | **+0.84** | 7 |
| Per committed move, cold (100) | 125.40, 124.44, 124.08 | 124.64 | 131.18, 128.86, 126.28 | 128.77 | +4.13 | reported |

**Result: stands.**

- **Per sample:** the same functions allocate at both trees: `y.ts:resolve`, `linear-shift.ts:refresh` and `operation.ts:move` for `y()`, and `operation.ts:move` for `xy()`.
- **Warm per move:** after warm-up, only `linear-shift.ts:refresh` allocates, at 2,816 to 3,440 B per 200 moves at both trees. One sample of 72 B lands in `rect-index.ts:collect` in two base runs, and in `rect-index.ts:pack` in one unit run. Nothing allocates in `lend`, in the writer or in `moved` at the unit, nor in `advance` or `remeasurePlaceholder` at the base.
- **Cold per move:** at the base, `rect-index.ts:advance` (12,036 to 12,580 B) and `remeasurePlaceholder` (5,584 to 6,232 B). At the unit, `linear-shift.ts:advance` (11,256 to 11,832 B), `rect-index.ts:pack` (4,776 to 5,140 B) and `measurePlaceholder` (3,184 to 3,392 B). The cold unit reads 126 to 131 B against 124 to 125 B. The proposal read 123 to 135 B against 117 to 124 B. In both, the cold difference is in code that isn't optimized yet, and it is gone after warm-up.

## Item 7: timing

Two processes from `packages/drag` at `237d65d2f`, one after the other, each wrapped by [the record wrapper](measurements/2026-11-12-size-unit-record-wrapper.sh.txt), which is the drop unit's wrapper unchanged. `judge`, the rounds (7), the A/A control and every row and injection are unchanged. No injection ran.

- **Moves:** `node bench/compare.ts --before 1d304128b --only "moves, one frame each" --out .plan/measurements/2026-11-12-size-unit-moves.json`. **The selection, checked in the output:** "300 moves, one frame each" at 20 and 2000 items, "free drag, 300 moves, one frame each" (the control), and "in the page: 300 moves, one frame each" at 20 and 2000 items. Five rows, each in all 7 rounds. [JSON](measurements/2026-11-12-size-unit-moves.json), [console with the machine record](measurements/2026-11-12-size-unit-moves.txt).
- **Cycles:** `node bench/compare.ts --before 1d304128b --only "activate-and-drop cycles" --out .plan/measurements/2026-11-12-size-unit-cycles.json`. **The selection:** the four CDP rows "50 activate-and-drop cycles" at 20 and 2000 items, with and without landing, and "in the page: 50 activate-and-drop cycles, 20 items, no landing". Five rows, each in all 7 rounds. [JSON](measurements/2026-11-12-size-unit-cycles.json), [console](measurements/2026-11-12-size-unit-cycles.txt).

**The hold** ([record](measurements/2026-11-12-size-unit-hold.txt)). The owner confirmed it at 12:34:45 UTC, before the first browser process. The moves process ran from 12:34:55 to 12:49:17 and exited 0. The cycles process ran from 12:49:17 to 13:02:51 and exited 0. The owner confirmed the release at 13:11:15. Nothing else from this session ran in that interval.

**Corrected by the architect on 2026-11-12:** the last sentence doesn't hold for the first 14 seconds. Four background tasks from this session, three `pgrep -f alloc.sh` wait loops and a `tail -f` of the allocation output, ran until 12:34:59, four seconds into the moves process. The raw record is unchanged. See [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md) §2.2.

**The machine record:** Node v26.13.0, 12 CPUs, 12th Gen Intel Core i7-1255U, `cpu_core` 0–3, `cpu_atom` 4–11. The load averages:

| Process | Head             | Foot             |
| ------- | ---------------- | ---------------- |
| Moves   | 0.60, 0.78, 1.89 | 0.60, 0.86, 1.32 |
| Cycles  | 0.60, 0.86, 1.32 | 1.08, 1.13, 1.23 |

**Verdicts** (`before` against the unit, as `judge` prints them):

| Row | Layouts | Script | Task |
| --- | --- | --- | --- |
| 300 moves, 20 items | at or below, 83 against 83 | no difference shown: higher in 4 of 7, median 3 µs, A/A bound 17 µs | no difference shown: 5 of 7, median 17 µs, bound 158 µs |
| 300 moves, 2000 items | at or below, 83 against 83 | no difference shown: 4 of 7, median 0 µs, bound 14 µs | no difference shown: 3 of 7, median −94 µs, bound 176 µs |
| free drag, 300 moves (control) | at or below, 0 against 0 | no difference shown: 6 of 7, median 1 µs, bound 20 µs | no difference shown: 4 of 7, median 42 µs, bound 244 µs |
| in the page: 300 moves, 20 items | at or below, 83 against 83 | no difference shown: 5 of 7, median 4 µs, bound 15 µs | no difference shown: 4 of 7, median 20 µs, bound 51 µs |
| in the page: 300 moves, 2000 items | at or below, 83 against 83 | no difference shown: 1 of 7, median −4 µs, bound 8 µs | no difference shown: 2 of 7, median −20 µs, bound 150 µs |
| 50 cycles, 20 items, no landing | at or below, 250 against 250 | no difference shown: 3 of 7, median −115 µs, bound 283 µs | no difference shown: 2 of 7, median −130 µs, bound 895 µs |
| 50 cycles, 20 items, with landing | at or below, 350 against 350 | no difference shown: 5 of 7, median 69 µs, bound 207 µs | no difference shown: 5 of 7, median 458 µs, bound 1095 µs |
| 50 cycles, 2000 items, no landing | at or below, 250 against 250 | no difference shown: 5 of 7, median 112 µs, bound 280 µs | no difference shown: 3 of 7, median −215 µs, bound 2865 µs |
| 50 cycles, 2000 items, with landing | at or below, 350 against 350 | no difference shown: 5 of 7, median 102 µs, bound 165 µs | no difference shown: 3 of 7, median −165 µs, bound 3305 µs |
| in the page: 50 cycles, 20 items, no landing | at or below, 250 against 250 | no difference shown: 3 of 7, median −2 µs, bound 325 µs | no difference shown: 2 of 7, median −76 µs, bound 762 µs |

**Result: holds.** No row reads "slower" on any measure, and no layout count is above the base's. No row reads "faster" either. "No difference shown" is the expected reading for this unit and isn't a result in either direction (`DRD-40` property 2). Several medians are positive, the largest 458 µs of task time on the 20-item landing cycle row, inside its 1,095 µs bound. The rule found no slowdown. A slowdown smaller than a row's A/A bound can't read "slower".

## Item 8: the other checks

Run after the hold's release, at `237d65d2f`, with `webkit-env.sh` sourced.

- **The Chromium suite** (`npx vitest run -c vitest.config.ts`, [output](measurements/2026-11-12-size-unit-suite-chromium.txt)): 30 files, 414 passed, 6 failed. The 6 failures are the six known size rows: "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". No type errors. `tests/faults.browser.test.ts` "should cancel once with a fault when move throws, and let the terminal run" passed, so it wasn't rerun.
- **Three engines** (`npx just test-engines`, [output](measurements/2026-11-12-size-unit-suite-engines.txt)): 72 files, 1,071 passed, 18 skipped, none failed, exit 0. The engines config runs no size row.
- **`tests/hot-path.browser.test.ts`**, the per-sample tests and the censuses, in the `shipped` project ([output](measurements/2026-11-12-size-unit-hot-path.txt)): 9 of 9 passed, among them "should allocate per sample only the CSS string a lifted write needs", the `drag:DRF-2` variant, "should read no layout in a sample, and none in a frame with nothing stale", and the `DRD-47` and `DRD-49` read censuses.

**Where the development check throws** ([record](measurements/2026-11-12-size-unit-check-throws.txt)). The harness collects faults without failing a test, so a passing suite doesn't show by itself that the check threw nowhere else. In the scratch worktree of `237d65d2f`, one `console.log` marker was added just before the check's `throw`, and the three-engine suite ran with `--silent=false`. The record holds the diff. Result: 72 files, 1,071 passed, and the marker printed exactly three times, "the placeholder in should report a placeholder that a committed move displaces along x", once per engine. **The check throws in the witness and in no other test, in any engine.**

## Verification

| Check | Required | Result |
| --- | --- | --- |
| Item 1 | Empty | Empty |
| `git diff --stat 1d304128b..HEAD -- packages/drag` | Only §Boundaries files, the report and `measurements/` | `git diff --stat b86f61133..HEAD -- packages/drag` before the report commit: the 13 files under §Boundaries (the allocation probe, 9 source files, 3 test files). The report commit adds this report and `measurements/` files |
| Item 2's `grep` | Only the exceptions it names | The alias and its use, and two lines naming the probe's directory path (see item 2) |
| Item 2's size table | 0/0/0 on every row | 0/0/0 on every row |
| The witness | Passes in every engine, and at `1d304128b`'s source | Passes in Chromium, Firefox and WebKit, at the unit and at the base's source |
| M1 | The witness fails | Fails in all three engines |
| Item 5 | Control rows 0/0/0 | 0/0/0, and every row equals the expected table |
| Item 6 | "Stands" | Stands |
| Item 7 | Two processes, each exits 0, every selected row judged, "holds" | Two processes, both exit 0, five rows each, all judged on every measure, "holds" |
| Item 8 | Only the known failures | Chromium: the six known size rows only. Three engines: no failure. Hot path: 9 of 9. The check throws only in the witness |
| Changed `.ts` files | Format, lint, typecheck | Formatted. Lint clean except `class-methods-use-this` on `free-drag/behavior.ts:77` (item 3). Typecheck: no error |
| Markdown | `handoff.md`'s Markdown checks | Formatted with `npx just fmt`. Links and anchors checked with a scratch script: every relative link resolves. `git diff --check` is clean for this report. It reports trailing whitespace and blank lines at the end of the raw outputs under `measurements/`, which are Vite's and Vitest's console output saved unedited No Markdown linter is configured, so lint doesn't apply |

## Return conditions

None was met:

- item 1 is empty;
- item 2's table is 0/0/0 on every row;
- item 5's control rows are 0/0/0;
- the development check throws only in the witness, in every engine;
- the witness passes at `1d304128b`'s source and fails under M1;
- item 6 stands, and item 7 holds, and `--before 1d304128b` ran;
- no green row turned red;
- no file outside §Boundaries changed, and the owner's code changed only in comments: `callbacks.ts`'s class comment and `drag.ts`'s `runDisposers` JSDoc.

## Open for the architect

- **`class-methods-use-this` on `FreeDragBehavior.invalidate`** (item 3). `DRD-51` §First unit item 2 says the step calls only `operation?.handleEvent()`, and the linter reports that the arrow property no longer reads `this`.
- **The per-sample probe reads `xy()` as 0 after `y()` in one run** (item 6). The README's command produces it. Run alone, it reads what the proposal read.
- `DRD-51`, `DRD-52` and `DRD-53`'s results, and the warm figure that replaces the provisional 7 B: +0.84 B per committed move, warm.

Scratch work: two detached worktrees, of `1d304128b` and `237d65d2f`, and the probe copies, all in this session's scratch directory. They are removed after the commit.