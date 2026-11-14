# xy() held geometry: assessment

**Read:** [`xy-held-geometry-report.md`](xy-held-geometry-report.md) at `7184d069c` on `drag/rect-index-ownership`, the unit's source and test commit `b4117dae2`, and the independent [feature proof](reviews/xy-held-geometry/proof-reviewer.md) at `c4d02d45c`, with its [probes](reviews/xy-held-geometry/proof-reviewer-probes/). The review read and ran `7184d069c`, and read the report only after its own checks. **Governing records:** [`xy-held-geometry-handoff.md`](xy-held-geometry-handoff.md), and `DRD-62` and what it amends in [`00-index.md`](00-index.md). Assessed by the architect on 2026-11-14, in Chromium only.

**Outcome: accepted.** `b4117dae2` implements `DRD-62`, and no return condition was met. The review found nothing at tier A or B. Its one finding, `reviewer-1` at tier C, is in the report's record of the emitted files, not in the source or the tests. It is resolved by correcting the report in place (§4.1). `DRD-62` property 2 is also corrected in place, to name an exit the adopted source already has (§4.2).

**What the unit changes in the publication:** the build's 33 `.js` and 27 `.d.ts` files are byte-identical to `f79f66fe2`'s. One of its 30 source maps, `sortable/rect-index.js.map`, differs, because it embeds the typed source. Every size row reads 0/0/0 against `f79f66fe2`.

## 1. What the architect checked

The architect read the diffs, the saved evidence and the review's probes. **Nothing was rerun.** The one open question, which files the report's 124 paths are, is settled by the saved file list (§4.1).

| Check | Result |
| --- | --- |
| `git diff --stat ae85d8f6a 7184d069c`, outside `measurements/` | `src/sortable/rect-index.ts`, `tests/rect-index.declaration.test.ts`, `tests/displacement-sink.browser.test.ts` and the report. Nothing else |
| `git diff --stat b4117dae2 7184d069c -- packages/drag/src packages/drag/tests` | Empty |
| `src` against `f79f66fe2` | Only `rect-index.ts`, which is blob `b9234028e` at `7184d069c`, the sketch's blob |
| The review commit `c4d02d45c` | Adds only files under `reviews/xy-held-geometry/` |
| Saved size logs, base against end | One line of the build summary differs, `sortable/rect-index.js.map` 18.97 → 19.29 kB, and with it the build's total, 309.13 → 309.45 kB over 90 files. Every size row and violation line is identical |
| Saved typecheck outputs | Identical: `repo:RF-31` only |
| Saved suite verdicts | The end list is the base list plus the six new titles, all passing. 752 lines |
| `held === 0` in `xy.ts` | Present at `61f883d09`, at `f79f66fe2` and at `7184d069c` |
| The emitted-file list | See §4.1 |

## 2. The implementation

**Properties 1 to 7 hold,** as the report states and as the review established independently, by reading and by running. The review's null results agree with the saved evidence on every property.

- **The source is the sketch,** byte for byte. The aliases are module-private, and no other signature changed.
- **The declaration test's differences from the sketch are accepted.** Item 3 asked for one `it` per signature and a reason on each directive. The rest are as the report lists: the module-level `unknownField: number`, the constructor calls pushed into an array so that none is a bare `new` statement, the six `at` calls written out, and `new RectIndex(LEFT)` among the accepted calls.
- **The behavioural tests' oracle is independent of the index.** `flowPosition` reads layout offsets, which ignore transforms, and nothing from `RectIndex` or the sink.
- **The mutations fail what `DRD-62` names.** MT1 to MT3 fail the declaration project and `typecheck`. MX1 to MX5 fail the `drag:DRD-62` tests that property 7 names. The review's own RT1, RT2, RB1 and RB2 also fail them, and it reran MX2, MX3 and MX5 with the same result.
- **The new tests close a gap the suite had.** At `f79f66fe2`'s suite only MX1 and MX3 were caught, each by a test that doesn't assert a vector. MX2, MX4 and MX5 are caught only by the new tests.

## 3. Costs

These are `DRD-62` §Costs. The unit changes none of them, and the assessment adds no reading.

- **Size:** against `61f883d09`, "sortable + xy" +60 / +18 / +30 B, at 6,564 B Brotli under its 6,617 B ceiling. Every other row reads 0/0/0. Against `f79f66fe2`, every row reads 0/0/0. The review rebuilt all three commits and agrees.
- **Allocation:** the proposal's readings stand, with the limits `DRD-62` states. No allocation campaign ran in the unit or in the review.
- **Speed: unmeasured** in both directions, on every path, including `retain`'s copy, the compare through `retained`, the rebuild on a subclass instance, and the polymorphism risk on a page that runs `xy()` and `y()` together. The timing check stays prepared and unrun. Nothing in this assessment infers speed from size or allocation.

## 4. The independent review

### 4.1 Vite's cache counted as emitted files (`reviewer-1`)

**Accepted, tier C.** The report said that "all 124 emitted `.js` and `.d.ts` files are byte-identical". The saved evidence shows:

