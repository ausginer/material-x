# D-208 remediation 5R.1: bounded recheck

**Trees read.** Review revision `5e5a493d2` on `drag2/fin-review2`. The series:

- `df45b1c69`: items 1–3, comments and contract text only;
- `380c93a6a`: the record, `d208-step5.md` §Remediation 5R.1;
- `5e5a493d2`: the record's note of the actual parent.

**Parent and provenance.** `df45b1c69`'s parent is `c186f120e`, not `b132ae788`. `c186f120e` is a separate commit in the shared checkout and is not part of the remediation. It adds one `eslint-disable-next-line @typescript-eslint/unbound-method` line to `tests/sortable/features.browser.test.ts` and has no session trailer. It changes no `src/` or contract file. `b132ae788`, the architect's acceptance, changes neither. So `c186f120e`'s `src/` and contracts 01–07 equal `2d17645f5`'s, and I take every _before_ at `2d17645f5`. `c186f120e` is in every tree I built or tested. I attribute nothing it changed to 5R.1, and I did not review it.

Hashes, diffs and searches came from git objects in the shared checkout. Lint ran in the shared checkout, which was clean at `5e5a493d2`. The builds, the declarations and the suite ran in two detached scratch worktrees:

- `5e5a493d2`, the review revision;
- `2d17645f5`, 5R's tip and §21.7's control.

Both worktrees are removed.

**Subject.** Remediation 5R.1 as [`request-application-claude.md`](../architecture/request-application-claude.md) §21.7 bounds it, with §21.3 and §21.4. The record is [`d208-step5.md`](../../measurements/d208-step5.md) §Remediation 5R.1. My [5R recheck](d208-5r-recheck-claude.md) supplies 5r-A, 5r-B, 5r-C and the probes P1–P5.

**Scope.** The pass covered:

- the whole `src/` and contract diff `c186f120e..df45b1c69`, read hunk by hunk against the code at the review revision;
- the class as the code states it: the activation unit's `prepare` and `effect`, the kernel's failure supersession and `#handleCancel`'s `ACTIVATING` arm;
- the contract twins at 02:876, 02:884, 02:888–900 and 05:203;
- the uniqueness search, repeated, and the two passages it reports, 05:199 and 07:686;
- 5r-B's removal and 5r-C's wrapping, word by word;
- runtime invariance for all 60 `src/` modules, by two tree-based instruments;
- composition, the published declarations, the suite, lint and typecheck, against 5R's tip;
- the record's site citations, before and after, and its corrected §Deviations 2 bound.

It did **not** cover:

- F-442's answer, or whether free drag or a cancel registered in `prepare` yields an instance (§21.7, out of scope);
- comments and contract text outside 5R.1's diff, beyond the uniqueness search's hits;
- `c186f120e` on its merits;
- browsers other than Chromium, and `react.browser` and `stories.browser`, which do not load.

I ran no probe. Every behavioral statement below is read from the code, or rests on P1 and P2 from the 5R recheck.

## Result

**No implementation defect blocks 5R.1's closure.**

- Items 1–3 change no runtime statement in any of the 60 `src/` modules.
- The class is stated from the code at all five §21.3 sites and in both contract twins. One source comment lists its cancel sources incompletely (5r1-A).
- 5r-B and 5r-C are discharged.
- The composition control, the suite, lint, typecheck and the published declarations meet §21.7's keep list exactly.
- The record corrects §Deviations 2's bound in its own dated section, and the 5R section is not edited.

**One Tier C defect was introduced (5r1-A), in a comment and in the record.** Item 1's new source comment names the class's cancel sources as two, the placeholder factory and the `connectedCallback`. The record says consumer code is reached _twice_ before the start notification. The effect also calls the consumer's axis installer, `insertion.invalidate`, before `onStart`. A cancel registered there is inside the class, so the contract's general statement holds and no escalation condition is met.

**Architect questions before closure:**

1. **5r1-A's timing.** Under §21.8 the source is frozen from 5R.1's close. A comment fix not made before closure needs a unit of its own.
2. **05:199 and 07:686.** Both are reported correctly and lie outside §21.7's task: neither claims the gap is unique. Each states I-31's _no terminal without a start_ half with no qualification of its own. 07:686 also restates I-31 in a per-behavior document, which 05:199 itself forbids (D-83). Whether either is restated, and whether that waits for F-442, is the architect's.

The four budget rows the owner has not yet disposed of are unchanged.

