# Arc D — feature proof

**Files read at `c553ff8da`**, the tip of the range `0c62b02c6..c553ff8da` on `drag2/fin-review`. Three sibling review commits (`a6315fa45`, `bd78dc2c3`, `f73be1a1b`) landed on the branch during this pass; `git diff --stat c553ff8da..f73be1a1b` is three files under `.plan/reviews/d170-arc/` and nothing else, so every source, test, bench and record file cited below is byte-identical to `c553ff8da`. No sibling pass's findings were read.

Subject: [D-191](../../contract/00-index.md) as landed — the four steps `0dc6ee2f7` (completion, F-403), `4c9a5c1c6` (F-325 + F-404's instrument), `5c2245884` (F-326) and `c553ff8da` (measurement, records, close).

## Scope

**Covered.** All eleven load-bearing properties in the pass brief, each attacked rather than read: the record's shape and the two declines; the `kernel.closed` / reentrant-retire path; F-325 and F-326 on the published surface and in every local axis view; F-404's disjointness instrument as a falsifier; the `RELEASING` snapshot edge; the bracket-exit census; F-408; a full rebuild and independent re-measurement of all fifteen rows on both commits; the §18 disposition re-derived from `CONTRIBUTING.md` §18 and SC-1; O-13's restoration as an executed instrument; and the series close in the live records. Both disclosed items were reproduced and judged from evidence.

**Method.** Every destructive experiment ran in a detached worktree at the commit under test with `node_modules` symlinked; nine source mutations, two full rebuilds, four full suite runs. The shared checkout was never written to and is clean at the end of the pass.

**Not covered.** The kernel tier beyond the release/retire path the arc's residue names; free drag beyond confirming it is untouched; C4 and O-3; the superseded D-190 and any intermediate variant, except where a claim D-190 originated is still live in D-191.

## Findings

### reviewer-1 — the F-404 instrument's second half does not do what three live documents say it does · Tier B

**Current claim.** `tests/sortable/feature.declaration.test.ts`'s block docblock states: _Disjointness alone is satisfied by a view that had narrowed to nothing, so each side is paired with its owner's row — the behavior's own frame satisfies the frame view, its activation record satisfies the runtime view — and **a narrowing that emptied either would fail there**._ The same claim is in `.plan/contract/03-feature-composition.md` in the present tense — _asserts the intersection empty, with each side paired against its owner so a view narrowed to nothing cannot pass_ — and in `plan.md`'s Arc D entry — _so neither side can pass by narrowing to nothing_.

**Why it is a problem.** The pairing rows are written `expectTypeOf<Owner>().toExtend<View>()`. That is an **upper** bound on the view (nothing may be declared that the owner does not supply); it gets monotonically _easier_ to satisfy as the view narrows, and is vacuous at `{}`. The rows are not dead — they caught the widening in the reproduction below — but they bound the opposite end from the one all three documents claim, and the mechanism that actually pins the views from below is the object-literal fixtures the same docblock names one paragraph earlier.

**Evidence.** In a worktree at `c553ff8da`, both published views in `src/sortable/slots.ts` replaced by `Readonly<{}>`:

```
declaration project:  Tests 89 passed (89)   Type Errors  no errors
```

All three rows — including both pairing rows — stay green with both views empty. Narrowing one member (`settle` removed from `InsertionRuntimeView`) is likewise green in the declaration project and is caught only by five `TS2353` excess-property errors in `tests/sortable/{y,xy}.browser.test.ts`. The positive control holds: `snapshot` re-declared on `InsertionRuntimeView` while it stays on the frame view fails `should declare no member on both` **and** `should be satisfied by the behavior's own activation record`, and `insertion` re-declared there (the pre-F-325 mirror) fails the same two. So the disjointness row is a genuine falsifier and the pairing rows do real work; only the reason given for them is wrong.

**Required property.** Where a document states which assertion defends a property, that assertion must be the one that fails when the property is broken. If the views' lower bound is to be carried by the object-literal fixtures, the three documents must say so rather than attribute it to the pairing rows.

### reviewer-2 — the amended D-158 coverage row cites a test that does not carry its new clause · Tier B

**Current behavior.** `tests/COVERAGE.md` §Displacement was amended by `4c9a5c1c6` to read: _the seam is **one hook**, so one failure row replaces two: there is no second instant at which an axis can fail, **and the same row carries the invalidation discipline — the happy path invalidates nothing, so the bracket's `finally` is the only thing between a failed write and a cache describing a move the DOM never made**_ — citing `tests/sortable/sortable.browser.test.ts` — _should classify a throwing move hook_.

**Why it is a problem.** That row asserts `expect(stages).toEqual([FAILURE_ACTION_EFFECT])` and nothing else; it does not override, count or observe `invalidateInsertion`. The clause was carried over from the deleted row's _name_ (`should invalidate when the move hook fails and not when it succeeds`), whose body asserted only `failed.stages` too. `COVERAGE.md`'s own rule is that where several tests close a row the entry names _the one that would fail first_ — and here that is a different row in the same block. This is F-408's exact species, landed by the same arc that repaired F-408.

**Evidence.** In a worktree at `c553ff8da`, the committed-move bracket's `finally` invalidation deleted (`if (stale && !this.#kernel.closed) { this.#invalidateInSeam(); }` → `void stale;`), then `tests/sortable/sortable.browser.test.ts` run under the browser project:

```
Tests  1 failed | 129 passed (130)
 ×  should classify a throwing lazy invalidation into the failing seam
```

Exactly one row fails, and it is not the row cited. The cited row passes with the invalidation gone. `tests/coverage.node.test.ts` cannot see this — its header says the check is deliberately on the cheap half, that the citation resolves.

**Required property.** A coverage row's cited test must be one that fails when the stated property is broken.

### reviewer-3 — the disclosed formatter-only delta moves `packaging.node.test.ts` from lint-clean to lint-failing · Tier B

**Current behavior.** `5c2245884` reflowed `tests/packaging.node.test.ts:318-322` from `(await sources(SRC)).map(...)` to the three-line parenthesised form. It is genuinely formatter output and behaviourally inert — but `oxfmt` and the ESLint `prettier/prettier` rule disagree about this expression, and the landed form is the one ESLint rejects.

**Why it is a problem.** The package's two formatting gates now demand opposite text for the same statement, and the arc moved the file to the side that fails `just lint`. The change had no other purpose, so the whole of its effect is a new lint error in a file the arc edited.

**Evidence.** In a worktree at `c553ff8da`:

- `npx oxfmt --check .` — `tests/packaging.node.test.ts` is clean; reverting to the baseline form and running `oxfmt` restores the landed form exactly, confirming the delta is oxfmt's.
- `npx eslint -c eslint.config.ts tests/packaging.node.test.ts` on the **landed** form: `321:10 error Replace ⏎··········await·sources(SRC)⏎········ with await·sources(SRC)  prettier/prettier` — 1 problem.
- The same command on the **baseline** form: 0 problems.
- Package-wide the count goes 5 → 6. The other five (`tests/kernel/lifetimes.node.test.ts`, `tests/probes/13b-settlement.ts`) are in files the arc does not touch, so they are pre-existing; the sixth is this one.

**Required property.** A finalized unit leaves no new lint error in a file it edited, and the package's formatting gates do not require contradictory text for the same statement.

### reviewer-4 — the disclosed browser flake reproduces, in a perf instrument's own falsifier · Tier B

**Current behavior.** `tests/perf/m5.browser.test.ts` — _M-5 arm A — falsifying the instrument_ > _should report a difference that tracks a cost injected into window 1_ — asserts `expect(small.difference).toBeGreaterThan(0.02)` against a wall-clock delta from sixteen forced reads of a deep transformed ancestry.

**Why it is a problem.** The threshold is an absolute millisecond figure with no floor calibration against the host, so on a loaded machine the measured difference rounds to `0` and the row goes red. The row exists to prove the M-5 instrument is not blind; a row that reports a false red is the same defect it was written to detect, on the other side.

**Evidence.** Four full-suite runs in a worktree at `c553ff8da`. Three green (`1313 passed | 60 skipped`); one red:

```
FAIL |browser (chromium)| tests/perf/m5.browser.test.ts:629:3
AssertionError: expected 0 to be greater than 0.02
```

**This is not Arc D's.** `git log 0c62b02c6..c553ff8da -- tests/perf/` is empty, and the arc edits `src/sortable/` only; nothing in the file's subject touches the activation record or either axis view. It is reported because it reproduces and is real, not because it was disclosed — and it should not be attributed to this landing.

**Required property.** A timing falsifier's threshold is derived from a measured floor on the host it runs on, or the row is not a falsifier.

### reviewer-5 — F-325's own landing re-opens method bivariance, so a local axis view's runtime shape is no longer pinned · Tier B

**Current claim.** D-191 amends F-404 on the ground that _both memberships are pinned, in both directions, and every mutation this arc makes is already red_, citing that removing `snapshot` from `InsertionRuntimeView` _reddens eight sites including `src/sortable/xy.ts:158` and `y.ts:181`_.

**The citation reproduces at the baseline and stops holding at the landed tree.** At `0c62b02c6` the mutation gives nine `tsc` errors, `src/sortable/xy.ts(158,3)` and `y.ts(181,3)` among them, exactly as cited. But the redness there is an artifact of `insertion`: the baseline published view carries it and the local views do not, so removing `snapshot` leaves the two **mutually** non-assignable and method bivariance fails in both directions. F-325 deletes `insertion` from the published view, which makes the published runtime view a subset of any local one — and bivariance re-opens.

**Why it is a problem.** `slots.ts:62` documents the local-narrower-view pattern as the intended one (_A feature declares its own narrower view in its own module_), and `InsertionGeometry.resolve`/`moved` are method signatures. So at the landed tree an axis that was never migrated — still declaring `snapshot` on its own runtime view and reading `runtime.snapshot` — compiles green and reads `undefined` at run time. The migration of `y.ts` and `xy.ts` was therefore established by reading, not by the compiler, and nothing would have caught it being missed.

**Evidence.** In a worktree at `c553ff8da`, `snapshot: CollectionSnapshot` re-added to `y.ts`'s local `InsertionRuntimeView` with both read sites pointed back at `runtime.snapshot`:

```
tsc -p tsconfig.json --noEmit   →  no errors
declaration project             →  Tests 89 passed (89), Type Errors no errors
```

The migration itself is complete and correct — see the clean result below — so nothing defective ships. What does not hold is the instrument claim the amendment rests on.

**Required property.** Where a decision cites a compile-time falsifier as the reason an instrument is unnecessary, the falsifier must still fire at the tree the decision lands on, not only at the one it was derived against.

## Clean results

Stated explicitly; each was attacked, not assumed.

**1 · The activation record.** `SortableActivation` at `src/sortable/runtime.ts:48` carries exactly `placeholder`, `lift`, `settle`, `space`, `box`, `live` — six members, every one `readonly` (`live` as a `readonly` property signature, with the lint suppression the repo requires). Written in exactly one statement (`spec.ts:924`) and cleared in exactly one (`:1842`); no other assignment exists. `!` assertion sites go 6 → 4 (`0c62b02c6`: `:623, :1192, :1205, :1464, :1487, :1710`; landed: `:618, :1182, :1436, :1688`) — the two D-191 predicts. Both declines hold on the ground given: `progress` is read at `:1631`/`:1645` to decide whether a terminal publishes at all, reachable at `MINTED` where no record exists, so it cannot live in a complete-or-absent record; `pendingSpatial`'s only writer (`:389`) sits behind `if (!this.#operation.activation) return;` at `:385` and its only reader (`:1041`) in the same condition, so it is never read without the record beside it and is refused on mutability rather than on coincident lifetime.

**2 · `kernel.closed` and reentrant retire.** Not weakened. `effectRelease` now captures the record at `:1436` and the barrier at `:1447` still precedes the only statement reading it (`activation.lift.write`), so the failure shape changes from `null.write` (a `TypeError` classified `FAILURE_RELEASE`) to a write into a disposed session — and the comment at `:1440-1450` says exactly that, as D-191's residue required. The barrier still catches every reachable case: all seven `#retireOperation` call sites are queued-action handlers or seam policies, `execution.ts:107` guarantees a nested dispatch appends to the live queue rather than interrupting, the release seam cannot discard (`seams.ts:617`), and the only synchronous reentrancy a custom-element `disconnectedCallback` can reach is `controller.destroy()` → `#bracket.close()`, which latches `closed` before the write is reached. `controller.cancel` and `controller.invalidate` both dispatch and queue.

**3 · F-325 and F-326 on the published surface.** The built `sortable/slots.d.ts` at the landed tree has `snapshot: CollectionSnapshot | null` on `InsertionFrameView` and no `snapshot` and no `insertion` on `InsertionRuntimeView`. Every axis view was in fact migrated: `grep -rn 'runtime.snapshot|runtime.insertion|view.insertion|presentation.snapshot|activePlaceholder|PresentationView' src/ tests/ bench/` returns nothing. The five view declarations are `slots.ts` (published), `y.ts`, `xy.ts` (local, both migrated) and the two in `calling-convention.browser.test.ts` / `sortable.browser.test.ts`, which import the published types. `LinearRuntime` in `linear-shift.ts` dropped `snapshot` and both entry points take it as an argument. The only surviving mentions of the old names are dated provenance in `.plan/` — `contract/01-construction-ownership.md:277,292` (a D-149 entry, in a block explicitly framed as _an inventory of what the behavior keeps, not a declaration that exists_) and `maintainability.md:201` (a discharged M-06 row from a past pass) — which is the treatment D-191 states for them. Caveat: the completeness of this migration rests on reading, per reviewer-5.

**4 · F-404 as a falsifier.** The disjointness row is a real falsifier, not a spelling assertion. Reproduced: green as landed; red when `snapshot` is declared on **both** published views; red when `insertion` is restored to the runtime view (the pre-F-325 intersection). The pairing row on the activation record fires alongside in both cases. The instrument landed with F-325 in `4c9a5c1c6`, as the sequence requires. Its stated lower-bound half is reviewer-1.

**5 · The `RELEASING` snapshot edge.** No currently legal path produces a collection commit at `phase >= RELEASING` ahead of the release resolve. `prepareAction` returns without writing `draft.snapshot` at `IDLE` and at `phase >= RELEASING` (`spec.ts:1112`); the mirror write on the record is gone; `#closeOperation` (`kernel.ts:1852-1878`) commits `RELEASING`, then runs `lifetimes.motion.dispose()`, then `runReleaseSeam` — the one-statement interval D-191 describes. The two consumer-reachable calls inside `prepareRelease` are `#invalidateInSeam()` (which only calls `slots.invalidateInsertion`, lazy by contract) and `resolveInsertion`; a `controller.invalidate()` from either dispatches (`controller.ts:59`) and queues behind the running drain, so `this.#snapshot` cannot be rewritten before `buildReorderProposal` reads it. F-326 also removes a pre-existing disagreement rather than creating one: `#homeGap` at `:618` already read the frozen `frame.snapshot!`, and the axis resolve now reads the same value.

**6 · The bracket-exit census.** Five distinct exits preserved, one duplicate removed. The block (renamed `the committed-move bracket's exits`) keeps the successful bracket, the refused placeholder write (foreign anchor), the throwing move hook, the throwing lazy invalidation raised from inside the `finally` handling the first failure, and the throwing sink — the exact five D-191 enumerates. The deleted row (`should invalidate when the move hook fails and not when it succeeds`) drove `runBracket` with an override byte-identical to the throwing-move-hook row's and asserted `expect(failed.stages).toEqual([FAILURE_ACTION_EFFECT])`, a strict subset of that row's `{left: null, stages: [...]}`. No classification is lost. The seventh row in the old block (`should invalidate and then resolve at release`) is a different subject and is untouched.

**7 · F-408.** Repaired against what its named row asserts. `COVERAGE.md:554` now reads _counted as the displacement report the axis never reaches: `applied` is empty_, and `features.browser.test.ts` — _should not run the bracket past a placeholder reaction that destroyed_ — ends in `expect(applied).toEqual([])`. The second clause is deleted from both the row and the test comment rather than re-pointed. The sibling row at `:268`, keyed on _leaves `rt.snapshot` unchanged_, is re-pointed to a claim the named test does carry (`press(harness.items[3])` after the replacement dropped it, `expect(harness.started).toHaveLength(1)`). `tests/coverage.node.test.ts`, `references.node.test.ts` and `decisions.node.test.ts` all pass (77 tests). The one live coverage statement that does **not** match its named row is reviewer-2.

**8 · The measurement, rebuilt.** Both commits rebuilt from source in detached worktrees and re-measured through `measureAll()`. **All thirty byte figures in `arc-d.md`'s table reproduce exactly**, on both columns, on all fifteen rows — the eight sortable-carrying rows at −264 B minified (−268 on the two `xy` rows) and −45 to −65 B Brotli, the seven others at 0. Module graphs are identical member-for-member on all fifteen rows after normalising the harness's random temp entry path; the counts are the recorded 33/32/34/33/35/36, 27/28/29/30/47, 2/16/31/26 on both sides. No module entered or left any graph. Slack reproduces at 63 B (`vocabulary root`) to 216 B (`xy + layoutAnimation`), 173–216 B on the eight moved rows; no row is negative. The declaration-weight figure reproduces too: 116,389 → 116,432 B raw (+43), comment 85,276 → 85,343 B (+67), against the recorded _116.39 to 116.43 kB_ and _85.28 to 85.34 kB_.

**9 · The §18 disposition, re-derived.** Same disposition, reached independently. The stated trigger is SC-1, and none of its three limbs is met: no row is negative (minimum slack 63 B), every byte that moved is attributable to one named landed change (only sortable-carrying rows moved, with identical graphs), and L-11 landed as D-154 and was answered at that reading. §18's fourth bullet — _a re-base is nothing but evidence, so it is triggered by the reading and never by the boundary that happens to precede the reading_ — is honoured in the text and in the act: `arc-d.md` §No budget re-base, `budget-rebases.md` and `plan.md` each state that the series ending is not admissible as a trigger and is not the argument, and no `budget:` value moved in `measure.ts`. The shrink itself does not compel a re-base: 45–65 B Brotli is inside the band Arc B declined at 7–49 B and Arc C at 6–38 B, and the reclaimable slack is 23–66 B on rows of 10.2–12.3 kB. §18's third bullet's _a pass landing well under budget ends in a re-base_ is the only tension, and it is the tension D-187 already adjudicated and the fourth bullet's stated-trigger rule governs.

**10 · O-13 as an executed restoration.** All five suspended controls are restored at the recorded exact figures and all five hold: `free drag minimal` 8,116, `free drag + bounds` 8,274, `free drag + landing` 8,276, `free drag complete` 8,426, `kernel root — kernel.js` 6,185 — byte-identical across the arc on both columns with no module gained, independently measured. They are live, not comments: perturbing each declared figure by one byte makes `controlViolations` report `control moved by −1 B`, reproducing `arc-d.md`'s own `kernel root` example. The two standing controls held as well (142 B, 6,889 B), so the tree carries seven `control:` rows again. The witness retires only at the last step: `bench/size/measure.ts` is touched by `c553ff8da` alone in the range, and the suspension paragraph leaves the `control?` docblock in that commit — the other two source changes in it are comment-only. Restoration and budget disposition are kept as separate acts in all three records, and no `budget:` moved with the controls.

**11 · The series close.** Closed in the live records with no residue. `00-index.md` carries no `**Unimplemented` marker at all, so the deferred table is empty and D-191's row is gone; `decisions.node.test.ts` asserts both directions and passes. D-191 is marked `Implemented, 2026-09-09` and its status row is `active`; D-190 is `inactive`, superseded. O-13 has moved from §Standing to §Discharged here. The count accounting is consistent: D-191 and O-13 both say four, `arc-c.md` says the series ends at Arc D, and D-188's disagreeing clause is handled the way D-191 prescribes — the inactive entry keeps its wording and gains a pointer (_F-405: the count in force is four, settled at D-191; this inactive entry keeps its wording as provenance_) rather than a rewrite. F-406's correction to the `inactive` enumeration is in place. No contradictory close accounting was found.

**Suite state at `c553ff8da`.** `tsc -p tsconfig.json --noEmit` clean. Full suite: `1313 passed | 60 skipped (1373)` on three of four runs, the fourth differing only by reviewer-4's perf flake. Three `tests/consumer.node.test.ts` failures seen on a first run were an artifact of my own worktree (`@ydinjs/box-quad` unbuilt) and cleared once that sibling package was built; they are not a property of the tree.