| Paths in the [emitted-file diff](measurements/2026-11-13-xy-held-geometry-unit-emitted-diff.txt)'s list | Count | What they are |
| --- | --- | --- |
| Beginning `./.vite/vitest/`, under three hash directories | 64 | Vite's dependency cache, written by the test runner. The [copy script](measurements/2026-11-13-xy-held-geometry-unit-copy-emitted.sh.txt) prunes `node_modules`, `src`, `tests`, `bench`, `.plan` and `.campaigns`, not `.vite`. Not build output, and not published |
| The rest | 60 | The build's own output: 33 `.js` and 27 `.d.ts`. The same 60 paths as the `.js` and `.d.ts` files in the review's [comparison](reviews/xy-held-geometry/proof-reviewer-probes/emitted-compare.txt) |

**The publication is 90 files.** The build's summary in the saved size logs reads "90 files", and the package's `files` list covers all of them: 33 `.js`, 27 `.d.ts` and 30 `.js.map`.

**Source maps.** The unit's script copied only `.js` and `.d.ts`, so the unit compared no map. The maps change:

- **the unit's own logs** show `sortable/rect-index.js.map` at 18.97 kB at the base and 19.29 kB at the end, at line 43 of the saved [base](measurements/2026-11-13-xy-held-geometry-unit-base-size.log) and [end](measurements/2026-11-13-xy-held-geometry-unit-end-size.log) size logs;
- **the review's comparison** of `f79f66fe2` with `7184d069c` finds that map the only file of the 90 that differs, in `sourcesContent` and `mappings`. Its `version`, `file`, `names` and `sources` are the same.

The map embeds the source, so any change to the source changes it, a type-only change included. **Property 5 requires identical JavaScript and declarations, and doesn't cover maps.** The changed map is expected, and it is accepted. It isn't a deviation from `DRD-62`. No size row bundles a map.

**The conclusion of the report holds.** `diff -r` covered all 60 real outputs, and the review's comparison against `f79f66fe2` agrees with it.

**Decided:**

- **The report is corrected in place,** under a dated note that quotes the five passages as they were. It counts and names only the build's output, says that the 124 paths include 64 cache files, and says that it didn't compare source maps and that `sortable/rect-index.js.map` differs. §What wasn't measured gains a bullet for the maps.
- **The saved measurements aren't changed.** The copy script, both copy counts and the emitted-file diff still read 124, because that is what the commands printed. The corrected report reads them.
- **No source, test or tool changes.** The copy script is unit evidence, not a repository tool. No finding is registered, because the correction closes `reviewer-1`.

### 4.2 Property 2 and the `held === 0` exit

The review noted, for information, that `moved` returns after `invalidate()` when the index held no slot, and that property 2 doesn't name that case. Property 2's second bullet said "With a sink and a known, changed gap, `moved` … invalidates and rebuilds with the sink". Read literally, that required a rebuild with no slot held, which neither the base nor the adopted source does.

**Decided: property 2 is corrected in place.** It now names the case: with no slot held, `moved` only invalidates, as the base does, because there is nothing to compare. This is wording. `DRD-62` adopts `f79f66fe2`'s source, which has the exit, so what the decision requires of the code doesn't change, and no new decision is needed. The correction quotes the two bullets as they were.

### 4.3 The rest of the review

- **Limits of the witness.** The `drag:DRD-62` tests pass no box, so the box path of `moved`'s rebuild isn't witnessed by them. Their counts never fall across a rebuild, so the `count < held` side of `span` isn't exercised. Both are recorded in `DRD-62`'s result as limits. Neither is a defect, and no unit is opened for them.
- **The long comment line** at `rect-index.ts:17`, 98 characters in a block that wraps near 84. It came with `f79f66fe2`'s adopted source, the handoff didn't allow the unit to change it, and no rule covers comment width. It isn't a finding, and it isn't routed.
- **Size, suite, lint and typecheck.** The review's builds and runs agree with the report: the six red rows, "complete" over by 110 B, 752 tests with 746 passing, 49 ESLint errors with `DRF-38`'s line moved from 53 to 59, and `repo:RF-31`.
- **The record.** The review found that `DRD-62`'s amendment notes quote what each amended entry said at `61f883d09`, and that §Costs and §Limits claim nothing the measurements don't show. Speed isn't inferred from allocation.

## 5. What stays separate

- **Budgets:** no ceiling or control figure changes. The six red rows are the base's, "complete" stays over by 110 B, and nothing goes to `DRO-4`.
- **Lint and typecheck:** the base's 49 ESLint errors, including `DRF-38`, and `repo:RF-31`, with nothing added and nothing repaired.
- **Speed and the timing check,** unmeasured and unrun, unless the owner asks for the check under `DRD-44` property 6's hold.
- **Firefox and WebKit,** not run, and deferred to the owner's planned CI.
- **The rollback report at `8904947f6`:** not read or accepted here. It stays pending.
- **The deferred campaigns** stay stopped.

## 6. Next

**None for `DRD-62`.** It is implemented and accepted, and no follow-up item is open. Integration and the pull request are the owner's.