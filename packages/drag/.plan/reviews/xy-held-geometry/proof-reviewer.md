# xy() held geometry: feature proof

**Lens:** `reviewer`, feature proof of `DRD-62` properties 1 to 7, following §Independent review of [`xy-held-geometry-handoff.md`](../../xy-held-geometry-handoff.md). The owner's brief:

- the adopted subclass and how `xy()` uses it;
- the narrowed field and axis types;
- the permanent vector tests and their independent oracle;
- the emitted-output and size claims, keeping the prototype baseline `f79f66fe2` apart from the pre-subclass baseline `61f883d09`.

Chromium only, with no timing or allocation campaign.

**Commit read:** `7184d069c` on `drag/rect-index-ownership`, the commit that adds the report. The source and test commit is `b4117dae2`. `git diff --stat b4117dae2 7184d069c -- packages/drag/src packages/drag/tests` is empty. `DRD-62` was read as it stands at `7184d069c`.

**Order of reading,** as the handoff requires: `DRD-62` first, then `rect-index.ts`, `xy.ts`, `y.ts`, the declaration test and the `drag:DRD-62` tests. I read [`xy-held-geometry-report.md`](../../xy-held-geometry-report.md) and its measurements only after the checks below had run.

**Method:**

- I used two detached scratch worktrees in my session's scratch directory:
  - one at `7184d069c`;
  - one at `f79f66fe2`, moved to `61f883d09` once the `f79f66fe2` comparisons had finished.
- Each had a `node_modules` whose entries link to the review worktree's installed packages, except `@ydinjs/drag`, which links to the scratch worktree's own package. Nothing was installed.
- In those worktrees I ran:
  - `npx just size` at all three commits;
  - a byte comparison of the emitted files;
  - the whole Chromium suite and `npx just typecheck` at `7184d069c`;
  - whole-package lint at `f79f66fe2` and `7184d069c`;
  - `oxfmt --check` on the four changed source and test files;
  - seven mutations.
- Each mutation was applied by an exact single-occurrence replacement, saved as a patch, run, and reverted with `git checkout`. The scripts are [`mutation-apply.mjs`](proof-reviewer-probes/mutation-apply.mjs.txt) and [`mutation-run.sh`](proof-reviewer-probes/mutation-run.sh.txt).

The main checkout and the review worktree's tracked files were not edited. My outputs are in [`proof-reviewer-probes/`](proof-reviewer-probes/), unedited. Their paths name my scratch directory, and the saved patches and test outputs keep their trailing whitespace.

## Scope

**Covered:**

- `src/sortable/rect-index.ts`, `xy.ts` and `y.ts` at `7184d069c`, and their diffs against `f79f66fe2` and `61f883d09`;
- `tests/rect-index.declaration.test.ts`, and the `drag:DRD-62` tests with their helpers in `tests/displacement-sink.browser.test.ts`;
- the size rows and the emitted files at `f79f66fe2`, `61f883d09` and `7184d069c`;
- `DRD-62`'s amendment notes in `DRD-52`, `DRD-58` and `DRD-61`, against `00-index.md` at `61f883d09`;
- `DRD-62`'s §Costs and §Limits of the evidence, against the measurements they cite;
- the report's claims, and the saved base and end outputs, mutation outputs and emitted-file comparison.

**Not covered:**

- the integrity and cleanup lenses;
- the proposal's alternatives P, VS and VXd, and its allocation campaign;
- the prepared timing check, which wasn't run.

**Not rerun, taken from the saved evidence:**

- the base suite at `ae85d8f6a`;
- MT1 to MT3, MX1 and MX4;
- each mutation's whole-suite run;
- the composition module lists.

**Out of scope,** as the handoff states: timing, allocation, Firefox and WebKit, the red size rows, the baseline lint errors and `repo:RF-31`.

## Results by property

### Property 1: the subclass

**Null result.** `RetainingRectIndex extends RectIndex` is exported (`rect-index.ts:358`).

- `#retained` is one `readonly number[]` (`:363`).
- `retain` is the only member that writes it (`:379–390`). It writes `retained[i * 2]` and then `retained[i * 2 + 1]` for `i` from 0 up to `count`, so every write lands at or below the length, and no write leaves a hole. Nothing truncates it.
- `retained(slot, field)` returns `this.#retained[slot * 2 + field]`, one number, and constructs nothing (`:369–372`).
- No member returns the array.
- The subclass uses only `this.at` and `this.count`. A JavaScript private name can't be reached from a subclass, so the class can't reach `RectIndex`'s private members.

### Property 2: `xy()` holds its policy, and no geometry

**Null result.**

