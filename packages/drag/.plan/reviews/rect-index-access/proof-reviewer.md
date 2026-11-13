# RectIndex access: feature proof

**Lens:** `reviewer`, feature proof of `DRD-61` properties 1 to 11 against [`rect-index-access-handoff.md`](../../rect-index-access-handoff.md) and [`rect-index-access-report.md`](../../rect-index-access-report.md). The owner's brief: review the ownership boundary, the geometry behaviour, the displacement-sink protocol, the tests and the verification evidence. Assess the timing evidence apart from the A/A wording in `DRD-61`. Account for the baseline of 49 lint errors, `repo:RF-31` and six size failures. Chromium only.

**Commits read:** the range `2e47e7afe..f788b2b80` on `drag/rect-index-ownership`. The source and test commit is `010a9ef39`, and the report commit is `f788b2b80`. `DRD-61` and the handoff were read as they stand at `f788b2b80`.

**The branch tip was `30bf21e6e` when this review started.** That commit is the architect's acceptance of the report, and it is outside the range. It changes only `.plan/` files: `git diff --stat 010a9ef39 30bf21e6e -- packages/drag/src packages/drag/tests` is empty. So my test runs at `30bf21e6e` exercise `010a9ef39`'s code. I saw that commit's `00-index.md` diff while I checked the branch. I didn't read `rect-index-access-assessment.md`, and I didn't assess the architect's correction of the A/A wording.

**Method:** I read the diff of the seven changed files in full, and I read the saved measurements. I ran these checks myself in a detached scratch worktree at `30bf21e6e`, with `node_modules` linked to the review worktree's copy and `box-quad`'s built output copied in:

- the `browser` and `shipped` projects in Chromium;
- lint and `oxfmt --check` on the seven changed files;
- two mutation probes;
- recomputation of the allocation and timing figures from the saved files.

Nothing in the branch's tracked source was edited. The probes and their outputs are in [`proof-reviewer-probes/`](proof-reviewer-probes/). Their paths name my scratch directory.

## Scope

**Covered:**

- `src/sortable/rect-index.ts`, `axis.ts`, `layout-animation.ts`, `linear-shift.ts`, `y.ts` and `xy.ts`, and `tests/displacement-sink.browser.test.ts`, each read as a diff against `2e47e7afe` and at `010a9ef39`;
- the ownership lists and the line citations in the report's §Ownership;
- the arithmetic of `#read`, `shift` and `travel` against the base's `pack`, `settle`, `advance` and the linear shift's probe;
- the W7 and W8 tests, and the saved outputs of M7a, M7b, M8 and M-axis;
- the saved size logs, suite verdicts, lint and typecheck outputs, `.d.ts` diff, allocation lines, and the timing probe's page, output and JSON;
- references to the removed members anywhere in `packages/drag` outside `.plan/`, in `.scripts/` and in `.agents/`.

**Not covered:**

- the integrity and cleanup lenses;
- the reference patch's own hunks, apart from where the report says the code differs from the patch;
- the rollback report at `8904947f6`, `DRO-4`, `DRF-38`'s scope and budgets.

**Not rerun, accepted from the saved evidence:**

- the `node`, `consumer` and `declaration` projects;
- whole-package lint and typecheck, `typedoc` and the `.d.ts` comparison;
- the size gate, the allocation probes and the timing probe;
- M7a, M7b and M-axis.

Firefox and WebKit weren't run, and the deferred campaigns stayed stopped.

## Results by area

### Ownership boundary

**Null result.** Every write to `#values` or `#items` in `src/sortable/` is a method of `RectIndex`, at the lines the report lists (`rect-index.ts:148`, `156`, `162`, `216–218`, `298`, `331–336`), and I checked each line at `010a9ef39`. The other element writes are to arrays that aren't the index's: `verifyEquivalence`'s locals, `xy()`'s `before`, and `layoutAnimation`'s `local` delta. No member returns `#values`, `#items` or a view of either. `insertion` returns the object that `insertionAt` builds, which holds two elements and no array (`domain.ts:24–33`). The handoff's search finds only `xy.ts:51` and `xy.ts:131`.

