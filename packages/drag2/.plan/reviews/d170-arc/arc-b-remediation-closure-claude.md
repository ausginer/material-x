# Arc B remediation — closure review

**Range:** `6def139f0..5a438352c`, one commit. Base settles Q-28 as D-187; head is the F-387…F-398 remediation.

**Files read at** `5a438352c`, which is `HEAD` with `git status --porcelain` empty; `HEAD:packages/drag2/src` resolves to tree `ec58b2972a2eb9b4f95c1956089628411da4d266`. The shared checkout carried no source mutation at any point in this pass: every mutation ran in a detached `git worktree`, and the shared tree's only modification throughout was this artifact.

**Bounded by instruction.** This is a closure review of one remediation, not a second Arc B review. It asks two questions and no others: is each of F-387…F-398 discharged by the landed tree, and does the landing stay inside D-184, D-186 and D-187.

## Method

**Two detached worktrees, never the shared checkout** — one at `5a438352c` for mutation and measurement, one at `5f7a901a4` for a suite-size control. Each was linked to the checkout's `node_modules` and removed afterwards. The previous round's failure mode — a zero-redden mutant surviving in the shared tree because no suite could fail on it — cannot recur through this pass: the shared tree was never written to.

**Eleven suite runs.** A baseline plus ten one-at-a-time mutations, each applied from a pristine copy of `kernel.ts` and reverted before the next, over `node/drag2` and `browser/drag2`. The `declaration/drag2` project was run separately to fix the suite population. **Three `consumer.node.test.ts` rows fail in an unpacked worktree by construction** — _expose exactly the intended runtime surface_, _expose sortable.js as a runtime module_, _ship a runtime module for every landed subpath_ — and are red in the baseline too; every count below excludes them, exactly as `COVERAGE.md` says it does.

**Suite population, measured rather than assumed.** `node` 358 + `browser` 920 (60 skipped included) + `declaration` 86 = **1364**. The register's stated population is exact.

**The measurement was rebuilt, not read.** `bench/size/measure.ts` bundles built output, so the worktree was built with `tsdown` from the clean tree before `measureAll()` ran. The build produced no tracked diff, because `drag2`'s build output is untracked — the stale-build hazard that misled the previous pass cannot reach a tracked figure here, but it can still reach a measurement, and the rebuild is why the numbers below are the tree's.

## Executed mutations

Every count the construction register states was re-derived. Nothing was accepted as recorded.

| Mutation | Register says | Observed | Rows |
| --- | --- | --- | --- |
| the unwind reached only by `arm()`'s throwing exit | 5 | **5** | _retire the behavior_, _unwind both frames_, _compose no frame part_, _reset only the frame parts_, browser _reset only the composed frame_ |
| the third latch test dropped (`if (true)`) | 5 | **5** | the same five |
| **`if (current && draft)` in place of the latch** — F-387's original mutant, restored | not booked | **1** | _unwind both frames_, alone |
| the unwind's `if (draft)` dropped | 4 | **4** | _reset only the frame parts_, _reset no frame part_, browser _reset only the composed frame_, browser _scrub the first frame_ |
| the unwind's `if (current)` dropped | 1 | **1** | _reset no frame part_, alone |
| the latch test before the first composition dropped | 2 | **2** | _compose no frame part_, _reset no frame part_ |
| the `#spec` guard on `fail` dropped | 1 | **1** | _demote a fail()_, alone |
| the `#spec` conjunct in `#cancelWith` dropped | 1 | **1** | _cancel() idle no-op_, alone |
| the static validation gated on the terminal latch | 2 | **2** | _refuse an invalid configuration_, _refuse a colliding command type_ |
| the validation moved below the first latch test, ungated | 0 | **0** | — |

**Every figure and every enumeration reproduces exactly.** No entry understates, none names a row that does not redden, and none omits a row that does.

## The findings, one by one

### F-387 — discharged, and the witness is the sharpest one available

The register books _should unwind both frames when the second frame-part factory destroys the controller_ against the third latch test, at 5 rows. That count reproduces, but it is not what proves the repair, because `if (true)` is a coarser mutant than the one F-387 was about.

**The original mutant was restored and run.** Replacing `if (!this.#bracket.closed)` with `if (current && draft)` — the expression F-387 found invisible, transposed onto the post-F-394 shape — reddens **exactly one row, the new one, and nothing else in 1364**. That is the strongest possible discharge: the mutant that reddened 0 rows now reddens precisely the row written for it, and no other row stands in for it. The register's own claim about that row — _this being the only one on which the pair-narrowing that once stood beside the latch could not stand in for it_ — is confirmed by execution rather than by argument.

The row's mechanism is the one F-374 described: two compositions complete, both frames are truthy, the latch is closed, and only the latch can refuse the arm.

