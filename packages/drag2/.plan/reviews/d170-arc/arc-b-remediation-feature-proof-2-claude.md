# Arc B remediation — second, independent feature proof

**Range:** `5f7a901a4..8c1b20042`. **Files read at `8c1b20042`**; verified with `git diff 8c1b20042 HEAD -- packages/drag2/{src,tests,bench}`, which is empty, so this report and the first round's four describe one identical source tree.

**Governing architecture:** the current D-184 and D-186 records, plus `01` §`BehaviorContext`, §When construction itself fails and §Teardown across two owners, which the base commit amends and this range does not touch.

**This is a second pass over an already-consolidated round.** [`arc-b-remediation-summary.md`](arc-b-remediation-summary.md) carries F-387…F-396 and Q-28. **Every falsification result below except one was obtained before that summary was read** — the exception is the `#refuseReentry` mutation in §The re-sourced harness counter, run afterwards. The summary was read to attribute correctly, not to select what to look at; where this pass reproduces an existing finding it is recorded as corroboration and mints no new claim.

**No production code was changed.** Nine source mutations and one probe were applied transiently to `src/kernel/kernel.ts` and `src/kernel/seams.ts` and reverted after each run; the working tree is clean and byte-identical to `8c1b20042`.

## Method

Mutations were applied to a pristine copy of the file and run against **`node/drag2` (355 rows) and `browser/drag2` (860 passed, 60 skipped)** together, so every count below is suite-wide rather than per-project. `declaration/drag2` (86 rows) and `tsc --noEmit` are clean at the unmutated tree.

Sizes were measured with `bench/size/measure.ts`'s own `measureAll()`. **`measure.ts` bundles the built output, not `src/`**, so a stale build silently prices a tree that is not the one under test — a first attempt here read a build left behind by a mutation run and produced nine wrong Brotli rows. Every figure reported below was taken after an explicit `npx tsdown` of the tree being measured; the baseline was built and measured in a detached worktree at `5f7a901a4`.

## Agenda: what survived falsification

**(1) The construction window across the whole `BehaviorContext` surface.** A probe drove every member from the factory body and from each frame-part factory, on the stub root the new node file uses. All twenty positions behave as their own entries state, nothing throws out of `draggable()`, and `spec.retire()` runs **exactly once** at each of the four destroy positions:

| Position | `createFramePart` | `resetFramePart` | `retire` | `draggable()` |
| --- | --- | --- | --- | --- |
| `destroy()` from the factory body | 0 | 0 | 1 | returns |
| `destroy()` from the 1st frame-part factory | 1 | 1 | 1 | returns |
| `destroy()` from the 2nd frame-part factory | 2 | 2 | 1 | returns |
| `destroy()` twice, or `destroy()` then `fail`/`cancel`/`dispatch` | 0 | 0 | 1 | returns |
| 1st frame-part factory throws | 1 | 0 | 1 | rethrows |
| 2nd frame-part factory throws | 2 | 1 | 1 | rethrows |
| `destroy()` in the 1st factory, throw in the 2nd | 1 | 1 | 1 | returns |
| `fail`, `cancel`, `dispatch(0)`, `dispatch(99)`, `closed`/`realm`/`root`, from either half | 2 | 0 | 0 | returns |

`dispatch` in the window takes the `!this.#spec` arm of the tag-range guard and reaches `#notify`, whose `this.#spec?.reportError` has no destination — dropped without a report, which is (8) and the shipped `spec.ts` sentence exactly.

**(2) Partial construction and unwind.** Retirement is exactly-once above; the reset covers exactly the frames that physically exist, including the asymmetric second-factory-throws row (2 composed, 1 reset, because the second `Object.assign` never completed); and no work continues past the latch except the unwind D-184 requires. The behavior slots the unwind runs after logical closure — `retire`, `resetFramePart` — are teardown steps 4 and 6, not declared consumer slots, so `01` §Teardown's post-closure restriction is not engaged.

**(3) Configuration validation independent of liveness.** The ordering mutation (latch tested ahead of the static validation) reddens **1** row, as `COVERAGE.md` states. Its stated negative reproduces too: moving the validation below the first latch test **without** gating it on the latch reddens **0**. That the register writes down the mutation the property is _not_ about is worth naming as a positive — it is what stops the row being read as covering more than it does.

**(4) D-186's deletion of `#pinned` and the identity conjunct.** No contract-compliant staleness path was found, and the exclusion was re-derived at the tree rather than taken from the decision:

