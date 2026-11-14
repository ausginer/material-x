# Size pass unit handoff

**For:** one `implementer` unit on `drag/size`. **Base:** the commit that carries this handoff. Its `packages/drag/src`, `packages/drag/tests`, `packages/drag/bench` and `packages/drag/tsconfig.json` are `1d304128b`'s, the owner's `kernel/callbacks.ts` commit.

**Governing records**, all in [`00-index.md`](00-index.md):

- `DRD-51`: §First unit, items 1 and 2, and properties 1, 2 and 4;
- `DRD-52`: `RectIndex`'s ownership;
- `DRD-53`: the callback lists' module factories.

The reasons are in [`size-pass-assessment.md`](size-pass-assessment.md) and [`rect-index-ownership-proposal.md`](rect-index-ownership-proposal.md). The readings at the base are in [`2026-11-12-size-unit-base-readings.txt`](measurements/2026-11-12-size-unit-base-readings.txt).

**Goal:** after this unit, `sortable` has no unreachable `null` gap, `freeDrag` marks its bounds stale once per invalidation, and `RectIndex` holds no axis policy. `y()`'s prediction writes the cache only through `lend`. Nothing in the package refers to `kernel/callback-list.ts`. The development check still reports a placeholder that a committed move displaces along x. **Runtime comes before bytes:** the unit reads allocation after warm-up and runs the timing comparison. Budgets don't move.

## Boundaries

**Change only:**

- **`DRD-53`:**
  - `tests/callback-list.browser.test.ts` and `tests/size.node.test.ts`;
  - `.plan/probes/callback-list/allocation.ts`;
  - the comments in `src/kernel/callbacks.ts` and `src/kernel/drag.ts`.
- **U1:**
  - `src/sortable/axis.ts`, `y.ts`, `xy.ts`, `linear-shift.ts` and `operation.ts`;
  - `src/free-drag/behavior.ts`.
- **`DRD-52`:**
  - `src/sortable/rect-index.ts`, `linear-shift.ts` and `xy.ts`;
  - one new test in `tests/sortable.browser.test.ts`.
- **Any comment in `src/sortable/` or `src/kernel/` that these changes make stale.**
- **Records:** the report, and `measurements/` files.

**Do not change:**

- **The owner's code in `src/kernel/callbacks.ts`, `gesture.ts`, `session.ts` and `drag.ts`,** beyond comments. That includes `drag.ts`'s type alias `List as CallbackList`.
- **The development check's message** and `EQUIVALENCE_SLACK`.
- **`y()`'s window, growth, scan and confirmation slot** (`DRD-49`, `DRD-47`).
- **The contract and the README.** Neither names what changes.
- **Any `bench/` file,** `judge`, any row, injection, floor entry, ceiling or control figure.
- **Any recorded reading,** and any `.plan/` file other than this unit's report, its `measurements/` files and item 2's allocation probe.
- **The test file names.** Records cite them.

**Do not run** `--prove`, `--floors`, the page check, B3', the in-page floors or a campaign (`DRD-51` property 3).

## Items

### 1. The base

Before any change, record in the report that this command prints nothing:

```sh
git diff --stat 1d304128b HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json
```

At the base, two files fail to typecheck: `tests/callback-list.browser.test.ts` and `.plan/probes/callback-list/allocation.ts`, because they import `src/kernel/callback-list.ts`. The suite's known failures are:

- that test file, which fails to load;
- `tests/size.node.test.ts`'s module list for "draggable alone";
- six rows over their ceilings.

| Row | Brotli at `1d304128b` | Ceiling | Over |
| --- | --: | --: | --: |
| draggable alone | 2,196 | 2,139 | +57, and its control 2,024 moved +172 |
| example: resize handle | 3,321 | 3,313 | +8 |
| example: drop zone | 4,603 | 4,431 | +172 |
| freeDrag | 5,024 | 4,967 | +57 |
| freeDrag + bounds + landing | 5,459 | 5,210 | +249 |
| complete | 7,349 | 7,065 | +284 |

### 2. The callback lists (`DRD-53`), first commit

- **`tests/callback-list.browser.test.ts`** imports `queue` and `stack`, or the module's namespace, from `../src/kernel/callbacks.ts`, and makes every list with them. Its file comment and its first `describe` title name the module's lists, not a class `CallbackList`. The titles keep their `drag:` addresses.
- **`.plan/probes/callback-list/allocation.ts`** imports the factories the same way, and its header comment names them. Run it once from `packages/drag` with `node --expose-gc .plan/probes/callback-list/allocation.ts` and save the output. Its figures are observations and are not gated.
- **`tests/size.node.test.ts`'s** expected module list names `src/kernel/callbacks.ts`.
- **The stale comments:**
  - `callbacks.ts`'s class comment says that a list holds the name of the array method it adds with. It now holds the method itself (`DRD-53` property 2).
  - `drag.ts`'s `runDisposers` JSDoc names `CallbackList.stack()`. It now names `stack()`.