| Check | Result |
| --- | --- |
| Runtime | All 60 `src/` modules are equal at `2d17645f5` and `df45b1c69` by the TypeScript printer with `removeComments`, and again by a walk of the parse tree's leaf tokens with JSDoc nodes excluded. A context-free token scanner flags `kernel.ts` on a backtick inside a comment, the tooling artefact recorded since step 5; both tree-based instruments agree. `df45b1c69` and `5e5a493d2` have identical `src/`, `tests/` and contracts |
| The record's hashes | Its three digests reproduce exactly, `7bebc600fe08aad5`, `a1b94130e2a8b261` and `610e73e86ef0b6a9`, when the printed text's non-blank lines are joined with no separator. The record does not state that join; equality holds under every serialization I tried |
| Composition | Built with `just build` and measured at `2d17645f5` and `5e5a493d2`. All 15 rows are byte-equal: minified, Brotli and module count. They also equal the table I measured at 5R's tip, row for row |
| The owner-pending rows | free drag + bounds 8495 / 8423 (+72); free drag + landing 8437 / 8425 (+12); free drag complete 8628 / 8576 (+52); kernel root 6320 / 6312 (+8). Unchanged |
| Published declarations | The same 33 `.d.ts` paths, byte-identical between the two builds |
| Suite | `vitest run`, every project, at `5e5a493d2`: 1,377 passed, 14 failed. The failing set is identical to 5R's tip run, compared by test name. `references.node` passes, 4 of 4 |
| Lint | Run from `packages/drag2` over 5R's 12 changed `src/` files, as at 5R: the same seven errors, by file and rule. They are `free-drag/assemble.ts` `no-unnecessary-condition`, `free-drag/spec.ts` `consistent-return`, `kernel/seams.ts` 2 × `no-unnecessary-condition` and 2 × `only-throw-error`, and `sortable/spec.ts` `consistent-return`. 5R.1's three files carry five of them, as the record says. `oxlint` reports nothing |
| Typecheck | `just typecheck` in `packages/drag2`: only the two `.scripts/vitest-*.ts` errors |
| `git diff --check` | `c186f120e..5e5a493d2`: clean |
| Tests | `df45b1c69` changes no test |

## Item 1: the class

**The class matches the code.** At `df45b1c69` I read the following.

- **The cancel registers in either seam.** `#cancelWith` registers in any phase from `PENDING` to `RELEASING` (`kernel.ts:714–724`). `prepare` runs before `ACTIVATING` is committed, and `effect` after it. A cancel from either is held for a later entry.
- **Supersession.** `#handleFailed` drops the checkpoint when a cancel is held or was captured at intake, and reports `drag: failure/superseded-by-cancel` (`kernel.ts:2131–2142`).
- **The arm reads the phase alone.** `#handleCancel`'s arm settles from `ACTIVATING` (`kernel.ts:2026`, `:2053–2058`), and nothing in it reads `progress`.
- **The effect's failures before `onStart`.** The adjacency throw (`sortable/spec.ts:755`) comes before the record is published (`:777`). `#invalidateInSeam()` fails at `:791`, after it. `progress = STARTED` (`:814`) and `onStart` (`:822`) follow both.
- **P2's landing read.** `anchorTarget` (`:1468–1469`) destructures `this.#operation.activation!`.

**The class's boundary holds.** I looked for a path outside it, which is §21.7's first escalation condition, and found none.

- **A cancel in `prepare` followed by a `prepare` failure.** The failure is a throw, or `null` from `homeInsertion`. `ACTIVATING` is never committed, the held cancel finds `PENDING` and retires the operation (`kernel.ts:2020–2024`), and no terminal is published.
- **The same during `#acquireActivation`.** Its failure is classified before the seam opens (`kernel.ts:1286–1288`). The outcome is again a retirement at `PENDING`.

**Every site §21.7 names is restated:**