- **`#frames.begin()` has six call sites and only one admits foreign code before a revalidation.** `#joinSettlement`, `#handleMove`, `#closeOperation` and `#handleStartCommitted` each reach `commit()` with nothing but draft field writes in between; the bracket's `beginPass` closure opens the admission path, which does not consult `preparationValid()` at all and carries its own post-callback revalidation (`#bracket.closed || #frames.current.operation`). Only `SeamDriver.runCore` places `transition.prepare` between `begin()` and the first revalidation, which is D-186's structural claim, confirmed.
- **A behavior action dispatched from inside a `prepare` cannot reenter.** `#bracket.dispatch` enqueues and calls `#drain`, which returns immediately on `#running`; every `prepare` runs inside a drain. So the one reentrancy route that needs no DOM write is closed by the queue rather than by the contract, and D-186's argument does not depend on it.
- **`#handleBehaviorAction`'s `finally` calls `#dropStaged()` on every exit**, so the value the second revalidation selects is discarded either way — the conjunct decided which value was discarded, exactly as recorded.
- **`#activationPolicy.committed()`** runs after `runCore` with a live operation, where `#openIngress` refuses.
- The remaining predicate's own failure modes are covered: a `destroy()` from `prepare` is caught by `!this.#bracket.closed`, a `cancel()` by `!this.#operation?.cancelRequest`, and neither can null `#operation` synchronously without a nested mint.

**(5) The measurement and the budget disposition.** Both columns of [`arc-b-remediation.md`](../../measurements/arc-b-remediation.md) reproduce **exactly, on all fifteen rows and both figures** — base measured in a worktree at `5f7a901a4`, landed measured after a clean rebuild at `8c1b20042`. The +5 B minified on every kernel-carrying row and the −30…+11 B Brotli spread are the tree's own numbers. The §18 disposition follows the rule as written: §18 re-bases _after a shrink_, the joint landing is not one, the trigger is stated in advance, and the pass retains a control row. This corroborates the first round's verification of the same item and adds an independently built baseline.

**(6) The re-sourced harness counter.** D-186 required `seams.node.test.ts`'s transaction count to move to `FrameTransaction.begin` rather than be deleted, because the row _should refuse the nested transaction before it rebuilds the draft_ is the unit witness that the refusal lands first. Moving `#refuseReentry()` below `this.#frames.begin()` in `runCore` reddens **exactly that row and no other**. The obligation is discharged and the witness is still sensitive.

## Findings

### `reviewer2-1` · tier C · `arc-b.md`'s accessor derivation, corrected in this range, names a site the same range deletes

**Finding.** [`measurements/arc-b.md`](../../measurements/arc-b.md) §The per-sample accessor count was corrected on 2026-09-07 (F-381) to read: _`#begin`'s `current.operation` is the single uncounted site — 1 + 2 + 1 + 2 + 1 = 7_. The same range deletes `Kernel.#begin()`, and with it that read.

**Current behavior / contract.** At `8c1b20042` the move path is `#onPointer` → `MOVE` → `#handleMove`, which now opens with `this.#frames.begin()` and no `current.operation` read. The one site the corrected sentence identifies as the seventh accessor invocation per sample is gone, so a reader re-deriving the figure at the tree arrives at six, not seven.

**Why it is a problem.** D-181 asked for the accessor count _before_ the byte figures, because D-170's ownership boundary is what makes accessors the cost this arc pays; the figure is the record of that price. The remediation removes one invocation per sample from it and **no record says so** — neither [`arc-b-remediation.md`](../../measurements/arc-b-remediation.md), which books bytes only, nor [`budget-rebases.md`](../../measurements/budget-rebases.md)'s new entry, nor D-186's own implementation note. The correction and the deletion landed in the same range and were not reconciled, so the only per-sample figure in the record over-counts the tree by one with nothing marking it. This is F-393's species — a rationale left in the present tense after its subject went — one document over, and it is the half of D-186's cost that D-181 said would be measured first.

**Evidence / reproduction.** `git diff 5f7a901a4..8c1b20042 -- packages/drag2/.plan/measurements/arc-b.md` carries the corrected sentence; the same diff over `src/kernel/kernel.ts` deletes `#begin()` and repoints its callers to `this.#frames.begin()`. `kernel.ts` §`#handleMove` at head contains no `current` read.

**Required property.** A measurement record may state a per-sample derivation in the present tense only where the site it names still exists; where a later landing removes one, the record that carries the figure must say which landing changed it and by how much.

### `reviewer2-2` · tier C · **completes F-396** — neither assigned witness discriminates the two reset rows

**Finding.** F-396 is recorded incomplete because _discriminating the rows requires executing the two mutations, which no pass did_. Both were executed here. **Neither discriminates**: each of the two witnesses `COVERAGE.md` assigns reddens **both** rows.

**Current behavior / contract.** `COVERAGE.md` assigns the browser row _should reset only the composed frame when a factory destroys_ the mutation **`#spec` published before the pair is composed**, and the node row _should reset only the frame parts a destroying factory composed_ the mutation **the unwind resetting both frames unconditionally**.

**Why it is a problem.** The live counterclaim F-396 was held against — that the register assigns the rows different witnesses — does not survive execution. The browser row's assertion (`resets === 1`) is a strict weakening of the node row's (`[creates, resets] === [1, 1]`) under the identical trigger, so no mutation in the register separates them; only a difference the real DOM produces and the stub root does not could, and none of the six candidates is one.

**Evidence / reproduction.** Suite-wide, both projects:

| Mutation | Rows red |
| --- | --- |
| `#spec` published before the pair is composed | **3** — node _reset only the frame parts…_, node _retire the behavior when a frame-part factory destroys…_, browser _reset only the composed frame…_ |
| the unwind resetting both frames unconditionally | **3** — node _reset only the frame parts…_, browser _reset only the composed frame…_, browser _scrub the first frame when the second factory throws_ |

**Required property.** Where two rows in different layers are booked against different witnesses, at least one witness must redden one and not the other; a register may not assign distinct witnesses to rows no mutation in it separates.

### `reviewer2-3` · tier C · the six-row table's counts are only correct under a scoping convention it does not restate

**Finding.** Two of the six entries in `COVERAGE.md`'s new construction table state counts that are correct only if read as _rows within this table_. Read suite-wide — which is how the adjacent D-181 table warns its own counts must **not** be read, in a caveat the new table does not carry — both are understated.

**Current behavior / contract.** The D-181 table above states its convention explicitly: _the count in the right-hand column is over the rows written for this entity and says so_. The six-row table is introduced only as _listed apart because the subject is different_ and repeats no such rule.

**Why it is a problem.** Row 1's entry is an **enumeration**, not merely a count — _**3**, this row and the two below it_ — and a later reader auditing it against the source finds a fourth row red and cannot tell whether the register or the tree drifted. That is the failure a register a later reader checks against the source exists to prevent.

**Evidence / reproduction.**

| Table entry | Claimed | Measured suite-wide | Within the table |
| --- | --- | --- | --- |
| the unwind reached only by `arm()`'s throwing exit | 3, this row and the two below it | **4** — the three, plus browser _reset only the composed frame…_ | 3 ✓ |
| the unwind resetting both frames unconditionally | 1 | **3** — plus two browser rows | 1 ✓ |
| the latch test before the first composition dropped | 1 | 1 ✓ | 1 ✓ |
| the `#spec` guard on `fail` dropped | 1 | 1 ✓ | 1 ✓ |
| the `#spec` conjunct in `#cancelWith` dropped | 1 | 1 ✓ | 1 ✓ |
| the terminal latch tested ahead of the static validation | 1 | 1 ✓ | 1 ✓ |
| validation below the first latch test, ungated | 0 | 0 ✓ | 0 ✓ |

**Tier note.** Held at C because the convention is available one section up and every entry is defensible under it. Were the table read as this pass first read it — suite-wide, the reading its own enumeration invites — the same evidence would make it **B**, because the register would then be asserting coverage arithmetic the tree falsifies.

**Required property.** A mutation register's counts must state the population they range over wherever that population is not the whole suite, and an entry that enumerates which rows redden must enumerate all of them.

## Corroborated, not re-raised

**F-387 — the third latch test has no falsifier.** Reproduced independently before the summary was read. Deleting `&& !this.#bracket.closed` from `if (current && draft && !this.#bracket.closed)` reddens **0 rows** across `node/drag2`, `browser/drag2` and `declaration/drag2`. This pass adds the probe that shows what the mutant does rather than only that nothing sees it: a `destroy()` from the **second** frame-part factory goes from `retire` 1 / resets 2 to **`retire` 0 / resets 0**, with `#spec` published and `draggable()` returning a controller on a closed latch — F-374 verbatim, at the one window position no row in the package acts from. The mutant is not equivalent, and the required property stands as F-387 states it.

## Scope and silence

Covered by this lens and reported clean above: the whole `BehaviorContext` surface in the window; `arm()`'s three latch tests, its shared unwind and the two channel guards; `#preparationValid()`'s remaining conjuncts and all six `#frames.begin()` call sites; `#handleBehaviorAction`'s staging and `#dropStaged`; the queue's reentrancy behaviour under a dispatch from `prepare`; the six new rows and their seven claimed mutations; the changed F-374 browser row; the re-sourced `seams.node.test.ts` counter; both columns of the joint measurement and the §18 disposition.

**Not reached, and not covered by anyone else's coverage.** The behaviours' own suites beyond the green run. The out-of-contract path D-186 concedes (a DOM write from `prepare`) — not executed, because an out-of-contract path cannot falsify an in-contract claim, which is this lens's boundary. `arc-b.md`'s **timing** figures, as distinct from its accessor derivation, which `reviewer2-1` reaches. A prose sweep of the historical record beyond the `#pinned`/`#begin`/`ArmOutcome` sweep reported below. The `control:` capability question, which is F-390's and was not re-derived here.

**Two sweeps run and clean.** `#pinned`, `Kernel.#begin` and `ArmOutcome` survive nowhere in `src/`, `tests/` or the contract documents except where struck through or dated — the single live remainder is `00-index.md:1499`, which is F-393's subject and unrepaired. F-382's three sites are all closed: `vocabulary.node.test.ts`'s allow-list, `03` §Internal to the ordinary tier and `02` §792's Not-published row, the last with its cross-reference put into the past tense by `8c1b20042`.