- `xy()` constructs `new RetainingRectIndex()` (`xy.ts:48`).
- `moved` runs in this order:
  1. it reads `held` from the count (`:122`);
  2. it returns after `invalidate()` without a sink, with `last < 0`, with `last === gap`, or with `held === 0` (`:124–127`);
  3. it calls `retain()`, then `index.invalidate()`, then `refresh` with the sink (`:130–139`);
  4. it loops over `min(count, held)` slots, computing `retained − at` for `LEFT` and `TOP` and reporting through `item` when either is non-zero (`:145–155`).
- Against `61f883d09`, the closure variable `before` and its `Float64Array` are gone. No closure, array or per-row object is added. `xy.ts` is unchanged from `f79f66fe2`.
- **DOM measurement before the first report.** `refresh` runs `collect` and then `measure(0, count)`, which together read every slot and the placeholder before the loop starts. Inside the loop, `moved` calls only `retained`, `at`, `item` and the sink's `report`, and reads `context.space`. None of these reads layout.
- **For information:** the `held === 0` exit is the base's. Property 2's list of cases that only invalidate doesn't name it, and nothing depends on the omission.

### Property 3: `y()` is unchanged

**Null result.**

- `y.ts` and `linear-shift.ts` have no diff from `61f883d09`, and `y.ts:37` constructs `new RectIndex(TOP)`.
- "sortable + y" and "complete" read 20,221 / 7,290 / 6,577 and 21,803 / 7,950 / 7,175 at both `61f883d09` and `7184d069c` (§Size and emitted files).

### Property 4: the field types

**Null result.**

- `Field` is the union of `typeof` the six constants (`rect-index.ts:45–52`).
- `NearEdge` is `typeof LEFT | typeof TOP` (`:54–55`).
- Neither alias is exported, and each has one line of JSDoc.
- The four annotations are `at(slot: number, field: Field)` (`:125`), `retained(slot: number, field: NearEdge)` (`:369`), `constructor(axis: NearEdge = LEFT)` (`:104`) and `readonly #axis: NearEdge` (`:91`).
- Every other `slot`, `lo`, `hi`, `gap` and `delta` is still `number`.

### Property 5: type-only

**Null result.**

- **The `src` diff from `f79f66fe2`** is the two aliases, the four annotations, `differs`'s parameter typed `Field`, and `field as Field` at the copy loop and at `differs`'s two call sites (`:422`, `:456`, `:463`). No loop, bound, counter or statement changed. `rect-index.ts` at `7184d069c` is blob `b9234028e`, the architect's sketch, as the report says.
- **Emitted files, `f79f66fe2` against `7184d069c`:** both builds emit the same 90 files: 60 `.js` and `.d.ts` files and 30 `.js.map` files. Every `.js` and `.d.ts` file is byte-identical. No `rect-index.d.ts` is emitted.
- **For information:** `sortable/rect-index.js.map` differs ([comparison](proof-reviewer-probes/emitted-compare.txt)). Its `sourcesContent` embeds the typed source, and its `mappings` follow the shifted lines. Property 5 doesn't cover maps, so this isn't a finding. It does mean the published package isn't byte-identical, only its JavaScript and declarations are.
- **Size:** every row is identical at `f79f66fe2` and `7184d069c`, in all three columns, with the same module counts and violation lines ([`f79f66fe2`](proof-reviewer-probes/size-f79f66fe2.txt), [`7184d069c`](proof-reviewer-probes/size-7184d069c.txt)).

### Property 6: the compile-time check

**Null result.**

- The file has one `it` per signature, and each `it` shows both sides. The rejected arguments are the ones the property lists, each under its own `@ts-expect-error`. The `number`-typed value is `const unknownField: number = LEFT`. Its declared type is the non-union `number`, so TypeScript doesn't narrow it to the literal.
- **Routing:** the `declaration` project runs the file in typecheck-only mode with `tsc`. In my suite run, its three tests pass under `|declaration|`, and no `consumer` test comes from this file.
- **Two widening mutations of my own,** each failing `typecheck` and the `declaration` project:

  | Mutation | Change | `typecheck`, beyond `repo:RF-31` | `declaration` project | Record |
  | --- | --- | --- | --- | --- |
  | RT1 | `NearEdge` widened to `Field` | TS2578 at test lines 42 and 54, the directives over `retained(0, RIGHT)` and `new RectIndex(RIGHT)` | `retained`'s and the constructor's tests fail | [patch](proof-reviewer-probes/RT1.diff.txt), [output](proof-reviewer-probes/RT1.txt) |
  | RT2 | `Field` gains `typeof STRIDE` | TS2578 at test line 31, the directive over `at(0, STRIDE)` | `at`'s test fails | [patch](proof-reviewer-probes/RT2.diff.txt), [output](proof-reviewer-probes/RT2.txt) |