| Site | Before (`2d17645f5`) | After (`df45b1c69`) | Verdict |
| --- | --- | --- | --- |
| `sortable/spec.ts:785–794` | _the one path_; the cancel's only source is the `connectedCallback` | `:792–805`: _one instance of a class of two-fault paths_; names the adjacency throw; the outcome and _either fault alone is fine_ kept; _admitted and open_ | Meets §21.7. The source list is 5r1-A |
| `sortable/spec.ts:737–744` (§21.1's twin) | _nothing was published or notified_ | `:737–751`: the single-fault outcome kept; a paragraph says the class applies with a registered cancel, and the landing looks for a record the throw left unpublished | Meets §21.7. True against `:755`, `:777` and `:1469` |
| `kernel.ts:2029–2034` | the start notification is always delivered | `:2029–2042`: the claim kept; a paragraph says it fails on the class, the arm reads the phase alone and settles a drag whose start was never notified | Meets §21.7, and is now bounded by the class |
| 02:876, the row | _gap_; _two faults in `activation.effect`_ | _gap_ struck for **class**, dated; the cause struck and restated to `prepare` or `effect` | Meets §21.7, history kept |
| 02:884 | _The one admitted gap._ | struck; **One instance of the admitted class**, dated | Meets §21.7 |
| 02:888–900 | — | the 5R.1 amendment, described below | Meets §21.7 |
| 05:203 | _One admitted two-fault gap_ | struck; **One admitted class of two-fault paths, stated in 02 §I-31**, dated, citing F-442 | Meets §21.7 |

**The 02 amendment carries everything §21.7 asks for:**

- the class, by its two conditions;
- why D-207's entry clause cannot decline the unit;
- the outcome;
- P1 and P2, with P2's `landing/target-unavailable` warning and the `TypeError` as its `cause`;
- what is not established;
- that the outcome predates D-208;
- that the class is open under F-442.

Each statement agrees with §21.3 and with P1 and P2 as I recorded them at `2d17645f5`. _Both probed at remediation 5R's tip_ is accurate: P1 and P2 both ran at `2d17645f5`.

**Source citations (§21.4).** No `+` line in `df45b1c69`'s `src/` diff carries a decision, finding, probe or question number, `§`, a `.plan/` path, _Probe_, _5R_ or _remediation_. `references.node` passes. The F-442 citations are in 02, 05 and the record.

## Item 1: the uniqueness search

I repeated the search over 01–07, `README.md` and `src/`. I used the record's terms and added _only exception_, _one exception_ and _sole_. The hits match the record's table:

- the five §21.3 sites, restated;
- 02:874, 05:199 and 07:686, reported;
- unrelated uses: the hot path at `kernel.ts:1760` and 02:336, panic's report at `kernel.ts:2551`, the test project at `rect-index.ts:457`, and _sole writer_ and _sole owner_ in 03, 05 and 06.

`README.md` and the published JSDoc carry nothing, so §21.7's third escalation condition is not met.

**02:874, _This is a second gap, not the one recorded below_.** No change is right. It distinguishes D-40's clause from the admitted entry, and the row beneath it now names a class.

**05:199, I-31's statement.** It says _and **only** then: an operation whose `onStart` never ran publishes no terminal_. That is false on the class, as it was on the single gap before 5R.1. The row's notes line, 05:203, carries the qualification, as it did before. The same line says _`destroy()` is once again the only exception_ and _the stated exception and not a gap_. In the row's own vocabulary an exception is by design and a gap is admitted, so the class does not falsify that sentence.

- **Against the task boundary.** The search asks for statements that the gap is unique, and this one claims nothing about the gap. Reporting it is within the boundary, and restating it is not required.
- **Whether to restate it.** That is the wording of an invariant, and F-442's answer decides whether the unqualified sentence becomes true. Both are the architect's.

**07:686, L-2.** It says _exactly one terminal per started operation on a live controller … and **none** for an operation that never started (Q-15)_.

- **No qualifier.** It has no gap or class qualification, and no pointer to I-31.
- **Does it hold for free drag?** That turns on whether free drag has an instance. §21.3 leaves that unestablished, and §21.7 puts enumerating it out of scope.
- **It restates I-31, which D-83 forbids.** 05:199 says _a per-behavior document may cite this row but must not restate it (D-83, F-75)_, and L-2 is such a restatement. It keeps the antecedent _on a live controller_, so it is not F-75's failure mode. The restatement predates 5R.1.
- **Against the task boundary.** Reporting it is within the boundary, and restating it is not required. Whether L-2 is qualified, replaced by a citation of I-31 or left to F-442 is the architect's.

## Items 2 and 3

**5r-B is discharged.** `kernel.ts:2469–2470` reads _The order holds this boundary, and no guard checks it_. The quotation is gone, and the paragraph's first sentence still states the boundary. `src/` now holds no reference to _Probe_.

**5r-C is discharged.**

- `seams.ts:434–437` and `:463–466` are refilled. Their word sequence is identical to `c186f120e`'s.
- `sortable/spec.ts:874–880` is refilled with no word changed. The longest line in the paragraph is 77 columns.
- No `+` line in the `src/` diff exceeds 80 columns.

The refill also moves _for_ from `spec.ts:868` to `:869` at `2d17645f5`, now `:879–880`. That falls just outside the range §21.7 cites and the three lines the record describes. The old line was 79 columns. The change is word-identical and leaves the paragraph uniform, so I raise nothing on it.

## The record

The record carries each element §21.7 requires: every site before and after, the code read for the class, the dated correction of §Deviations 2's bound, the hashes, the composition control and the verification.

- **Citations.** Its after-site citations match `df45b1c69` at `:640`, `:699`, `:720`, `:755`, `:777`, `:791`, `:1468–1469`, `kernel.ts:2026`, `:2132–2137` and `:2469–2470`. Its before-sites match `2d17645f5`.
- **§Deviations 2.** The corrected bound is _every path except the class of two-fault paths F-442 now covers_. That is what the `ACTIVATING` comment now says, and it agrees with §21.3. The 5R section's text is unchanged, apart from the trailing newline `380c93a6a` adds to its last line.
- **`5e5a493d2`.** Its one-line note of the parent and of `c186f120e` is accurate: who committed it, what it changes, and that every check ran with it present.
- **The code read for the class.** It is accurate except for one sentence, _The activation unit reaches consumer code twice before the start notification_. That sentence is 5r1-A.

## Findings

### 5r1-A: the class's cancel sources are listed as two, and the effect reaches a third

**Tier C, introduced** by `df45b1c69` and `380c93a6a`. **Route:** the implementer, for the comment and a dated record correction. The architect decides whether it holds closure, given §21.8's freeze.

- **What the text says.**
  - `sortable/spec.ts:796–798` reads _consumer code reached from this activation — the placeholder factory in `prepare`, or the placeholder's `connectedCallback` above — registers a cancellation_.
  - The record's §Item 1 reads _The activation unit reaches consumer code twice before the start notification_, and names those two.
- **What the code does.**
  - Between the record's publication and `onStart`, the effect calls `#invalidateInSeam()` (`sortable/spec.ts:791`). That calls `this.#slots.invalidateInsertion()` (`:527`), which is the axis installer's `insertion.invalidate` (`assemble.ts:122`).
  - The axis installer is consumer-written. `sortable.ts:42–46` publishes `AxisInstaller` so _a consumer who writes one_ can type it, and `AxisContribution` and `InsertionGeometry` are published at `sortable/feature.js`.
  - §21.3 already counts P1's throwing `invalidateInsertion()` as a consumer fault.
  - So one consumer function can supply both of the class's conditions: it registers a cancel and then throws. The failure is classified at `:530`, the held cancel supersedes it, and the arm settles `ACTIVATING`. That is P1's mechanism with the cancel registered from a different consumer function.
- **Why it is a problem.**
  - §21.7 asks for the class _stated from the code_. The comment's parenthesis and the record's _twice_ read as exhaustive, and they are not.
  - It is inside the class. 02:876 and 02:888–891 state the source generally, as _consumer code reached from the activation unit_, and they are correct. So no escalation condition is met and F-442's scope is unchanged.
  - Tier C, because the comment is internal and nothing published or relied upon depends on the list.
- **Evidence.** Read from the code at `df45b1c69` and not probed. The path from a classified `#invalidateInSeam` failure through supersession to the `ACTIVATING` settlement is the one P1 exercised at `2d17645f5`.
- **Required property.** The source comment and the record either state the class's cancel source without an exhaustive list, or list every consumer reach in the activation unit before the start notification. That includes the axis installer's `insertion.invalidate`.

## Considered and not raised

- **The hash serialization.** Covered in the Check table: the record's digests reproduce, and the join is unstated. Equality is the property §21.7 keeps.
- **Lint depends on the working directory.** From the repository root the same 12 files report no errors, because the rules are off. From `packages/drag2` they report the seven. I compared like with like, from the directory 5R used. The config's dependence on `process.cwd()` predates both units.
- **`c186f120e`'s disable comment** names no receiver source. `eslint.config.ts` asks that of a captured platform method. That commit is not 5R.1's, and I did not review it.
- **Consumer code reached during `#acquireActivation`.** Suppose the lift's style writes trigger a custom element's `attributeChangedCallback`. A cancel and a failure there end at `PENDING` with no terminal, as Item 1 shows. Nothing to raise.

## Verification limits

- Chromium only. `react.browser` and `stories.browser` do not load.
- No probe ran in this pass. 5r1-A's third source is read from the code; the class's two known instances rest on the 5R recheck's single-run probes.
- The uniqueness search is a word search. A uniqueness claim in other words escapes it, as the record says.
- Lint covered 5R's 12 `src/` files from the package directory, the scope and directory 5R used.

## Dispositions proposed

| Item | Proposed route |
| --- | --- |
| 5R.1 items 1–3 | Meet §21.7 at every site. **No implementation blocker** |
| 5r1-A (Tier C, introduced) | Implementer: comment and dated record correction. The architect decides whether it must land before closure, since §21.8 freezes `src/` from then |
| 05:199, I-31's _only then_ | Architect: restate or leave, possibly with F-442. Not a 5R.1 defect |
| 07:686, L-2 | Architect: qualify, cite I-31 per D-83, or leave to F-442. Not a 5R.1 defect, and free drag is not enumerated here |
| 5r-B, 5r-C | Discharged by `df45b1c69` |
| §Deviations 2's bound | Corrected in the record's dated 5R.1 section |
| `c186f120e` | Separate provenance and not reviewed. It does not affect any keep property |
| The four budget overruns | The owner's, unchanged |