### F-388 — discharged, and both guards are separately observable

`if (current)` dropped reddens **1** row and `if (draft)` dropped reddens **4**, with different red sets and no broader mutation standing in for either. The register books them as two mutations with two counts, which is what the finding required. The mechanism is re-verified at the tree: `frame(existing?)` is `Object.assign(existing ?? {}, DEFAULT_FRAME)`, so a null target yields `{}` rather than throwing and passes `null` to the behavior's own `resetFramePart`.

**The asymmetry is worth stating because it is not a defect.** `if (current)`'s red set is a subset of `if (draft)`'s. The property F-388 asserts is that each guard's deletion is detected by some row and that the register books them separately; both hold. Read from the mutation side, `if (current)` dropped satisfies F-346's standard exactly — one mutation, one row, no other.

### F-389 — discharged, with the validation semantics untouched

_should refuse a colliding command type even when the factory destroyed the controller_ is added, and the gating mutation reddens **both** validation rows. The register says so and explicitly declines to claim the two are separated, which is the honest form after F-396. The negative control still reads 0: moving the validation below the first latch test without gating it changes nothing, and the register keeps that as the mutation the property is not about.

**No validation semantics moved.** The comment-stripped diff of `kernel.ts` over the range is a single hunk, and it is not in the validation block.

### F-390 and D-187 — discharged; no residual-coverage claim survives, and no wording makes the boundary a re-base trigger

Swept across `src/`, `tests/`, `bench/` and `.plan/` outside `reviews/`. The sentence _they are what still detects a kernel symbol reaching a composition that should not have one_ survives in exactly two places, both correct: struck through in F-385's ledger entry with its retirement dated to D-187, and quoted inside D-187's own analysis of why it was false. **No live record asserts it.**

- `measure.ts`'s `control` docblock loses its census and the claim, and cites `obligations.md` O-13 for the withdrawal.
- `arc-b-remediation.md` §The controls carries _nothing here says what the remaining rows still cover_ and points to O-13 as the one place the withdrawal is stated.
- O-13 states the withdrawal in the instrument's own vocabulary — byte transfer on five rows — and enumerates what is **not** withdrawn.

**The boundary is not a re-base trigger anywhere.** O-13 says so in terms (_the close restores the five controls and authorises nothing else… it is **not** a re-base trigger_). `arc-b-remediation.md` §No budget re-base is rewritten from _the re-base trigger for these rows is O-13's close_ to _O-13's close restores the five controls and authorises no re-base_. The new section's closing line says the restoration boundary is unchanged. `measure.ts` says only that the rows are _restored with fresh exact figures when the last arc lands_ — a restoration, not a re-base. The three surviving re-base triggers in the package (`arc-a.md`, `arc-b.md`, SC-1) are all readings.

O-13 still restores at the arc-series boundary and nowhere else, and what it is owed and when are unchanged.

### F-391, F-392, F-393, F-395, F-397 — discharged against the tree

- **F-391.** The transcribed block declares seven members, with `readonly closed: boolean` in the same position `spec.ts` puts it — after `fail`, before `cancel`. The false half of the prose, _this section's own list has always carried it_, becomes _the list below carries_, which is now true.
- **F-392.** `arm()`'s unwind-trigger clause lists three triggers — either frame factory, the static-configuration validation, any ingress attachment — and reading `arm()`'s body at the tree confirms those are all there are. The deleted family is gone from the sentence.
- **F-393.** `00-index.md:1499` strikes both halves and dates them to D-186. **The extra F-273 cleanup is present** and is the same claim in the same tense one ledger entry away: `pinned is transaction-scoped` becomes `was transaction-scoped and is deleted 2026-09-07 by D-186`. A sweep of `.plan/` outside `reviews/` finds no other present-tense claim about the field; every surviving `pinned` is unrelated English or another package's subject.
- **F-395.** The interface docblock keeps property (7) and the `dispatch` limitation (8). The three re-derivations are gone and the distinct semantics survive: `fail`'s silence before arming, `cancel`'s idle no-op, `destroy`'s single retirement and the frame part not composed after the latch closes. The published JSDoc now states construction once, on the interface.
- **F-397.** `arc-b.md` keeps the table as taken and adds what the landing changed: the site is deleted, the read did not relocate — `FrameTransaction.begin()` is `Object.assign(this.#draft, this.#current)` and reads no accessor, confirmed at the tree — and the same derivation today gives **6**. `git grep '#begin' -- src tests` returns only `execution.ts`'s unrelated `#beginPass`.

### F-394 — discharged, and the deletion is exactly the intended one

**The production delta is one hunk and nothing else.** With comments stripped, `spec.ts` has no code diff at all and `kernel.ts` has one:

```
-      if (current && draft && !this.#bracket.closed) {
-        this.#frames = new FrameTransaction(current, draft);
+      if (!this.#bracket.closed) {
+        this.#frames = new FrameTransaction(current!, draft!);
```

**The monotonicity the deletion rests on is verified at the tree.** `ExecutionBracket.#closed` has exactly one assignment (`execution.ts:194`), inside `if (!this.#closed)` at 192, and it writes `true`. So an open latch at the third test is an open latch at the first two, both compositions ran, and `current!`/`draft!` cannot be null when the branch is taken. `current` and `draft` are locals assigned only in those two blocks and nowhere else.

**The adjacent conjunct remains behaviourally necessary**, and this is not argued but executed: `if (true)` reddens 5 rows. F-387 and F-394 concern different conjuncts of one expression and the executions separate them cleanly.

**The 32 other sites are 32.** Counting non-null assertion _uses_ by line, excluding the two definite-assignment declarations on `#frames` and `#driver`, the base tree carries 32 and the head carries 33 — the one added line. The ledger's figure is right.

**Anything semantic beyond the narrowing removal:** none found. Typecheck is clean, the whole suite is green except the three worktree-structural rows, and the graph declarations in `size.node.test.ts` pass against a real build.

### F-396 and F-398 — discharged by execution

Every mutation was run rather than accepted, and the results are the table above. Three specific claims were checked directly:

- **The two paired reset rows are reddened both-or-neither by every mutation in the register.** Confirmed across all nine: the unwind mutations and the two latch mutations redden both; `if (current)`, the first-latch drop, both `#spec` guards and the validation gate redden neither. The register's statement that no mutation in it separates them is exactly true.
- **The population is stated and correct.** 1364, verified by running all three projects.
- **Every enumeration names all its rows.** Verified row by row; no enumeration is short.

## D-184, D-186, D-187 — preserved

- **D-184.** All eight properties still hold, and six of them now have a falsifier where three did before. The decision's own entry is amended to _nine rows, not six_ and names which finding supplied which falsifier. The `absent:` witness argument is untouched.
- **D-186.** Nothing in the range reaches `#preparationValid()`, `SeamDriver`'s collaborators or the `#frames.begin()` call sites. `Kernel.#begin`, `#pinned` and `ArmOutcome` survive nowhere in `src` or `tests`.
- **D-187.** The two record consequences it names are the two that landed, and no third. No control was restored, no ceiling moved, and `measure.ts`'s row literals are byte-identical.

## The measurement

**All thirty figures reproduce.** The new section's `6def139f0` column is byte-identical to the previous section's _landed_ column, which is legitimate: `git diff 8c1b20042 6def139f0 -- src bench tests` is empty, so the base of this range is the head of the last one for every measured input. The landed column was rebuilt and re-measured here:

| Claim | Verified |
| --- | --- |
| all 15 rows, both figures, landed column | **exact** |
| every kernel-carrying row pays exactly −6 B minified, no other row moves | **13 rows at −6, `vocabulary root` and baseline B at 0** |
| Brotli spreads from −22 B to +12 B | **−22 on `minimal + layoutAnimation`, +12 on `free drag complete`** |
| ten negative, three positive, two flat | **exact** |
| both surviving controls held exactly, 142 B and 6,889 B | **exact, and declared in advance** |

The −6 B is internally corroborated: `current&&draft&&` minifies to six characters, arriving once per graph.

**§15 and §18 are both followed.** The second section is a measurement of a successive landing rather than an ablation within one, and it says so. Brotli is named as the governing figure. A control is declared beforehand and reported. The disposition — no re-base — matches §18's third bullet and matches the precedent `arc-b.md` set when it declined a larger shrink.

## Finding

### `closure-1` · tier C · the new measurement's slack band mixes two populations and contradicts the same band six lines above it

**Finding.** `arc-b-remediation.md:75` states _slack runs 0.06 to 0.13 kB, the same band as before_. The band before, at `:29` in the same file, is _0.06 to 0.15 kB_. The tree gives 0.06 to 0.15. No population of rows yields 0.06 to 0.13.

**Current behavior.** Slack over all fifteen rows at the landed tree runs **0.063 kB** on `vocabulary root` to **0.151 kB** on baseline B. Over the thirteen kernel-carrying rows it runs **0.104** to **0.135**. The stated band takes its lower bound from the first population and its upper bound from the second: 0.06 is `vocabulary root`, which is not kernel-carrying, and 0.13 can only be `minimal + layoutAnimation` at 0.135, which is the maximum only once baseline B is excluded.