### Geometry behaviour

**Null result: the end computes the base's values.**

- **`#read`, `pack` and `settle`.** With no sink, or when `displaced` answers `false`, each edge is `rect.edge − 0`, which is `rect.edge` exactly. Each center is computed from those edges, as `pack` computed it. When `displaced` answers `true`, each edge is `rect.edge − carried`, and each center is computed from the settled edges, as `settle` computed it.
- **`shift(lo, hi, delta)` and the base's `advance`.** With `TOP` as the axis, `shift` writes `TOP`, `TOP + RIGHT` (`BOTTOM`) and `TOP + CENTER_X` (`CENTER_Y`), with `advance`'s arithmetic. No branch depends on the axis.
- **`travel` and the base's probe.** `travel` returns the settled top of the scratch reading minus the cached top, which is the value of the base's probe. The base's probe settled only `TOP`, and `travel` settles all six fields of the scratch slot, which nothing else reads.
- **The order of the sink calls.** `displaced` is now called after each rect read, where `settle` was called once after the range was read. The answer comes from animation timing within the same task, so this order changes no value.
- **Storage growth.** The storage grows only in `collect`, and `collect` always runs before `measurePlaceholder`, `holds`, `travel` or `at(PLACEHOLDER, …)` can write or read the two leading slots. So no write lands past the array's length.
- **The development check's held x.** The two numbers have the base tuple's lifecycle: they are set when a re-read follows a move, and cleared only when the check runs.

### Displacement-sink protocol

**Null result.** `displaced(element)`, `readonly dx` and `readonly dy` match `DRD-61` property 6, and the emitted `sortable/axis.d.ts` changes as the property states (saved diff). `layoutAnimation`'s `displaced` performs one `Map.get` and, for a running row, one `remainingOf`. It reads no layout, and `report` and `retire` are unchanged.

One behaviour changes as `DRD-61` specifies it. The base `settle` returned at once when `running.size === 0`. Now each measured row costs one `displaced` call and one `Map.get`, even when nothing is in flight. That cost is what timing case B measures, and case B doesn't resolve it (§Timing evidence).

### Tests and mutations

- **W7, both tests.** Each recorded `displaced` call is checked against the destination rows read since the call before it. Rows read after the last call aren't checked. Both titles match `DRD-61` property 10.
- **Saved verdict lists.** The base and end lists, with line numbers removed, differ only in the two W7 titles.
- **The saved mutation outputs** show what the report says.
- **W8 under M8, with the development check.** The development check faults first (`DragFault … at slot 2`), and W8 fails on its gap assertion with `-1`. Its settled-top assertion, line 286, passes (finding `reviewer-3`).
- **W8 under M8, without the development check.** I added an early `return` to `verifyEquivalence` and applied M8 on top. W8 still fails, on the gap assertion: `expected 2 to be 3` ([patch](proof-reviewer-probes/nocheck-M8.diff.txt), [output](proof-reviewer-probes/nocheck-M8.txt)). With the check disabled and no M8, all four tests pass ([patch](proof-reviewer-probes/nocheck.diff.txt), [output](proof-reviewer-probes/nocheck.txt)). So W8 detects M8 by itself.

**The suite at `30bf21e6e`:** `browser` and `shipped` in Chromium, 27 files, 363 of 363 tests pass ([output](proof-reviewer-probes/suite-browser-shipped.txt)).

### Baseline errors and size failures

- **Lint.** The saved whole-package outputs have 49 errors at both ends. They are identical apart from `DRF-38`'s `func-name-matching` error, which moves from 57:3 to 53:3. My lint of the seven changed files reports only that error, and `oxfmt --check` passes on them.
- **Typecheck.** The saved end output has only `repo:RF-31`'s `TS2322` in `.scripts/tsdown-library.ts`.
- **Size.** The base and end logs differ only in the three `sortable` rows: −205/−28/−31, +103/+65/+22 and −302/−93/−92. The six failing rows are the base's six. "complete" is still over its ceiling, by 101 B instead of 193 B. The seven control rows don't appear in the diff.
- **Repairs.** None of the baseline errors was repaired.

