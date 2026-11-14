# xy() held geometry report

**Unit:** [`xy-held-geometry-handoff.md`](xy-held-geometry-handoff.md), implementing `DRD-62`. **Branch:** `drag/rect-index-ownership`, in its worktree. **Input:** `ae85d8f6a`, whose `packages/drag/src`, `tests` and `bench` equal `f79f66fe2`'s. **Source and test commit:** `b4117dae2`. The report and its measurements are in the commit after it.

**For the reviewer and the architect:**

- **No return condition was met.**
- **The `src` diff is the architect's sketch, byte for byte.** `git diff f79f66fe2 b4117dae2 -- packages/drag/src` gives blob `b9234028e` for `rect-index.ts`, the same blob as the sketch in the [type check](measurements/2026-11-13-xy-held-geometry-types-check.txt).
- **The build's 60 emitted `.js` and `.d.ts` files are byte-identical** to the base build's, comments included. One of its 30 source maps, `sortable/rect-index.js.map`, differs (§Property 4 and property 5). Every size row reads 0/0/0.
- **Every mutation failed what the handoff names.** Nothing failed that wasn't expected, apart from the whole-suite coverage the handoff asks for as information.

**Corrected on 2026-11-14 by the architect,** on the independent review's `reviewer-1` ([review](reviews/xy-held-geometry/proof-reviewer.md) §Findings, [assessment](xy-held-geometry-assessment.md) §4.1). The report counted Vite's dependency cache as emitted files, and didn't say that source maps were outside its comparison. **The conclusion holds:** every `.js` and `.d.ts` file the build emits is byte-identical. Five passages are corrected in place, and §What wasn't measured gains a bullet for the source maps. **The saved measurements aren't changed.** The copy script, both copy counts and the emitted-file diff still read 124, because that is what the commands printed. What the passages used to say:

- the third bullet above: "**The emitted `.js` and `.d.ts` files are byte-identical** to the base build's, comments included. Every size row reads 0/0/0.";
- item 1.6: "124 `.js` and `.d.ts` files copied to scratch, after the size run's build";
- property 5's row: "`src` diff below; emitted files byte-identical; every size row 0/0/0";
- §Property 4 and property 5: "**The emitted files:** all 124 emitted `.js` and `.d.ts` files are byte-identical between the base build and the end build.";
- §The size: "The rows bundle the published build, whose emitted files are byte-identical to the base's, so the lists are the same input".