- **`#axis` was checked by reading:** `readonly #axis: NearEdge;` at `rect-index.ts:91`, assigned only in the constructor (`:105`).
- **The saved MT1 to MT3 outputs** show what the report's table says.

### Property 7: the behavioural witness

**The three tests pass** in Chromium at `7184d069c` (`displacement-sink.browser.test.ts:465`, `:471`, `:485`).

**The oracle is independent of `RectIndex`.** `flowPosition` (`:340–347`) returns the list's `getBoundingClientRect` plus the cell's `offsetLeft`/`offsetTop` minus the list's. Layout offsets ignore transforms, and the function reads nothing from the index or the sink.

After each committed move, `driveCommittedMoves` checks every destination cell against the flow positions read before and after the move (`:420–433`):

- a reported cell's `dx` and `dy` must be within 0.05 px of the negated flow travel, which is `toBeCloseTo` with precision 1;
- an unreported cell's flow travel must equal `[0, 0]`.

So a wrong vector fails the test, and so does a missing report or a report for the wrong element.

**Mutations, against `tests/displacement-sink.browser.test.ts` in the `browser` project:**

| Mutation | Change | `drag:DRD-62` tests failed | Required by `DRD-62` | Where it fails | Record |
| --- | --- | --- | --- | --- | --- |
| MX2 | `retained` returns `this.#retained[slot * 2]` | All three | All three | `:430`, the `dy` assertion | [patch](proof-reviewer-probes/MX2.diff.txt), [output](proof-reviewer-probes/MX2.txt) |
| MX3 | `moved`'s rebuild passes `null` as the sink | The animating test only | The animating test | `:429`, `dx` −100 against 0 | [patch](proof-reviewer-probes/MX3.diff.txt), [output](proof-reviewer-probes/MX3.txt) |
| MX5 | `retain`'s bound is `min(count, #retained.length / 2)` once `#retained` is non-empty | The larger-collection test only | The larger-collection test | `:429`, called from `:491`, the second operation: `NaN` against −200 | [patch](proof-reviewer-probes/MX5.diff.txt), [output](proof-reviewer-probes/MX5.txt) |
| RB1, mine | `moved` reports nothing | All three | — | `:432`, an unreported cell moved by 100 px | [patch](proof-reviewer-probes/RB1.diff.txt), [output](proof-reviewer-probes/RB1.txt) |
| RB2, mine | `moved` drops `index.invalidate()` before its refresh, so the rebuild doesn't run | All three | — | `:432` | [patch](proof-reviewer-probes/RB2.diff.txt), [output](proof-reviewer-probes/RB2.txt) |

- **The in-flight case:** MX3 fails the animating test, so that test does measure cells while their animations still draw them away from flow, as its closing assertion claims.
- **Other failures in the file:** under MX3 and RB2, the existing test "drag:DRD-50 should settle each row of an xy() rebuild by asking the sink about that row" also fails. That matches the report's whole-suite row for MX3.
- **The saved MX1 to MX5 outputs** show what the report's table says, for this file and for the whole suite.

## Size and emitted files

**The two baselines, kept apart:**

| Comparison | Size rows | Emitted files |
| --- | --- | --- |
| `f79f66fe2`, the prototype, against `7184d069c` | Every row 0/0/0 | Every `.js` and `.d.ts` byte-identical. `rect-index.js.map` differs |
| `61f883d09`, before the subclass, against `7184d069c` | Only "sortable + xy" changes: 20,073 / 7,266 / 6,534 → 20,133 / 7,284 / 6,564, which is +60 / +18 / +30 B | `sortable/rect-index.js`, `sortable/xy.js` and their maps differ. Every `.d.ts` is byte-identical |

- **The reading at `61f883d09`** is my own build ([log](proof-reviewer-probes/size-61f883d09.txt)). The report took that comparison from the proposal without a rebuild, as the handoff allowed. The two agree.
- **The six failing rows** are the same at all three commits. "complete" is 110 B over its ceiling at each.
- **"sortable + xy" is under its ceiling** at 6,564 B, against a budget of 6,617 B (`bench/size/measure.ts:135`), as `DRD-62` §Costs states.

## Suite, lint and typecheck

- **Chromium suite at `7184d069c`:**
  - 752 tests, 746 pass;
  - the passing tests by project: 357 `browser`, 326 `consumer`, 9 `shipped`, 23 `declaration` and 31 `node`;
  - the 6 failures are the baseline size rows in `tests/size.node.test.ts` ([output](proof-reviewer-probes/suite-7184d069c.txt)).
