# Arc B — decision elimination review

**Files read at `25be674c`**, the head of the range `185fb371..25be674c` under review. Every source and contract citation below was taken with `git show 25be674c:<path>`; every mechanical result was produced in an isolated worktree detached at `25be674c` (see [§Mutation protocol](#mutation-protocol)). Contract: D-181, as amended by [`arc-b-frame-transaction-claude.md`](arc-b-frame-transaction-claude.md) and [`arc-b-second-pass-claude.md`](arc-b-second-pass-claude.md).

**The lens.** Does the machinery and the constraint in this tree still have a live justification? Backward — current machinery → the decision it rests on → is that decision's cause still alive. Forward — retired normative content → what it introduced → does that survive. The forward half is run over both of its parts: inactive decisions, and the retired fragments of still-active ones, both taken from `npx just decisions` and `npx just decisions --retired`.

**No `D-` id is minted here, and no decision is repealed, amended or replaced.** Where the answer is a design choice it is stated as a question and routed to the architect.

---

## Scope

### Covered

- The full decision projection, both halves: 181 rows of `npx just decisions` and 85 rows of `npx just decisions --retired`, read end to end.
- The forward pass over every retired decision naming machinery that could survive: **D-7** (settlement gates, request–seal–arm), **D-33** (the readiness protocol, `pendingRequest`, `presentationCommitted`, the acknowledgement deadline), **D-73** (the three lift-mode strings), **D-88** and **D-150** (key-set totality and the `?: never` refusal clauses), **D-150**'s declaration instrument, **D-162**/**D-164** (`inheritedSpaceOf`'s boundary and the published item-to-visual scope limit), **D-167**/**D-169** (the closure-factory verdicts), **D-153**'s retired `runStamped` fragment, and D-181's own four retired fragments.
- The Arc B surface backward: `src/kernel/transaction.ts` in full; `SeamDriver`'s five collaborators and its constructor docblock; `Kernel.#begin`, `#preparationValid`, `#pinned`, `#scrub`, `#retireOperation`, `#runPhysicalTeardown`, `arm()`'s composition-into-locals and `#spec`-last ordering; `#reporting`, `#actionTag`/`#actionArgument` and `#settlementTransition`'s two-phase reachability.
- The B-0 evidence gate: its stated matrix in `COVERAGE.md`, and an independent re-derivation of three of its six mutations.
- `.plan/measurements/arc-b.md`, `.plan/measurements/budget-rebases.md`, `bench/size/measure.ts`'s `budget`/`control` doc blocks and the five re-declared `control:` values.
- The instrument surface the arc touched: `transaction.node.test.ts`, `transaction.declaration.test.ts`, `seams.node.test.ts`'s harness, `vocabulary.node.test.ts`'s internal list, the five rows added to `kernel.browser.test.ts`, and `COVERAGE.md`'s Arc B section and its `Equivalent mutants` table.
- The phase-spelling sweep across `02`, `03`, `06` and `challenge-response.md`, and `02` §240's four-slots-becomes-three amendment.

### Not covered

- `src/sortable/`, `src/free-drag/` and `src/shared/` internals except where a retired decision named a specific member in them. The range touches none of them.
- The settlement, landing and displacement subsystems beyond `#settlementTransition`'s reachability at `SETTLING` and `REPORTING`.
- Arc C's `settlementInput` half, Arc D, and C4/O-3 — outside the range.
- **F-352's thirteen `queue.closed`/`queue.running` lines in `00-index.md`.** Booked, and a deliberate reading of each is another pass's lens; I confirmed only that they are thirteen and that none is in `src/`.
- **M-1 and M-1′ were not re-run.** `arc-b.md`'s timing and byte figures are taken as recorded; the one figure I did reproduce is the direction of the kernel-root Brotli delta under a mutation (probe A, −9 B), which is consistent with the table but is not a re-derivation of it.
- The per-sample accessor count of 9.12 / 7 was not reproduced; the probe that produced it was, by the measurement's own statement, temporary and not part of the suite.

### Null results

**The forward pass found no surviving machinery outside the `#pinned` chain.** Every retired decision listed above was grepped for the members it named, at `25be674c`: `seal`, `holdForReadiness`, `pendingRequest`, `presentationCommitted`, `readinessTimeout`, `'faithful'`/`'flat'`/`'in-place'`, `?: never` in a contribution type, and the published item-to-visual transform limit are absent from `src/`. `SeamContext`, `#armedStamp`, `#stamp`, `#runStamped`, `NO_STAMP` and `ArmedStamp` are absent from `src/` and `tests/`, and `draft.phase =` is assigned at no site in `src/` except inside `FrameTransaction.commit` itself. `02` §240's list is amended to three with the required _the list shrank because a dependant stopped being a slot_ sentence; D-153's ground (a) carries the same correction inline in its own row; `vocabulary.node.test.ts`'s internal list is corrected. The stamp's deletion left no residue I could find.

**The backward pass over `FrameTransaction` found no unjustified member.** All five members have a live justification at `25be674c`: `begin` and `commit` are the protocol; `commit`'s `null` arm has two live callers (`#handleMove`'s sample commit, `runCore`'s default for the action seam); `retire(reset)` is required by `#scrub` writing a _committed_ frame in place at `:589` and `:679`, which no `Readonly` reader can serve; the `Readonly<Frame<Part>>` reader prices D-170 §The ownership boundary, which is active. `#reporting`'s docblock is correctly re-grounded post-stamp (_before `REPORTING` is committed_, not _before the stamp is consumed_), and the D-181 constraint that forbade putting the phase on the transition — `#settlementTransition` reachable at both `SETTLING` and `REPORTING` through one object — still holds at `:1693` and `:2186`.

---

## Mutation protocol

Four mutation probes. Each starts from a tree byte-identical to `25be674c`, applies exactly one mutant, runs the whole suite, and is restored with `git checkout -- packages/drag2/src` before the next, so each result isolates one mutant. The restore was verified as `0` dirty entries after each.

All four were **first run in the shared checkout at `/workspaces/material-x` and then re-run and pinned in an isolated worktree** at `/tmp/.../scratchpad/wt`, detached at `25be674c`, `node_modules` symlinked from the repository root. The shared-checkout runs are discarded; every figure below is from the worktree. The worktree carries a standing environment failure of 3–6 rows — `consumer.node.test.ts`'s three _packed package_ rows, and intermittently `packaging.node.test.ts`'s two and `references.node.test.ts`'s one — because the packed artefact is not built there. Those are subtracted everywhere below and are named, not hidden.

Command in every case: `npx just test` from `packages/drag2` (71 files, 1360 tests, 1300 passing / 60 skipped on an unmutated main checkout).

| Probe | Mutant | Behavioural rows red | Other rows red |
| --- | --- | --- | --- |
| **A** | drop `this.#frames.current.operation === this.#pinned` from `#preparationValid()` (`kernel.ts:499`) | **0** | 5 `control:` byte equalities (`kernel root` −9 B); 3 env |
| **B** | drop `!this.#operation?.cancelRequest` from `#preparationValid()` (`kernel.ts:498`) | **3** | 4 `control:`; 3 env |
| **C** | delete `#pinned` and its three sites; drop the `begin` collaborator; `SeamDriver` takes four | **0** | 40 `seams.node.test.ts` rows constructing the driver with five arguments; 4 `docs.node.test.ts` rows (the build fails on a now-unused `OperationIdentity` import); 5 `control:`; 4 env. **Typecheck clean.** |
| **D** | swap `#activate`'s committed phase, `commit(ACTIVE)` → `commit(PENDING)` (`kernel.ts:2079`) | **379** | 0 |

Probe B's three rows are exactly the three `COVERAGE.md` names — _should roll back every library write when a cancelling factory discards the preparation_, _should leave no style attribute behind on a rolled-back element that had none_, _should enqueue an `invalidate()` rather than drain it_. Probe D's 379 against the recorded 408 is a different tree and a different environment, not a disagreement about the direction; the recorded claim that the phase mutations are abundantly covered reproduces. Probe A and probe B together are an independent re-derivation of two of B-0's three conjunct rows.

---

## Findings

### der-1 — tier B — the reading that would settle `#pinned` is owed to nobody, and the machinery survives on a sequencing rule that has expired

**Finding.** `#pinned` (`kernel.ts:386`), its capture in `#begin()` (`:482`), its two clears (`:613`, `:687`) and the identity conjunct it exists for (`:499`) survive at `25be674c` on a justification that was never about the guard. F-349 states what is owed and then declines every destination for it; `obligations.md` carries no row.

**Current behavior / contract.** D-181's live statement records the retention as a settled outcome — _the fork's third arm applies … `#pinned` and the conjunct stayed where they are, recorded as F-349_. F-349 (`00-index.md:3803`, Open, tier C) says what is owed — _either a reachable path and a row, or a deletion on the ground the repository's own definition of a successful pass states first_ — and then: _Not Arc B's, and not Arc C's by default._ The only stated ground for keeping it is in the second architecture pass §3 and repeated in `COVERAGE.md`: _relocating a guard into a new entity in the same commit that would justify deleting it makes the deletion unreviewable afterwards._

**Why it is a problem.** That ground is a rule about **which commit may touch the field**, not a reason for the field to exist, and the commits it constrained have landed. At `25be674c` the guard therefore has no live justification and no scheduled reading. `obligations.md` §The rule this register exists to enforce (b) requires an obligation to name a destination that can close, and (c) requires the live set to be carried there — the register exists because D-116 found that _a live clause stated inside a decision-ledger row is unreachable by every instrument this package has_, and API-03 is its worked precedent. **O-7 is the standing shape for exactly this**: F-80's divergences, booked as an obligation, _Owed by: F-80_, _Waiting for: an owner's call on each_. F-349 is that shape and is not booked, so the next reader of the projection meets a decision that says the pin stayed and a finding that says a reading is owed to no one.

**Evidence.** Probes A, B and C above, all pinned at `25be674c`. Dropping the conjunct reddens **no** behavioural row out of 1360 while the two conjuncts beside it redden 1 and 3; deleting the whole apparatus typechecks clean and reddens no behavioural row. `00-index.md:3803` for F-349's declined destination; `obligations.md` §Live for its absence; `obligations.md` §O-7 for the precedent.

**Required property.** Every guard retained in `#preparationValid()` has either a row that falsifies it or a recorded reason to exist that survives the arc which deferred the question; and a reading owed on one names a destination the register can carry, rather than being carried by the finding entry alone.

**Routed to the architect**, who owns the choice between deleting the conjunct and keeping it under der-2's rule. This pass takes no position on which.

### der-2 — tier C — the tree has a register for exactly this class of guard and this one is not in it, and the neighbouring rule that keeps one does not transfer

**Finding.** `COVERAGE.md` maintains **§Equivalent mutants — guards no test can falsify**, whose stated purpose is _so a later reader does not mistake them for coverage gaps_ and whose retired row calls it _the register a later reader checks against the source_. The identity conjunct is a confirmed equivalent mutant and is not in that table; it is recorded in the Arc B section instead, and argued from `CONTRIBUTING.md` §Definition of success rather than from the package's own nearer rule.

**Current behavior / contract.** The table's closing rule: _The precedent for removing an unfalsifiable conjunct rather than recording it (Checkpoint B's placeholder parentage/adjacency pair) applies when the conjunct is dead weight in the only shape that reaches it. These two are cheap, and one of them is a second line of defence on a staleness rule — so they stay, named._ Two entries stand under it today, both in `src/sortable/spec.ts`.

**Why it is a problem.** Two registers now hold one class, and the entry landed in the one that is a dated arc record rather than the one a later reader is told to check. Worse, the rule that would justify keeping it has not been applied: the conjunct may well qualify as _cheap, and a second line of defence_, but nobody has said so, and the ground actually given is a sequencing rule (der-1). **And D-153's ground does not transfer**, which matters because it is the nearest precedent for keeping unfalsifiable machinery in this same module: D-153 keeps the seam re-entry guard because _it is the instrument that keeps its own unreachability true_, and that guard **panics** — `#refuseReentry` latches and `#runPhase` rethrows past every classification. The identity conjunct does the opposite. A false reading routes `runCore` to `SEAM_INVALIDATED` through a silent `rollback` with no `notify` (`seams.ts`), so a broken assumption becomes a discarded transaction that reports nothing — `CODE_OF_SIZE.md` §1.1's own worst case, which D-153 invokes in the other direction. It cannot pin its own unreachability, so D-153's ground (b) is unavailable to it.

**Evidence.** `COVERAGE.md` §Equivalent mutants and its closing paragraph; `COVERAGE.md` §Arc B's B-0 table; `seams.ts` `runCore`'s invalidation arm; `00-index.md:1407` for D-153's grounds (a)–(c).

**Required property.** An unfalsifiable guard that is kept is entered in the register the package maintains for that class, under one of the two rules the package states for keeping one, with the ground named — not under a rule about which commit may delete it.

### der-3 — tier B — D-181's live statement asserts a `#pinned` mechanism the landed tree does not have

**Finding.** `00-index.md:1797` reads: _~~`#pinned`'s two clears are deleted rather than relocated.~~ **Superseded 2026-09-05: they ride the `retire` the frame scrubs require, at zero new members and zero behaviour change.** Both clears sit at sites that already scrub both frames…_ The struck half is correctly retired. **The unstruck replacement is what B-0's third arm invalidated, and it survived.** At `25be674c` the clears are standalone statements at `kernel.ts:613` and `:687`, outside `FrameTransaction.retire`, which is called at `:589` and `:679`.

**Current behavior / contract.** `npx just decisions` prints that sentence as live D-181 content. `npx just decisions --retired` prints only the struck original. The decision's implementation preamble does say the pin stayed, so the row contradicts itself — and the two halves are at opposite ends of a very long entry.

**Why it is a problem.** The projection is this round's primary input, and a decision-elimination pass reads it in exactly the direction that cannot catch this: the forward half looks at retired content for surviving machinery, and here the false clause is on the **live** side, describing machinery that does not exist. A reader who arrives at the `#pinned` paragraph — which is the paragraph anyone asking _where are the clears?_ lands on — is told they ride `retire`. The paragraph's own line citations no longer resolve either: it cites `:624-625` for the scrub and `:649` for the clear, against `:589` and `:613` in this tree. The same paragraph is the sole carrier of the argument that D-181's original deletion was not behaviour-preserving, so it cannot simply be dropped; it has to be re-stated against what landed.

**Evidence.** `00-index.md:1797` at `25be674c`; `kernel.ts:589`, `:613`, `:679`, `:687` at `25be674c`; `transaction.ts` `retire(reset)`, which touches only the two frames.

**Required property.** D-181's live content describes the tree at `25be674c`. Content the implementation invalidated is retired rather than left standing, whether it was the decision's original text or an amendment to it — an amendment that the implementation then overrode is retired normative content like any other.

### der-4 — tier C — five of the seven `control:` rows are, by their own doc's rule, values that should be omitted while the kernel arcs run

**Finding.** `measure.ts`'s `control` doc states the rule: _The rows that carry it are the ones no sortable-side or free-drag-side edit can reach from the other side — plus the two that carry no behavior at all_, and _**Omitted on a row a pass is expected to move**, which is every row that carries the behavior under change._ Five of the seven declared controls sit on compositions that carry `kernel/kernel.js`. The D-170 arc series is a sequence of kernel-tier passes, so every one of the five is a row every pass in the series is expected to move.

**Current behavior / contract.** Arc A and Arc B each re-declared the same five, each with the same justification — _declared in advance as rows this pass would reach_ — and Arc C and Arc D are still to come. `budget-rebases.md` §Arc B: _The `control:` rows are the instrument that had to move._ The record is honest about it each time; what it does not do is stop carrying them.

**Why it is a problem.** For a kernel-tier pass the outcome is fixed before the pass runs: the five must be re-declared and the two that carry no kernel cannot move, so no configuration of results is possible other than the one that occurs. The legitimacy test the record applies — declared in advance — cannot fail for such a pass, so it constrains nothing. `budget-rebases.md` itself names the failure mode at its 2026-08-19 entry: _a control declared on a row a change can reach is a budget wearing an exact number._ Probe A is the sharp illustration: deleting an entire guard conjunct from the kernel reddened **exactly five rows out of 1360, all of them `control:` byte equalities**, and no behavioural row — which is the instrument's whole yield on a kernel edit. This costs a mandatory re-base per arc and buys nothing for the class of pass in flight, while the same rows remain genuinely useful once the arc series closes.

Recorded and not pressed, as a weaker sub-observation: `budget-rebases.md`'s 2026-08-24 correction establishes that the ~150 B headroom **cannot** serve its stated purpose — the smallest module's marginal cost measured 149, 154 and 157 B across three message-text-only passes, crossing the headroom in both directions with no module moving — and reassigns the module claim to the graph declarations. Arc A's and Arc B's rebase entries still argue ceiling movement in terms of _sensitivity_. That reading is defensible for growth generally and only doubtful for module detection, which is why it is a note rather than a finding.

**Evidence.** `bench/size/measure.ts` `control?: number`'s doc block at `25be674c`; the five `control:` values at `:353`, `:365`, `:377`, `:390`, `:524` against the two at `:494` and `:540`; `budget-rebases.md` §2026-08-19, §Arc A and §Arc B; probe A.

**Required property.** A `control:` value is carried only on a row the pass class currently in flight is not expected to reach, or the record states that the control set does not apply to that class instead of presenting a mandatory re-declaration as the control holding.

---

## Answers to the questions the round put

**The `#pinned` fork — evidence or preference?** Both, and the halves are separable. The _selection of the third arm_ is evidence: B-0's negative reproduces independently (probe A), and the conjunct is a genuine equivalent mutant. The _elimination of the alternative that was on the table_ — moving `#pinned` onto the entity, which the second architecture pass §2 argued positively for — was by the sequencing rule, not by evidence; nothing was found against the move itself. And the arm that was never at the fork, deleting the conjunct, was **deferred rather than eliminated**. So the fork resolved which of two relocations to perform and left the existence question open, which is der-1.

**Is B-0's conclusion causally established or merely recorded?** For the phase mutations and for two of the three conjuncts, causally established and reproduced here. For the third, the recorded claim is stronger than the evidence: `COVERAGE.md` writes _**none, and none could be written**_, where what was performed is a search that found no path. That is a hand-derived negative with no instrument — the same unpinned-reachability shape D-153 §(b) names about the re-entry guard, and it is why der-2 asks for the retention to be decided under a stated rule rather than under the absence of a counter-example.

**Does B-0 remain load-bearing?** As a gate, no — it has fired, and its three owed rows either exist (F-348's, added at `202581c6`) or were found unnecessary. What is still load-bearing is its **negative**, which is now the sole justification for a surviving field. A gate's negative outliving the gate is the thing der-1 is about.

**Is five collaborators a consequence of a decision or of the order the extraction happened in?** Of neither, strictly: it is a consequence of the fork's outcome, and F-350 says so. D-181 as amended specifies four. `SeamDriver.#begin`'s docblock states the dependency in the code itself — _the kernel pins the operation the transaction belongs to at the same instant … A driver that opened the pair directly would take the copy and leave the pin behind._ Probe C confirms the four-argument shape is mechanically available today: it typechecks clean and reddens no behavioural row, and the only work is `seams.node.test.ts`'s one construction site and a now-unused `OperationIdentity` import. **The five-argument shape is not an independent design position and should not be consolidated as one** — it reverts automatically if der-1 resolves toward deletion.

**Constraints the pre-Arc-B design imposed that survived without their cause.** None found beyond the `#pinned` chain. The stamp's dependants were each traced and each is either gone or explicitly re-grounded (`02` §240, D-153 (a), the vocabulary list, `#reporting`'s docblock, the phase-writing traces in `02`, `06` and `challenge-response.md`). `SeamContext`'s only surviving consequence is `seams.node.test.ts`'s validity flag, which the second pass predicted and justified in advance and which the harness still uses correctly against a real `FrameTransaction`.

**Decisions whose stated cause the landed code invalidated.** One, and it is der-3.