### Allocation

**I recomputed the report's means, ranges and differences from the saved lines, and they match.** The figures are bytes allocated, and I infer no speed from them. One line conflicts with a property verdict (finding `reviewer-2`).

## Timing evidence

This section is about what the run measured. It doesn't comment on how `DRD-61` words the A/A threshold.

**The run conforms to item 7.** It ran as one process with one attempt, under a recorded hold from 13:04:04 to 13:06:57 UTC. The arms ran in rotated order. Every timed batch lasted at least 270 ms. In case C, no arm read a rect, and every arm answered the same gap in each case.

**The verdicts reproduce.** I recomputed the sign counts, medians, A/A thresholds and verdicts from the JSON with [`timing-check.mjs`](proof-reviewer-probes/timing-check.mjs.txt). All three are "no difference shown", with the report's figures.

**What the seven paired differences span,** as a share of the median `before` operation:

| Case | Lowest `production` − `before` | Highest | Rounds where `control` < `before` |
| --- | --: | --: | --- |
| A: `xy()` rebuild, no sink | −28.9 % | +10.9 % | 5 of 7 |
| B: `xy()` rebuild, sink, nothing in flight | −45.6 % | +52.7 % | 5 of 7 |
| C: `y()` scan of a grown window | −38.7 % | −3.1 % | 5 of 7, and 1 tie |

With seven rounds, the interval from the lowest to the highest paired difference is the sign test's interval for the median difference. Its nominal coverage is 1 − 2 × 2⁻⁷ ≈ 98.4 %, but only if the rounds are independent and identically distributed. These rounds share one process and one unpinned machine, so the coverage is an indication, not a guarantee.

My reading:

- **A:** the run doesn't exclude a slowdown of `xy()`'s rebuild up to about 11 %. A larger one is not supported, under the assumption above.
- **B:** the run is not informative. A difference of about ±50 % in either direction fits the readings. The per-row sink lookup that `DRD-61` adds is unmeasured.
- **C:** `production` was lower than `before` in 7 of 7 rounds. But `control`, which runs `production`'s compiled functions, was also lower than `before` in 5 of 7 rounds, with one tie. The A/A threshold comes from two instances of the same functions, so it contains no difference between the two bundled copies of the code. The calibration also warms only `production`'s functions. So the pattern in C can come from the code copies rather than from the change, and C's speed is unmeasured in both directions. This agrees with the report.
- **The noise.** The process wasn't pinned (`fff`) on a CPU with four P-cores and eight E-cores. Single rounds ran 39 % to 47 % above their arm's median. That fits `DRD-44`'s finding that unpinned readings span both core classes. It is a limit of the run, not a defect: item 7 asked only that pinning be recorded.

**Agreement with the report.** The report's §Timing and §Wording for the architect read the A/A figure as the rule's threshold and not as a limit on a missed slowdown. That agrees with the evidence above. The correction of `DRD-61` belongs to the architect.

## Findings

No finding is tier A or B. A correctly integrated consumer observes nothing different from what `DRD-61` specifies, and the published `.d.ts` changes only as the decision states.

### The source-only test list's comment names removed members (`reviewer-1`, tier C)

- **Finding:** `.scripts/vitest-config.ts:620–622` still gives two reasons why `tests/displacement-sink.browser.test.ts` is source-only: "`report` and `settle`" and "`STRIDE` and `TOP` from `src/sortable/rect-index.ts`".
- **Current behaviour:** at `010a9ef39`, `settle` no longer exists, and the test file imports neither `STRIDE` nor `TOP`. The list entry is still correct, because the file reads `displaced` from the unpublished `DisplacementSink` type. Only the stated reasons are out of date.
- **Why it is a problem:** the comment is the record of why the file is kept out of the consumer project. It names a member that doesn't exist and an import that isn't there. The handoff's §Boundaries forbade changes to `.scripts/`, so the implementer couldn't change it, and the report doesn't mention it.
- **Evidence:** `git grep -n "settle\|STRIDE" f788b2b80 -- .scripts/vitest-config.ts`, and the test file's imports at `010a9ef39`.
- **Required property:** the comment gives the reasons the file is source-only now.
- **Route:** architect, because the path is outside the unit's boundaries.

