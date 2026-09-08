# Arc B remediation — review round summary

**Range reviewed:** `5f7a901a4..8c1b20042`, base being the final Arc B architecture revision. **All four passes read files at `8c1b20042`.** Verified mergeable: at the time of consolidation `git diff 8c1b20042 HEAD -- packages/drag2/{src,tests,bench}` is empty, so every report describes one identical source tree. The intervening commits add review `.md` files only.

**Governing architecture for the range:** the current D-184 and D-186 records. Abandoned intermediate designs (D-182, D-183, D-185) were out of scope by construction.

## Passes

| Lens | `subagent_type` | Artifact | Result |
| --- | --- | --- | --- |
| Feature proof | `reviewer` | `arc-b-remediation-feature-proof-claude.md` | 3 findings; 4 of 6 agenda claims survived falsification |
| Integrity | `integrity` | `arc-b-remediation-integrity-claude.md` | 4 findings, no behavioural drift |
| Cleanup | `cleanup` | `arc-b-remediation-cleanup-claude.md` | 4 findings, all tier C |
| Decision elimination | `der` | `arc-b-remediation-der-claude.md` | **Explicit null** |

All four ran in parallel with no pass receiving another's prompt, findings or artifact path.

**No tier A in this round.** No pass found a defect a correctly integrated consumer observes at runtime. The production behaviour of the D-184/D-186 landing survived every falsification attempt made against it; what this round found is concentrated in **instruments and records**.

### The DER null is a result

The forward pass found no surviving machinery, across twelve inactive decisions and 103 retired fragments of active ones. It is recorded as an outcome, not as silence. Two eliminations were declined _with_ their grounds re-established: `preparationValid()`'s terminal-latch conjunct retains a contract-legal falsifier (a `destroy()` from inside `prepare`, F-348, pinned by `kernel.browser.test.ts:3446`), and the `#operation`/`#activation` drop ordering rests on the frame-identity implication, not on the pin.

## Findings

Local → canonical mapping is at the foot. Tiers are assigned here **by consequence**, not by provenance and not by how many lenses reported a subject.

### F-387 · tier B · the third latch test has no falsifier

`kernel.ts:2493`. Deleting `&& !this.#bracket.closed` from `if (current && draft && !this.#bracket.closed)` reddens **0 of 1275 rows** and reproduces F-374 verbatim: a `destroy()` raised from the **second** frame-part factory leaves both frames truthy with the latch closed, so the mutant arms on a closed bracket, `spec.retire()` never runs, and neither part is reset. Root cause: no row in the package acts from the second frame-part factory — `construction.node.test.ts`'s helper hooks every composition, but both destroying rows fire on the first call, which the _second_ latch test then decides. **Required property:** the conjunct that decides this branch must have a row that reddens on its deletion.

### F-388 · tier B · `#unwindArm`'s `if (current)` guard has no falsifier

`kernel.ts:2576`. Dropping `if (draft)` reddens 3 rows; dropping `if (current)` reddens **0**, and its removal violates D-184 property (2) for real. Confirmed at the mechanism during consolidation: `frame(existing?)` is `Object.assign(existing ?? {}, DEFAULT_FRAME)` (`frames.ts:70-72`), so a null target does **not** throw there — it yields `{}` and passes `null` onward to the consumer's `resetFramePart`, inside a `#resetFrame` whose `#unwind` swallows the result. `COVERAGE.md` books the pair as a single mutation ("resetting both frames unconditionally"), conflating two independently deletable guards. **Required property:** each guard must be independently reddened, and the register must not book two deletable guards as one mutation.

### F-389 · tier C · property (3) is instrumented for one input only

Liveness-independence of configuration validation is covered for `actionTags`; the `command.types`/`pointerdown` refusal has no liveness-independence row. **Tier note:** held at C rather than B because this is an absent row, not a register asserting coverage it lacks. Were `COVERAGE.md` to claim property (3) is covered as a whole, the same evidence would make it B.

### F-390 · tier B · the surviving `control:` rows cannot detect what three documents say they detect

