# Arc B remediation — decision elimination review

**Read at `8c1b20042`** (branch `drag2/fin-review`), range `5f7a901a4..8c1b20042`. Files read at that commit; the decision projection was taken there with `npx just decisions` and `npx just decisions --retired` from `packages/drag2`.

**Lens.** Does machinery or a constraint that still exists have a surviving justification? Not whether it is used, and not whether the code's present responsibility requires it — those are other passes. The question is whether the historical reason is still alive.

## Result

**The forward pass found no surviving machinery.** Neither half produced a finding: no inactive decision left a mechanism behind in `src/`, and no retired fragment of a still-active decision names machinery the tree still carries. The backward pass over the machinery this range introduced or reshaped likewise found no constraint resting on an expired ground.

This is a null result and not a silent area. What was covered and what was not is below.

## Scope

### Covered

**Forward, half one — inactive decisions.** All twelve in the projection: D-7, D-33, D-73, D-88, D-150, D-162, D-164, D-167, D-169, D-182, D-183, D-185. Each was traced to what it introduced and the tree searched for it:

| Retired decision | Mechanism it introduced | At `8c1b20042` |
| --- | --- | --- |
| D-7 | settlement gates, request–seal–arm on a kernel-private attempt | absent — no gate, seal or hold survives `src/` |
| D-33 | `controller.ready(request)`, `presentationCommitted()`, `rt.pendingRequest`, the acknowledgement deadline | absent; the two `provisional` mentions left in `kernel.ts` state the post-D-41 property (_no interval in which a target is provisional_) rather than the retired one |
| D-73 | the three lift-mode strings `'faithful' \| 'flat' \| 'in-place'` | absent — `LiftMode` alone, per D-141 |
| D-88 | key-set totality, `?: never` on each contribution record | absent from `src/`; the surviving `keyof` equality rows in `tests/composition.declaration.test.ts` are re-grounded in their own comments as _the property that replaced key-set totality, and it is its opposite_ |
| D-150 | four `?: never` refusal clauses and their `@ts-expect-error` instrument | absent; `src/shared/composition.ts:96`'s prohibition against writing them is D-151's live rule, not D-150 residue |
| D-162 / D-164 | `inheritedSpaceOf` publishing one space | present and re-grounded by D-165, which is active: `presentation.ts:529-531` computes the visual's and the item's spaces separately, which is D-165's operative change |
| D-167 / D-169 | the closure-factory retention rule and its test | superseded by D-170's class adoption; SC-7 discharged in `obligations.md` with its trigger explicitly recorded as never met |
| D-182 / D-183 / D-185 | pre-implementation revisions of this arc — nothing landed under any of them | nothing to survive |

**Forward, half two — retired fragments of active decisions.** All 103 rows of `--retired` were read. The overwhelming majority are corrected counts (`three`, `five`, `Fourteen`, `eleven`) and superseded prose, which name no machinery. The fragments that do name machinery were checked individually; the ones from this range's own subjects are:

- D-181 _It owns `#current`, `#draft` and `#pinned`, exposes `begin`, `commit`, readers for the pair, and `retire`_ — `src/kernel/transaction.ts` at this commit names no operation, holds no pin and has no residue of one. `retire(reset)` survives on the ground its supersession states (the committed-frame scrubs require it), independent of the clears it once carried; its two callers are `kernel.ts:564` and `kernel.ts:653`, both frame scrubs.
- D-181 _and takes two fixed edges at construction: the execution bracket, and one closure answering the operation's cancel latch_ — `ExecutionBracket`'s fourth callback is `beginPass`, whose docblock (`execution.ts:83`) grounds it in the caller's preparation for an ingress pass and not in the pin.
- D-181 _`#pinned`'s two clears are deleted rather than relocated_ / _they ride the `retire`_ — both retired, both correctly, and F-377 is the record of the second having been retired on the live side.
- D-186's own retired sentence (_the only other writer of `current.operation` is an admission the execution bracket refuses reentrantly_) — struck at `tests/COVERAGE.md:1146` with the replacement stated, so the register carries no claim the tree no longer supports.

**Backward — machinery this range introduced or reshaped.** `arm()`'s three latch tests and `#unwindArm`; the `#spec` guards on `fail()` and `#cancelWith`; `SeamDriver`'s four-argument shape; `#preparationValid()`'s two remaining conjuncts; `FrameTransaction.retire`; the `#operation`/`#activation` drop ordering at `kernel.ts:585` and `:658`; `#retireOperation`'s stale-retirement identity test; `bench/size/measure.ts`'s `control?:` field; `obligations.md` O-13 and SC-1, SC-3, SC-4, SC-5, SC-6, SC-7; Q-25, Q-26, Q-27.

Two of these were tested specifically because the range's own reasoning would have undermined them:

- **`preparationValid()`'s terminal-latch conjunct.** D-186 deletes the identity conjunct because its only observable effect lies on an out-of-contract path, which fails `CONTRIBUTING.md` §Definition of success's first limb. D-181 records that the terminal-latch conjunct _turned out to have no falsifier either_, so the same rule would appear to reach it. It does not: F-348 was repaired on 2026-09-05 and the falsifier is a `destroy()` from inside `prepare` — a contract-legal position — pinned by `kernel.browser.test.ts`'s _should discard a preparation whose prepare destroyed the controller_. The ground is alive and is of a different kind from the one D-186 refused.
- **The ordering at `kernel.ts:585` and `:658`** (dropping `#operation` and `#activation` after the scrubs). The comment names _the frame-identity implication_, which reads like the pin's invariant. It is not: the stated implication is `current.operation !== null ⟹ operation !== null`, the unchecked premise of every `#operation!` in the file, and it is untouched by the pin's deletion.

### Not covered, and why

- **Whether the guards D-184 added are correct, complete, or asserted by the right rows.** That is the feature proof's question and the integrity pass's; this lens asks only whether their justification stands, and D-184's is three days old and in force.
- **Machinery whose justification never appeared in the decision record.** This lens traverses decisions and assumptions that were written down. Code justified only by a comment, or by nothing, is the cleanup pass's subject.
- **The behavioural suite.** No test was executed. Every claim above is a source-level or record-level fact, verified by reading the tree at `8c1b20042`.
- **Packages other than `drag2`.** Out of the range.

## Findings

None. See §Result.

## Two observations that are not findings

Recorded because a later pass may otherwise re-derive them and mistake either for one.

**`SeamDriver`'s constructor docblock now justifies only the lifetime of its collaborators, not their shape.** The sentence that argued a parameter list rather than a record — _they answer to three different owners_ — was deleted with the pin, as D-186 §Three consequences instructs (_both are deleted with their subject rather than corrected_). The four-parameter shape survives with no written argument for being four parameters. This is a deliberate act of a decision three days old, not an expired justification, and the shape's ground never depended on the count.

**`ArmOutcome` remains in two past-tense records** — `05-lifecycle-invariants.md:590` and `00-index.md:2480`, both inside the §Findings register's account of how F-35 was resolved at the time. F-382, repaired in this range, struck the three _live_ carriers: `vocabulary.node.test.ts`'s `INTERNAL` allow-list, `02` §792 and `03` §1347. A finding record describing a mechanism as it stood is the ledger being past tense, which is the rule rather than a violation of it.