- **Afterwards,** `grep -rn "callback-list\|CallbackList" packages/drag/src packages/drag/tests packages/drag/tsconfig.json packages/drag/.plan/probes/callback-list/allocation.ts` finds only `drag.ts`'s alias and its uses, and the test file's own name.

**Read the size table at this commit against the base.** The change touches only comments in `src`, so every row must read exactly 0/0/0. A non-zero row is a finding, and you return before item 3.

### 3. U1 (`DRF-13` and `DRF-14`), second commit

Implement `DRD-51` §First unit items 1 and 2 as written.

- **The patch is a guide.** [`U1-recommended-unit.diff.txt`](probes/size-pass/patches/U1-recommended-unit.diff.txt) applies to the base with `git apply`.
- **It leaves out `operation.ts`.** `SortableOperation`'s query type no longer removes a `null` with `SetNonNullable`, and the import that this leaves unused goes.
- **What stays:** `lastGap`'s own `-1`, `RectIndex.holds` and `xy.ts`'s `last`.

### 4. `RectIndex`'s ownership (`DRD-52`), third commit

Implement `DRD-52` properties 1 to 9.

- **The patch is a reference.** [`P5-decided-with-held-placeholder-x.diff.txt`](probes/rect-index-ownership/patches/P5-decided-with-held-placeholder-x.diff.txt) applies to the base on its own. Over U1, apply it by hand.
- **Write what the patch doesn't:**
  - the `values` getter's lifetime, on the getter (property 6);
  - `lend`'s reentrancy rule, in its JSDoc (property 4).
- **Correct the module header,** which says the window is "every slot after `refresh`".

**The witness (`DRD-52` property 7)** is a test in `tests/sortable.browser.test.ts`, in the development project, titled with `drag:DRD-52`.

- **The setup:** only the placeholder moves along x, by a style on `[data-drag-placeholder]:nth-child(even)` that gives it a left margin. A drag with real input then crosses at least two rows, with a frame after each.
- **The assertion:** the faults that the harness collected include the message "drag: the predicted insertion geometry disagreed with a fresh measurement at the placeholder; the linear shift rule does not hold for this list".
- **The architect's probe of this setup** is [`placeholder-x-witness.test.ts.txt`](probes/rect-index-ownership/placeholder-x-witness.test.ts.txt). It reported the fault at `1d304128b` and with the patch, and no fault with the proposal's form, which re-measures x and passes no held x.

**Mutation M1:** pass no held x to the check. The witness must fail in every engine it runs in. **The witness must also pass at `1d304128b`'s source,** run on a scratch copy.

### 5. Size readings

At the unit's last code commit and at the base, one after the other, with `DRD-51` property 1's settings through [`size.ts.txt`](probes/size-pass/size.ts.txt), and also `bench/size/measure.ts`.

| Row | Expected against `1d304128b`, minified/gzip-9/Brotli-11 |
| --- | --- |
| draggable alone, draggable + lift, the three examples | **0/0/0: the control rows** |
| freeDrag | −26/0/−1 |
| freeDrag + bounds + landing | −26/−1/0 |
| sortable + y | −188/−73/−62 |
| sortable + xy | −200/−81/−56 |
| complete | −188/−71/−65 |

These are the architect's joint reading of U1 and the patch (`u1p5` in the base readings). A control row that isn't exactly 0/0/0 is a finding (`DRD-51` property 2). Report every row whatever it reads, say where gzip and Brotli disagree in sign, and give each difference from the table above with its cause.

### 6. Allocation, with warm-up

`DRD-52` property 9 makes the 7 B per committed move provisional. Read allocation at the base and at the last code commit, in Chromium, in the `shipped` project.

- **The probes:** append [`alloc-probe.test.ts.txt`](probes/rect-index-ownership/alloc-probe.test.ts.txt) and [`move-probe.test.ts.txt`](probes/rect-index-ownership/move-probe.test.ts.txt) to a scratch copy of `tests/hot-path.browser.test.ts`, never to the committed file. [The probe README](probes/rect-index-ownership/README.md) gives the command.
- **Per sample:** `y()` and `xy()`, three runs each.
- **Per committed move, cold:** the probe as written, with 100 warm crossings. Three runs.
- **Per committed move, warm:** the same probe with 2,000 warm crossings before the 200 sampled ones. Three runs. Raise the test's timeout if it needs more.