`bench/size/measure.ts:143-150`, `obligations.md` O-13, and `measurements/arc-b-remediation.md` §The controls all state that the two surviving `control:` rows are what still detects a kernel symbol reaching a composition that should not have one. Baseline B structurally cannot: its entry `bench/size/shipped.js` imports `@ydinjs/drag/sortable.js`, the separate shipped package this tree does not build, so no drag2 edit can move its bytes. Confirmed during consolidation by reading both files. `measurements/arc-b.md` §Brotli states the correct reading of the same row, so two records disagree. With the five kernel-carrying controls suspended, the real remainder is **one** row, not two. This finding merges a second, narrower claim about the same docblock: its opening census ("only two rows declare one at present") is a count nothing keeps true. That component alone would be C; the false capability claim sets the tier. **Required property:** a document may attribute to a control only detection that control can perform, and the three records must agree.

### F-391 · tier B · the contract's `BehaviorContext` block omits a member the source declares

`.plan/contract/01-construction-ownership.md`. The transcribed block at `:139-208` declares six members — `realm`, `root`, `dispatch`, `fail`, `cancel`, `destroy` — while `src/kernel/spec.ts:82-93` declares a seventh, `readonly closed: boolean`, documented there as "the latch itself, not a proxy for it… the only sanctioned liveness reading". D-184's own window paragraph, immediately below the block, reasons over "`closed` is the latch".

**Direction corrected at consolidation.** The reporting pass framed this as _prose says seven, interface has six_. The evidence supports the opposite: the prose count of **seven** is correct about the real interface, and the **transcribed block is the stale artefact**. The false half of the prose sentence is "this section's own list has always carried it" — the list does not carry it at all. The required property changes accordingly.

**One supporting claim is not established.** The pass cited `git log -S` as showing no commit ever added `closed` to the list. Run against the bare token that search returns eight commits touching the file and does not discriminate the block from surrounding prose. The claim may be true; it is recorded here as unestablished rather than as fact, and the finding does not depend on it. **Required property:** the transcribed block must carry every member the published interface declares.

### F-392 · tier B · the contract lists deleted unwind triggers

`01-construction-ownership.md:394`, the clause D-184 implements, lists "the frame-part validation, the shape assertion" among `arm()`'s unwind triggers. D-128 deleted that family; `00-index.md:1243` and `tests/COVERAGE.md:339` both record the deletion and its consequence for the instrument. The sentence was authored at `ea6e400e3`, editing around the dead items.

### F-393 · tier C · present-tense rationale for a deleted field

`00-index.md:1499` still explains why `pinned` was excluded from `OperationRecord` and describes its clears surviving at both retirement points. D-186's sweep covered source comments only.

### F-394 · tier C · `current && draft` cannot decide its branch

`kernel.ts:2493`. `ExecutionBracket.#closed` is assigned at exactly one site (`execution.ts:194`, inside `if (!this.#closed)`), so the latch is monotonic: if it is open at the third test it was open at the first two, both compositions ran, and `Object.assign` returns its truthy target. The pair therefore cannot decide the branch, and pays runtime for a compiler-only narrowing that `kernel.ts` answers with `!` at 32 other sites.

**Scope narrowed at consolidation.** The reporting pass's headline described _the third guard_ as paying for a compiler-only narrowing. That overreaches its own body, which argues only about `current && draft`. F-387 establishes that the remaining conjunct, `!this.#bracket.closed`, is behaviourally load-bearing. The two findings concern **different conjuncts of one expression and do not conflict**; the evidence separates them, so this is recorded as a factual reconciliation rather than a preserved disagreement. Nothing here licenses deleting the guard whole.

### F-395 · tier C · property (7) re-derived on three of six members

`BehaviorContext`'s published JSDoc states D-184's property (7) universally on the interface, then re-derives it on `fail`, `cancel` and `destroy`. Annotating three of six undercuts (7)'s stated purpose of being inherited by the next member. The clauses carrying real information — `fail`'s silence, `destroy`'s "no further frame part", `cancel`'s idle-no-op — are excluded from the finding.

### F-396 · tier C · **incomplete** · two coverage rows may share a witness

The browser row _should reset only the composed frame when a factory destroys_ and the node row _should reset only the frame parts a destroying factory composed_ have the same trigger and the same assertion, and D-184 places this subject at `node`.