- **Base against end:** the saved verdict lists differ only by the six new tests, all passing.
- **Lint:** 49 ESLint errors at both `f79f66fe2` and `7184d069c`, and no oxlint error. The only difference is `DRF-38`'s `func-name-matching` error, which moves from 53:3 to 59:3 because of the new imports ([diff](proof-reviewer-probes/lint-diff.txt)). The new declaration file has no error.
- **Formatting:** `oxfmt --check` passes on the four changed files.
- **Typecheck:** `repo:RF-31`'s TS2322 in `.scripts/tsdown-library.ts` only ([output](proof-reviewer-probes/typecheck-7184d069c.txt)).

**No baseline error was repaired, and no new error appeared.**

## The record

- **Amendment notes.** `DRD-62`'s notes in `DRD-52` (`00-index.md:1801`), `DRD-58` (`:2238`) and `DRD-61` (`:2553`) each quote what the amended text used to say. Every quote matches `00-index.md` at `61f883d09`, apart from bold markup and one marked ellipsis.
- **Costs.** The size figures match my builds:
  - +60 / +18 / +30 B on "sortable + xy";
  - 0/0/0 on every other row;
  - "complete" 110 B over its ceiling.

  The allocation figures, 6,679.02 B and 6,869.87 B, are in [`2026-11-13-xy-held-geometry-alloc.txt`](../../measurements/2026-11-13-xy-held-geometry-alloc.txt). I didn't recompute them. The larger saving is labelled an inference.

- **Speed isn't inferred from allocation.** `DRD-62` states speed as unmeasured on every path, including the polymorphism risk, and says "Allocation isn't speed". "`y()` pays nothing … no work: its code is the base's" rests on the "sortable + y" bundle having the same bytes, not on allocation. The polymorphism risk is stated next to it.
- **The limits** are the ones the evidence shows. In particular, "No suite test at `f79f66fe2` asserts the reported vectors" agrees with the report's whole-suite rows: only MX1 and MX3 are caught outside the new tests, each by a test that doesn't assert a vector.
- **The report** agrees with my results apart from finding `reviewer-1`.

## Findings

**No finding is tier A or B.** The emitted JavaScript and declarations are `f79f66fe2`'s, and `xy()`'s behaviour is witnessed against layout.

### The report counts Vite cache files as emitted files (`reviewer-1`, tier C)

- **Finding:** the report says "all 124 emitted `.js` and `.d.ts` files are byte-identical between the base build and the end build". The build emits 60 such files. The other 64 are Vite's dependency cache under `packages/drag/.vite/vitest/*/deps/`.
- **Current behaviour:**
  - [the copy script](../../measurements/2026-11-13-xy-held-geometry-unit-copy-emitted.sh.txt) prunes `./node_modules`, `./src`, `./tests`, `./bench`, `./.plan` and `./.campaigns`, but not `./.vite`;
  - in [the emitted-file diff](../../measurements/2026-11-13-xy-held-geometry-unit-emitted-diff.txt)'s file list, 64 of the 124 paths begin `./.vite/vitest/`;
  - the other 60 are exactly the `.js` and `.d.ts` files my builds emit.
- **Why it is a problem:** the conclusion still holds. `diff -r` covered all 60 real outputs, and my own comparison of `f79f66fe2` with `7184d069c` agrees. But the record gives the published file count wrongly, and it treats test-runner cache files as part of the publication.
- **Evidence:** the two measurement files above, and [`emitted-compare.txt`](proof-reviewer-probes/emitted-compare.txt).
- **Required property:** the record's emitted-file comparison names and counts only what the build emits.
- **Route:** architect, as part of the report's acceptance. No source or test is implicated.

## Evidence limits

- **One engine:** Chromium only. Firefox and WebKit are deferred to the owner's planned CI.
- **Not rerun here:** MT1 to MT3, MX1, MX4, the whole-suite mutation runs and the base suite. Their saved outputs agree with the report.
- **Vector-test coverage:** no box is passed, so the box path of `moved`'s rebuild isn't witnessed by the `drag:DRD-62` tests. The counts before and after the rebuild are always equal, so the `count < held` side of `span` isn't exercised either.
- **Timing and allocation weren't measured.** Speed, including the polymorphism risk, is unmeasured in both directions.
- **Module lists:** I compared module counts, not module lists.

## Observations that aren't findings

- **A long line.** `rect-index.ts:17`, in the module comment, is 98 characters wide, while the rest of the block wraps near 84. It came with `f79f66fe2`'s adopted source, the handoff didn't allow the unit to change it, and no formatter or lint rule covers comment width.

## Scratch work

**Removed:** both detached scratch worktrees, and their `node_modules` link directories. **Kept:** nothing outside this directory.

## Next

The architect decides `reviewer-1`, and then the unit's final acceptance. Nothing here returns the unit or asks for a change to the source or the tests.