### Property 3's "allocate nothing" is marked held against an allocation reading for `at` (`reviewer-2`, tier C)

- **Finding:** `DRD-61` property 3 says "`at` and `item` allocate nothing". The report's property table marks property 3 "Yes". Its own allocation record attributes bytes to `rect-index.ts:at` at the end.
- **Current behaviour:** in each of the three end launches of the per-drop probe, the heap sampler attributes 3,300, 3,288 and 3,600 B to `at` (`…-alloc-end.txt` lines 139, 284 and 429). The report's §Allocation lists `at` among the new functions, and says that `at` constructs no object in its source and that the cause isn't established. The property table doesn't reconcile that with "Yes". The per-`y()`-sample probe attributes nothing to `at`. So the reading may come from an engine tier, such as a number boxed when `at` isn't inlined. That isn't verified.
- **Why it is a problem:** the record says the property holds, and the record's own measurement says otherwise for one probe. The architect can't tell from the report which reading of "allocate nothing" was applied: no object constructed in the source, or no bytes measured.
- **Evidence:** the three `RIA-SINK-DROP-PROBE` lines cited above, and the report's §`DRD-61`, property by property, row 3.
- **Required property:** the verdict for property 3 agrees with the allocation evidence, or `DRD-61` states which reading of "allocate nothing" it requires.
- **Route:** architect. The question is about the wording and verdict of `DRD-61`, not about the implementation.

### W8's settled-top assertion doesn't read the index (`reviewer-3`, tier C)

- **Finding:** `DRD-61` property 10 keeps W8 "unchanged as a property: its settled top is the presented top minus `dy`". The new assertion (`displacement-sink.browser.test.ts:286`) computes that top from two values: the presented top that the test's own `getBoundingClientRect` wrapper recorded, and the sink's `dy`. Neither value depends on what `RectIndex` writes.
- **Current behaviour:** at the base, W8 read the settled top from the cache's slot array. Now line 286 checks `layoutAnimation`'s `dy` against flow, and it passes under M8. W8 detects M8 through its gap assertion, line 287, with or without the development check (§Tests and mutations). The implementation follows the handoff's item 4.2 to the letter.
- **Why it is a problem:** the line that the decision and the handoff call W8's settled-top check is now a check of the sink, not of the index's subtraction. The index's settled value is observed only through the gap that W8 holds and through the development check. The report's M8 row doesn't show this: its saved output for W8 fails on the gap after the development check's fault, and line 286 passes.
- **Evidence:** [`nocheck-M8.txt`](proof-reviewer-probes/nocheck-M8.txt), and `…-mutation-M8.txt` lines 25, 75 and 83–88.
- **Required property:** the record names the assertion that witnesses the index's settled value. W8's mutation evidence, M8, is attributed to that assertion.
- **Route:** architect, because the question is the wording of `DRD-61` property 10. No test change is implied by this review.

## Evidence limits

- **Projects not run here:** I didn't run the `node`, `consumer` or `declaration` projects. Their verdicts come from the saved lists.
- **Checks taken from the saved files:** whole-package lint, typecheck, `typedoc`, size, allocation and timing come from the files the unit saved. Nothing in them was rerun.
- **One engine:** Chromium only. Firefox and WebKit are deferred to the owner's planned CI.
- **W7 coverage:** W7 doesn't check rows read after the last `displaced` call of a drag.
- **Timing:** the intervals in §Timing evidence assume independent rounds. The A/A design can't separate the change from a difference between the two bundled copies of the code.

## Scratch work

**Removed:** the detached scratch worktree at `30bf21e6e`. **Kept:** nothing outside this directory.

## Next

The architect reads this review and decides what to do with `reviewer-1` to `reviewer-3`. Nothing here returns the unit or asks for a change to the implementation.