**Governing records:** `DRD-62` properties 1 to 7, with its costs and limits; what it amends (`DRD-61` properties 1, 2, 3 and 8, `DRD-58` property 7's table, and `DRD-52` property 1); `DRD-61` properties 3 and 10; `DRD-51` properties 1 and 2; `DRF-38` and `repo:RF-31`; CONTRIBUTING Part I §TypeScript, §Class encapsulation and §Unit tests, and Part II §1.2 and §3.

## Tools and environment

- **The tools were identical at the base and at the end:** Node v26.13.0, `rolldown` 1.3.2, `tsdown` 0.23.7, `vitest` and `@vitest/browser-playwright` 5.1.0, `playwright` 1.65.0, `typescript` 6.0.2, and Google Chrome for Testing 157.0.8103.38 at `/usr/local/bin/chrome` (`CHROME_EXECUTABLE` unset) ([base](measurements/2026-11-13-xy-held-geometry-unit-base-tools.txt), [end](measurements/2026-11-13-xy-held-geometry-unit-end-tools.txt), [script](measurements/2026-11-13-xy-held-geometry-unit-tools.sh.txt)). Each version resolves from `packages/drag`.
- **Nothing was installed.** I didn't run `npm install` or `npm ci`, and didn't change `node_modules`, a lockfile or a browser. The worktree's installed packages were already present.
- **Every long process ran through `node bench/campaign.ts run`:** `xhg-unit-base`, `xhg-unit-mutations` and `xhg-unit-end`, in this worktree's ignored `.campaigns/`. I waited for each through the harness's notice that the background command exited. Each step ran through [a wrapper](measurements/2026-11-13-xy-held-geometry-unit-step.sh.txt) that prints the exit code and exits 0, so an expected failure doesn't stop the campaign.
- **No scratch worktree.** The emitted-file copies and suite JSON were in my session's scratch directory, outside the checkout.
- **Chromium only.**

## Item 1. The base

| Step | Result | Record |
| --- | --- | --- |
| 1.1 Tools | Recorded | [tools](measurements/2026-11-13-xy-held-geometry-unit-base-tools.txt) |
| 1.2 Base | `ae85d8f6a2087061c8169e5c5693eb6e16939ce8`. `git diff --stat f79f66fe2 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench` is empty | [revision](measurements/2026-11-13-xy-held-geometry-unit-base-revision.txt) |
| 1.3 Suite | 746 tests, 740 pass. The 6 failures are the size rows "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete" in `tests/size.node.test.ts` | [log](measurements/2026-11-13-xy-held-geometry-unit-base-suite.log), [verdicts](measurements/2026-11-13-xy-held-geometry-unit-base-suite-verdicts.txt), [status](measurements/2026-11-13-xy-held-geometry-unit-base-status.json) |
| 1.4 Size | "sortable + y" 6,577 B, "sortable + xy" 6,564 B and "complete" 7,175 B Brotli, as the proposal's final-VX readings give | [log](measurements/2026-11-13-xy-held-geometry-unit-base-size.log) |
| 1.5 Lint, typecheck | 49 ESLint errors and no oxlint error. Typecheck: `repo:RF-31` only | [lint](measurements/2026-11-13-xy-held-geometry-unit-base-lint.txt), [typecheck](measurements/2026-11-13-xy-held-geometry-unit-base-typecheck.txt) |
| 1.6 Emitted files | 124 `.js` and `.d.ts` files copied to scratch, after the size run's build. 60 are the build's own: 33 `.js` and 27 `.d.ts`. The other 64 are Vite's dependency cache under `.vite/vitest/*/deps/`, which the script doesn't exclude. No `.js.map` was copied (corrected on 2026-11-14) | [copy](measurements/2026-11-13-xy-held-geometry-unit-base-emitted-copy.txt), [script](measurements/2026-11-13-xy-held-geometry-unit-copy-emitted.sh.txt) |
| — Consumer, declaration | Consumer: 22 files, 326 tests, all pass. Declaration: 3 files, 20 tests, all pass | [consumer](measurements/2026-11-13-xy-held-geometry-unit-base-consumer.log), [declaration](measurements/2026-11-13-xy-held-geometry-unit-base-declaration.log) |

## `DRD-62`, property by property

| Property | Held | Where |
| --- | --- | --- |
| 1. The subclass, as at `f79f66fe2` | Yes, unchanged | `RetainingRectIndex`'s statements are `f79f66fe2`'s. Only `retained`'s parameter type changed |
| 2. `xy()` holds its policy, and no geometry | Yes, unchanged | `xy.ts` isn't in the diff |
| 3. `y()` is unchanged | Yes | `y.ts` and `linear-shift.ts` aren't in the diff. "sortable + y" and "complete" read 0/0/0 against the base, which equals the proposal's final-VX figures against `61f883d09` (§Size) |
| 4. The field types | Yes | See below |
| 5. Type-only | Yes | `src` diff below; the 60 emitted `.js` and `.d.ts` files byte-identical, and `sortable/rect-index.js.map` differs; every size row 0/0/0 |
| 6. The compile-time check | Yes | `tests/rect-index.declaration.test.ts`; MT1 to MT3 fail it (§Mutations) |
| 7. The behavioral witness | Yes | Three tests in `tests/displacement-sink.browser.test.ts`; MX1 to MX5 fail what they name (§Mutations) |

### Property 4 and property 5: the `src` diff

`git diff f79f66fe2 b4117dae2 -- packages/drag/src` changes only `src/sortable/rect-index.ts`:

- **Two aliases after `PLACEHOLDER`,** neither exported, each with one line of JSDoc:
  - `Field = typeof LEFT | typeof TOP | typeof RIGHT | typeof BOTTOM | typeof CENTER_X | typeof CENTER_Y`, "One of the six packed fields of a slot.";
  - `NearEdge = typeof LEFT | typeof TOP`, "The near edge of an axis: `LEFT` for x, `TOP` for y.".
- **The four annotations:** `at(slot: number, field: Field)`, `retained(slot: number, field: NearEdge)`, `constructor(axis: NearEdge = LEFT)` and `readonly #axis: NearEdge`.
- **`verifyEquivalence`:** `index.at(slot, field as Field)` in the copy loop, `differs`'s parameter typed `Field`, and `field as Field` at its two call sites. The loops, their bounds and their counters are unchanged.

No JSDoc changed. None of `at`, `retained` or `#axis` contradicted its new type: `#axis`'s already says "`LEFT` or `TOP`", and `retained`'s names `LEFT` and `TOP`.

**`#axis`, as read** at `b4117dae2`, line 91:

```ts
  /**
   * `LEFT` or `TOP`: the axis `shift` moves along and `travel` reads. An index that
   * never shifts keeps the default.
   */
  readonly #axis: NearEdge;
```

**The emitted files.** The build emits 90 files, and the package's `files` list publishes all of them: 33 `.js`, 27 `.d.ts` and 30 `.js.map`.

- **The 60 `.js` and `.d.ts` files are byte-identical** between the base build and the end build. `diff -r` and the file-list diff both exit 0 ([diff](measurements/2026-11-13-xy-held-geometry-unit-emitted-diff.txt)).
- **That diff's 124 paths aren't all build output.** 64 of them, every path that begins `./.vite/vitest/`, are Vite's dependency cache, which the [copy script](measurements/2026-11-13-xy-held-geometry-unit-copy-emitted.sh.txt) doesn't exclude. They aren't published.
- **This unit didn't compare the source maps.** One of them differs: `sortable/rect-index.js.map` reads 18.97 kB at the base and 19.29 kB at the end in the build's summary, at line 43 of the saved size logs ([base](measurements/2026-11-13-xy-held-geometry-unit-base-size.log), [end](measurements/2026-11-13-xy-held-geometry-unit-end-size.log)). The review's comparison of `f79f66fe2` with `7184d069c` finds it the only file of the 90 that differs, in its `sourcesContent` and `mappings` ([comparison](reviews/xy-held-geometry/proof-reviewer-probes/emitted-compare.txt)). The map embeds the typed source. The published package is therefore not byte-identical: its JavaScript and declarations are.
- `sortable/rect-index.js` is emitted and no `rect-index.d.ts` is, as at the base.

### Where the code differs from the architect's sketch

- **`src`: nowhere.** The resulting blob is the sketch's.
- **The declaration test** has the sketch's accepted and rejected arguments, with these differences:
  - **One `it` per signature,** with "should" in each title, under `describe('RectIndex fields')`, as item 3 asks. The sketch had one `it`.
  - **Each directive has a reason,** as item 3 asks.
  - **The value typed `number`** is a module-level `const unknownField: number = LEFT`, documented.
  - **The constructor calls are `indexes.push(new RectIndex(…))`,** so each is a call rather than a bare `new` statement, which the lint would report. A bare call such as `index.at(0, LEFT)` passed both linters unchanged.
  - **The `at` cases are six separate calls,** not a loop, so each constant is a visible accepted case.
  - It also accepts `new RectIndex(LEFT)`, which the property lists among the accepted arguments.

### Property 7: the tests

Under `describe('xy() reported vectors')`, with `DRD-62`'s titles, at lines 465, 471 and 485 of `tests/displacement-sink.browser.test.ts`:

- **The field, driver and assertions are the probe's** ([`xy-held-flows.browser.test.ts.txt`](probes/xy-held-geometry/xy-held-flows.browser.test.ts.txt)), without its `console.log` lines and its label parameter.
  - `wrappingField(count)`: 100 × 60 cells, three per row in a 300 px wrapping flex container, `c0` hidden with a placeholder before it.
  - `flowPosition(list, cell)`: the oracle, from `offsetLeft` and `offsetTop`. It reads nothing from `RectIndex`.
  - `recordingSink(reports, inner)`: records each `report` and delegates every call to `inner` when there is one.
  - `driveCommittedMoves(…)`: for each target, `resolve` at the target cell's flow center, the placeholder moved to the returned gap, then `moved`. After each move, every reported `dx` and `dy` is `toBeCloseTo` the negated flow travel with precision 1, which is within 0.05 px and so within `DRD-62`'s 0.1 px. Every unreported cell's flow travel equals `[0, 0]`.
  - `installXy(inner)`: one 12-cell field, a `space()` with `ancestry`, the context, and `xy()()`. It registers cleanup through the harness's `onCleanup`, which retires the installer and the inner sink. The harness's `afterEach` empties the body, as for the file's other tests.
- **Wrapping:** targets `[4, 9, 1, 10, 5]`, no inner sink.
- **Animating:** the same targets, with `layoutAnimation({ duration: 60_000, easing: 'linear' })()` as the inner sink, and at the end at least one cell with a running animation.
- **Larger collection:** the same first operation, then `retire()`, 9 cells added, and targets `[15, 2, 19, 7]` on the same installer, with version 2. Both operations are asserted.

The three helpers are shared by the tests. They live at the end of the file, after the existing `describe`, with no change to an existing test's title or assertions. The file's only lint error, `func-name-matching` on `recorded`, is the base's, moved from line 53 to line 59 by the new imports.

## The size

`npx just size` at `b4117dae2`, against item 1's reading at `ae85d8f6a`. Every row is identical in all three columns and its module count ([base](measurements/2026-11-13-xy-held-geometry-unit-base-size.log), [end](measurements/2026-11-13-xy-held-geometry-unit-end-size.log)):

| Row | Base min / gz / br | End min / gz / br | Δ | Modules |
| --- | --- | --- | --- | --- |
| draggable alone | 6,728 / 2,422 / 2,189 | 6,728 / 2,422 / 2,189 | 0/0/0 | 7 |
| draggable + lift | 11,539 / 4,397 / 3,968 | 11,539 / 4,397 / 3,968 | 0/0/0 | 9 |
| example: resize handle | 9,385 / 3,664 / 3,314 | 9,385 / 3,664 / 3,314 | 0/0/0 | 9 |
| example: drop zone | 13,178 / 5,101 / 4,598 | 13,178 / 5,101 / 4,598 | 0/0/0 | 13 |
| example: canvas group | 9,521 / 3,623 / 3,300 | 9,521 / 3,623 / 3,300 | 0/0/0 | 9 |
| freeDrag | 15,157 / 5,565 / 5,018 | 15,157 / 5,565 / 5,018 | 0/0/0 | 15 |
| freeDrag + bounds + landing | 16,322 / 6,055 / 5,450 | 16,322 / 6,055 / 5,450 | 0/0/0 | 19 |
| sortable + y | 20,221 / 7,290 / 6,577 | 20,221 / 7,290 / 6,577 | 0/0/0 | 20 |
| sortable + xy | 20,133 / 7,284 / 6,564 | 20,133 / 7,284 / 6,564 | 0/0/0 | 19 |
| complete | 21,803 / 7,950 / 7,175 | 21,803 / 7,950 / 7,175 | 0/0/0 | 24 |

- **The violation lines are identical,** so no verdict changed. The same 6 rows are over their ceilings, and "draggable alone"'s control line reads the same.
- **The module lists.** `measure.ts` prints only the count. I printed every composition's module list from the end build through `measure` ([list](measurements/2026-11-13-xy-held-geometry-unit-end-modules.txt), [script](measurements/2026-11-13-xy-held-geometry-unit-modules.ts.txt)). The base's lists weren't printed. The rows bundle the published build, whose emitted `.js` and `.d.ts` files are byte-identical to the base's, so the lists are the same input; that is an inference, not a second reading. The suite's graph assertions in `tests/size.node.test.ts` have the same verdicts at both points.
- **Against `61f883d09`, for the record only:** the end's "sortable + y" 6,577, "sortable + xy" 6,564 and "complete" 7,175 B Brotli equal the proposal's final-VX figures. "sortable + xy" is +60 / +18 / +30 against `61f883d09`, from the proposal. `61f883d09` wasn't built again.

## The suites

- **Chromium suite at the end:** 752 tests, 746 pass. Every base title has the base's verdict. The 6 new tests pass: the three declaration tests and the three `drag:DRD-62` tests. The same 6 size rows fail ([log](measurements/2026-11-13-xy-held-geometry-unit-end-suite.log), [verdicts](measurements/2026-11-13-xy-held-geometry-unit-end-suite-verdicts.txt), [status](measurements/2026-11-13-xy-held-geometry-unit-end-status.json)).
- **Consumer project:** 22 files and 326 tests, all pass, and the sorted list of titles and verdicts is identical to the base's. The declaration file isn't among them ([log](measurements/2026-11-13-xy-held-geometry-unit-end-consumer.log)).
- **Declaration project:** 4 files and 23 tests, all pass. `npx vitest run -c vitest.config.ts --project declaration tests/rect-index.declaration.test.ts` selects only the new file and passes its 3 tests ([log](measurements/2026-11-13-xy-held-geometry-unit-end-declaration.log)).

## Mutations

Each ran in the working tree on top of `b4117dae2`, through [a wrapper](measurements/2026-11-13-xy-held-geometry-unit-mutation-step.sh.txt) that applies it with [an exact replacement](measurements/2026-11-13-xy-held-geometry-unit-mutate.py.txt), saves the patch, runs the command, and reverts `src` with `git checkout`. Every step's log ends with "REVERTED: src clean". Campaign `xhg-unit-mutations` ([status](measurements/2026-11-13-xy-held-geometry-unit-mutation-status.json)). Each mutation's record holds both of its steps' output.

### MT1 to MT3: the declaration test

| Mutation | Change | `typecheck`, beyond `repo:RF-31` | `declaration` project | Required | Record |
| --- | --- | --- | --- | --- | --- |
| MT1 | `at`'s field back to `number` | TS2578 at lines 31 and 33, the directives over `at(0, STRIDE)` and `at(0, unknownField)` | 1 failed: `at`'s test | Both, on the `at` lines | [patch](measurements/2026-11-13-xy-held-geometry-unit-mutation-MT1.diff.txt), [output](measurements/2026-11-13-xy-held-geometry-unit-mutation-MT1.txt) |
| MT2 | `retained`'s field widened to `Field` | TS2578 at line 42, the directive over `retained(0, RIGHT)` | 1 failed: `retained`'s test | Both, on the `RIGHT` line at `retained` | [patch](measurements/2026-11-13-xy-held-geometry-unit-mutation-MT2.diff.txt), [output](measurements/2026-11-13-xy-held-geometry-unit-mutation-MT2.txt) |
| MT3 | The constructor's `axis` back to `number`, `#axis` unchanged | TS2322 at `rect-index.ts` line 105, `this.#axis = axis`, and TS2578 at lines 54 and 56, the directives over `new RectIndex(RIGHT)` and `new RectIndex(unknownField)` | 1 failed: the constructor's test | Both, on the constructor lines, and the `#axis` assignment | [patch](measurements/2026-11-13-xy-held-geometry-unit-mutation-MT3.diff.txt), [output](measurements/2026-11-13-xy-held-geometry-unit-mutation-MT3.txt) |

In each, the `declaration` project's summary reads "Type Errors no errors" and reports the failure as a failed test.

### MX1 to MX5: the behavioral witness

| Mutation | Change | `displacement-sink.browser.test.ts`, `drag:DRD-62` tests failed | Required | Record |
| --- | --- | --- | --- | --- |
| MX1 | `moved` calls `retain()` after the rebuild | All three | All three | [patch](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX1.diff.txt), [output](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX1.txt) |
| MX2 | `retained` returns `this.#retained[slot * 2]` | All three | All three | [patch](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX2.diff.txt), [output](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX2.txt) |
| MX3 | `moved`'s rebuild passes `null` as the sink | The animating test only | The animating test | [patch](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX3.diff.txt), [output](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX3.txt) |
| MX4 | `retain` copies slot 0's left and top into every slot | All three | All three | [patch](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX4.diff.txt), [output](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX4.txt) |
| MX5 | `retain`'s bound is `#retained.length / 2` once `#retained` is non-empty | The larger-collection test only | The larger-collection test | [patch](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX5.diff.txt), [output](measurements/2026-11-13-xy-held-geometry-unit-mutation-MX5.txt) |

**Whole Chromium suite, once per mutation, as information.** Beyond the 6 base size-row failures, each run failed:

| Mutation | Total failed | Other tests that failed |
| --- | --- | --- |
| MX1 | 11 | "sortable options should animate displaced rows with layoutAnimation, in xy() too" in `tests/sortable.browser.test.ts`, in the `browser` and `consumer` projects. The consumer project read a build made with the mutation applied |
| MX2 | 9 | None |
| MX3 | 8 | "drag:DRD-50 should settle each row of an xy() rebuild by asking the sink about that row" |
| MX4 | 9 | None |
| MX5 | 7 | None |

So at `f79f66fe2`'s suite, only MX1 and MX3 were caught at all, and each by a test that doesn't assert the reported vectors. MX2, MX4 and MX5 were caught only by the new tests.

## Lint and typecheck

- **Whole-package lint at the end:** 49 ESLint errors and no oxlint error, the base's errors by file, rule and message. The only difference in the output is the line of `displacement-sink.browser.test.ts`'s `func-name-matching` error, 53 at the base and 59 at the end, from the new imports ([base](measurements/2026-11-13-xy-held-geometry-unit-base-lint.txt), [end](measurements/2026-11-13-xy-held-geometry-unit-end-lint.txt)). The new declaration file has none.
- **Typecheck at the end:** `repo:RF-31` only. The output is identical to the base's ([base](measurements/2026-11-13-xy-held-geometry-unit-base-typecheck.txt), [end](measurements/2026-11-13-xy-held-geometry-unit-end-typecheck.txt)).
- **The changed files** went through `handoff.md`'s order from `packages/drag`: `fmt`, `lint-fix`, `fmt`, `lint`, then `typecheck`. `lint-fix` and `fmt` changed no line in any of the three files: each file after them was the one I wrote. The only surviving error is the base's `func-name-matching`, which I didn't repair. `DRF-38`, the other baseline lint errors and `repo:RF-31` weren't touched.

## Boundaries

`git diff --stat ae85d8f6a HEAD -- packages/drag .scripts` lists `src/sortable/rect-index.ts`, `tests/rect-index.declaration.test.ts`, `tests/displacement-sink.browser.test.ts`, this report and files under `measurements/` with the prefix `2026-11-13-xy-held-geometry-unit-`. Nothing else, and nothing under `.scripts/`, `.plan/probes/` or `.plan/reviews/`.

## What wasn't measured

- **Timing:** not run. Speed is unmeasured in both directions, including `retain`'s copy, the compare through `retained`, `xy()`'s rebuild on a subclass instance, and `DRD-62`'s polymorphism risk on a page that runs `xy()` and `y()` together.
- **Allocation:** not run. The proposal's readings stand with the limits `DRD-62` states.
- **Firefox and WebKit:** not run, deferred to the owner's planned CI. No cross-engine claim is made.
- **The base's module lists:** inferred from the identical emitted files, not printed (§The size).
- **Source maps:** not compared. `sortable/rect-index.js.map` differs (§Property 4 and property 5; added on 2026-11-14).

## Next

A fresh independent `reviewer` session, as the handoff's §Independent review describes, pinned to the commit that adds this report. The architect's final acceptance follows the review.