Save every printed line, with each function's bytes. Read the means:

| Result | Condition |
| --- | --- |
| **Stands** | Per sample, the unit's mean is no more than 4 B above the base's in each axis. Per committed move warm, the unit's mean is no more than 7 B above the base's |
| **Returned** | Either condition fails. Report the functions whose bytes grew |

Report the cold per-move reading beside the warm one. The proposal read 123 to 135 B cold, against 117 to 124 B at its base.

### 7. Timing

From `packages/drag`, at the unit's last code commit, one process after the other:

```sh
node bench/compare.ts --before 1d304128b --only "moves, one frame each" --out .plan/measurements/2026-11-<day>-size-unit-moves.json
node bench/compare.ts --before 1d304128b --only "activate-and-drop cycles" --out .plan/measurements/2026-11-<day>-size-unit-cycles.json
```

- **The first command** selects "300 moves, one frame each" at 20 and 2,000 items, their in-page mirrors, and "free drag, 300 moves, one frame each", which is the control. The move rows cross rows, so they reach `y()`'s committed move.
- **The second command** selects the four CDP cycle rows and their in-page mirror.
- **Check each selection in its output** before you read any verdict.
- **One browser process per command,** with the unchanged `judge`, rounds and A/A control (`DRD-46` property 8).
- **The hold** of `DRD-44` property 6, once around both processes, with both times recorded.
- **The machine record** of `DRD-40` property 4, as `DRD-44` amends it, at the head and the foot of each process.

| Result | Condition |
| --- | --- |
| **Holds** | No row is "slower" on any measure, and no row's layout count is above the base's |
| **Returned** | Any row is "slower" on any measure, or any layout count is above the base's |

The unit isn't an optimization. "No difference shown" is the expected reading, and a "faster" is reported, not claimed.

### 8. The other checks

After item 7, not during it:

- the full suite in Chromium (`npx vitest run -c vitest.config.ts`), and in three engines (`npx just test-engines`). The known failures are the six size rows of item 1 and nothing else;
- the per-sample tests and the census tests in `tests/hot-path.browser.test.ts`.

**A failure seen once in the architect's Chromium run at the base:** `tests/faults.browser.test.ts` "should cancel once with a fault when move throws, and let the terminal run". It then passed 3 runs of 3 alone, at the base and with the patch. If it fails, rerun the file alone three times and report every run.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat <base>..HEAD -- packages/drag` | Only the files under §Boundaries, the report and `measurements/` |
| Item 2's `grep` | Only the exceptions it names |
| Item 2's size table | 0/0/0 on every row |
| The witness | Passes in every engine, and at `1d304128b`'s source |
| M1 | The witness fails |
| Item 5 | The control rows read 0/0/0 |
| Item 6 | "Stands" |
| Item 7 | Two processes, each exits 0, with every selected row judged, and "holds" |
| Item 8 | Only the known failures |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck. Typecheck has no error |
| Markdown | `handoff.md`'s Markdown checks |

## Report

Write `size-pass-unit-report.md` beside this file. Save under `measurements/`, unedited:

- each run's JSON and console output, with the machine record and the hold's times;
- the size tables;
- the allocation probes' output;
- the witness, mutation and suite outputs;
- the allocation probe's output from item 2.

The report gives:

- each commit and what it carries;
- every check above;
- item 5's table against the expected one;
- item 6's means and result;
- item 7's verdict tables and result;
- any comment it corrected beyond the ones named here.

## Return to the architect

Stop and return if:

- item 1 isn't empty;
- item 2's size table isn't 0/0/0 on every row;
- a control row in item 5 isn't 0/0/0;
- the development equivalence check throws in any test other than the witness, in any engine. Don't weaken the check;
- the witness fails at `1d304128b`'s source, or passes under M1;
- item 6's result is "returned";
- item 7's result is "returned", or `--before 1d304128b` refuses to run. Don't repair the injections;
- a row that is green at the base turns red. "draggable + lift" has 206 B Brotli left, "example: canvas group" 12 B, "sortable + y" 19 B and "sortable + xy" 20 B. Budgets don't move;
- the change needs a file outside §Boundaries, or a change to the owner's code beyond comments.

## After this unit

The architect reads the report and records the result under `DRD-51`, `DRD-52` and `DRD-53`. If item 6 stands, the provisional 7 B is replaced by the warm reading. The owner then decides:

- `DRO-14` items 3 and 4;
- the re-base under `DRO-4`, after the pass.

`DRF-15` stays outside this unit.