**Recorded as incomplete, not as false.** The claim its evidence supports is the textual identity of trigger and assertion. `COVERAGE.md` assigns the two rows different witnesses, which is a live counterclaim, and the reporting pass states it did not execute the mutations that would discriminate them. The **Evidence / reproduction** field is therefore not satisfied, and no property is invented to fill it. The gap is left visible: discriminating the rows requires executing the two mutations, which no pass did.

## Routed

### Q-28 · does O-13's restoration trigger meet §18's condition?

O-13 suspends the five kernel-carrying `control:` rows for the D-170 arc series and books them back at its close. The feature-proof pass verified that the **budget disposition itself follows the rules as written** — the joint D-184+D-186 landing measured +5 B minified, which is not a shrink, so §18 does not require re-basing the retained ceilings — and both columns of `arc-b-remediation.md` reproduce exactly, with the five suspended controls' recorded last readings and the 0.06–0.15 kB slack band all recomputing. That agenda item is **not** a finding.

What is routed is a residue the pass reported as a soft point and explicitly declined to raise: **O-13's trigger is closer to a schedule ("at the close of the arc series") than to §18's preferred observer-met condition.** Whether that is acceptable is a policy question about when a suspended control returns, and F-390 sharpens it — with baseline B unable to detect kernel leakage, the suspension currently leaves **one** effective control rather than the two the records claim.

**Routed, not raised by the pass, and not decided here.** Deciding it would require choosing between a schedule and an observer condition, which is a contract decision. This consolidation mints no `D-`.

## Local → canonical

| Local                       | Canonical | Tier                    |
| --------------------------- | --------- | ----------------------- |
| `reviewer-1`                | F-387     | B                       |
| `reviewer-2`                | F-388     | B                       |
| `reviewer-3`                | F-389     | C                       |
| `integrity-1` + `cleanup-4` | F-390     | B (merged)              |
| `integrity-2`               | F-391     | B (direction corrected) |
| `integrity-3`               | F-392     | B                       |
| `integrity-4`               | F-393     | C                       |
| `cleanup-1`                 | F-394     | C (scope narrowed)      |
| `cleanup-2`                 | F-395     | C                       |
| `cleanup-3`                 | F-396     | C (incomplete)          |
| `der`                       | —         | null result             |
| —                           | Q-28      | routed                  |

Ids allocated against a repo-wide scan of `*.md` and `*.ts`, **per prefix independently**: `F-` high-water 386, `Q-` 27, `I-` 37. **No `I-` was minted** — `I-` denotes an invariant, and no finding in this round establishes one; the `I-` mark was computed and left unused. The scan establishes the highest id _mentioned_, which is sufficient to guarantee a fresh id and is not used here as a census of allocated findings.

## Scope and silence

Each pass's unreached areas are justified from **its own lens**, never by another pass's coverage.

- **Feature proof** did not reach the behaviours' own suites beyond the green run, `arc-b.md`'s timing and accessor figures, historical prose sweeps, or execution of the out-of-contract path — the last because an out-of-contract path is not a falsifier of a contract claim, which is this lens's own boundary.
- **Integrity** reports the construction window as **checked and clean**, so it is distinguishable from unexamined: `destroy()` paths disjoint from teardown via `#runPhysicalTeardown`'s `#spec` guard, behaviour retired exactly once at all four window positions, `#beginPass` unreachable pre-arm, `arm()` returning unarmed implying a closed latch, `#pinned` and `ArmOutcome` surviving nowhere in `src/` or `tests/`.
- **Cleanup** did not reach the mutation arithmetic of `COVERAGE.md`'s new six-row table, the joint measurement, or an audit of the record documents — each belonging to a different lens's question, and none inherited here as coverage for cleanup's own silence.
- **DER** covered both halves of the forward pass and the backward pass in full, and reports no unreached area.

## Round hygiene

A mutation probe was left in `packages/drag2/src/kernel/kernel.ts` during the round — the `actionTags` validation block relocated below the frame-part compositions. It was **uncommitted throughout**; all four report commits are report-only, and the working tree was clean with `src/` byte-identical to `8c1b20042` before this summary was written. No production code was repaired during the review.

One pass's description of that probe (as a removed `!this.#bracket.closed` guard) did not match the actual diff, and is recorded here as corrected. It was outside that pass's lens and does not bear on its findings.