**Why it is a problem.** This is the defect `arc-b.md` §Brotli already carries a dated correction for — F-381 struck a range there for quantifying over the thirteen kernel-carrying rows while reading as though over all fifteen, and recorded the all-fifteen figures, 0.063 to 0.151, as the correct form. The same document's first section then stated the band correctly at 0.06 to 0.15. The new section restates the same quantity six lines later as 0.06 to 0.13 and asserts it is unchanged, so the record now says a band both moved and did not. Baseline B is a control that this pass held byte-identical, so the upper bound could not have moved; a reader re-deriving the band arrives at 0.15 against a record that says 0.13, with nothing marking a change — which is F-397's shape one document over.

**Evidence / reproduction.** Budgets from `bench/size/measure.ts` against the landed Brotli column, measured in a detached worktree at `5a438352c` after a clean `tsdown` build:

| Row                         | budget | Brotli | slack     |
| --------------------------- | ------ | ------ | --------- |
| `vocabulary root - drag.js` | 205    | 142    | **63 B**  |
| `kernel root - kernel.js`   | 6,312  | 6,208  | 104 B     |
| `minimal + layoutAnimation` | 10,887 | 10,752 | 135 B     |
| `baseline B`                | 7,040  | 6,889  | **151 B** |

Minimum 63 B, maximum 151 B, over all fifteen. Applied to the previous section's landed column the same arithmetic gives 63 B and 151 B, which is the 0.06 to 0.15 that section states — so the two sections are quantifying the same rows with the same convention and disagreeing.

**Required property.** A measurement record's slack range is derived over one stated population, and where the same document states the same band twice the two statements agree or the difference is dated and attributed.

**Disposition.** Implementation-local. One figure in one measurement record; no architecture or contract decision is implicated, and nothing in D-184, D-186 or D-187 turns on it.

## Noted, not raised

**`COVERAGE.md:1127`'s _1360 rows observed none of the behaviour they pin_, beside `:1129`'s _all 1364 rows in every project_.** The figures look contradictory and are not. **1360 is the suite at `5f7a901a4`**, executed here as a control: node 354 + browser 920 + declaration 86. The six D-184 rows landed into that suite alongside D-186's deletion of five others, giving 1361, and this range's three give 1364. So the sentence is true of the tree before the first six rows existed, and the complement of the nine at the current tree is 1355. The sentence is a historical justification, not a register count, and F-398's required property is about the register's counts; it carries no date or population marker, which is why a reader can read the two figures as one population and see a conflict. Recorded so the numbers are on the record, and left where the range left it.

**Six of the nine construction rows have no mutation in the register that reddens them alone.** Rows 1, 2, 3, 5, 8 and 9 share witnesses; rows 4, 6 and 7 have sole witnesses. This is below F-346's standard as stated for the bracket and transaction instruments — _every row has a mutation that reddens it and no other row_ — and D-184's plan text asked for that standard. **It is not raised, for two reasons.** The register no longer claims otherwise: each shared count is written as a shared count, the two reset rows are called out as inseparable, and the retire/unwind pair carries its own explanation of why the second row exists. And the discriminating mutation for the one pair that most invites the question does exist and was run here — `if (current && draft)` separates _unwind both frames_ from the other four — so the missing discrimination is a gap in the register's mutation set rather than in the rows. Whether the construction table is held to F-346's standard is the register owner's to state, and stating it would be a decision this pass may not make.

## Scope and silence

Bounded by instruction to the range's own subjects. Not reached, each for a reason internal to this lens:

- **Anything outside `6def139f0..5a438352c`.** The D-184/D-186 landing itself was reviewed twice and re-established on a clean tree; nothing here re-opens it.
- **The behaviours' own suites** beyond the green run. No production path outside `arm()` is touched by the range.
- **`CONTRIBUTING.md` §18's and `obligations.md` rule (b)'s amendments**, and O-13's rewrite. They landed at `6def139f0` with D-187, which is this range's base. O-13 was read as the governing text and checked for the three properties the closure brief names; its authorship is not this range's subject.
- **A hand re-derivation of the module graphs.** `bench/size.node.test.ts` asserts them against a real build and is green; the range changes no import edge.
- **Whether the construction table should meet F-346's standard.** Noted above and routed nowhere, because it is a question for whoever owns the register rather than a defect in the landing.

## Result

**Closure ratified, with one tier-C finding.**

Every one of F-387…F-398 is discharged by the landed tree, and each discharge that rests on a count was re-executed rather than accepted — ten mutations, all reproducing the register exactly, plus the restored F-387 mutant that now reddens precisely the row written for it. The production delta is the single expression F-394 named and nothing else, the monotonicity it rests on is verified at the assignment site, and the measurement reproduces on all thirty figures. D-184, D-186 and D-187 all stand.

The one defect is a slack band in a measurement record: implementation-local, one figure, no routing.