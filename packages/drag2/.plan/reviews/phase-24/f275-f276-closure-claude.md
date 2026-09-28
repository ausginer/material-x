# F-275 and F-276 — bounded closure review

**Files read at `14b1743c`.** Adjudication baseline `3c50a194`; range `3c50a194..14b1743c`, two commits:

- `c6d249e7` — drag2: state the retirement ordering's observable and structural halves apart
- `14b1743c` — drag2: witness the discarded activation's capture release at ordinary retirement

Against [`f275-retirement-ordering-adjudication-claude.md`](./f275-retirement-ordering-adjudication-claude.md) and D-168's amendment, `00-index.md` rows F-275 and F-276.

## Scope

**Covered.** The four files in the bounded delta and nothing else: the `retireOperation` and `runPhysicalTeardown` comments and the `ActivationRecord` docblock in `src/kernel/kernel.ts`; the two test comments and the one added assertion in `tests/kernel/kernel.browser.test.ts`; the F-275, F-276 and D-168 rows in `.plan/contract/00-index.md`; the plan entry in `.plan/plan.md`. Each comment claim was re-derived against the code it describes rather than taken from the record. The step-5 mutation §5 of the adjudication named was reproduced.

**Not covered, deliberately.** F-277, untouched by this delta and non-blocking — confirmed unchanged by the diff, not reassessed. D-168's two-record shape, membership, exclusions, allocation figures and size gate, all settled by the earlier round and outside this delta. The `runPhysicalTeardown` half of the mutation, already red in the remediation pass and not re-run here — the uncovered side was the `retireOperation` one. The two owner modifications under `.claude/agents/` were neither inspected nor staged.

## Findings

**None.** The bounded delta is clean, on every property checked. This is a null result and is stated as one — no finding was withheld as minor, and no tier was assigned because nothing reached the threshold of a claim.

## What was verified, and how

**No runtime statement moved.** Stronger than a diff reading: stripping line comments, block comments and blank lines from `src/kernel/kernel.ts` at both ends of the range yields the identical SHA-256, `ce25da57…50cd72`. The delta to that file is comments and a docblock, exhaustively.

**The comment claims are true of the code.** Each re-derived at `14b1743c`:

- `unwind` is `try { return step() } catch …` (`src/kernel/unwind.ts:43-57`) — it calls nothing ahead of its callback, as both the source comment and the adjudication say.
- `frame` is `Object.assign(existing ?? {}, DEFAULT_FRAME)` (`src/kernel/frames.ts:70-72`) — a plain literal, no reentrancy point.
- `scrub` (`kernel.ts:514-532`) calls `frame(target)` before `active.resetFramePart(target)` inside one `unwind`, so the frame's identity is nulled before anything the scrub can run.
- `if (operation)` is the whole test for whether there is anything to dispose at step 5 — and `OperationRecord.lifetimes` is documented as non-nullable for exactly that reason (`kernel.ts:195-200`).
- **Eleven** `operation!` sites, not ten or twelve: twelve textual matches, one of which is the comment's own reference to them at `kernel.ts:585`. The source comment's "every `operation!` in this file" and the records' "eleven" both hold.

**The two halves are stated apart, and each is stated accurately.** The `retireOperation` comment separates an _observable_ claim — the records must survive steps 4 and 5, because behavior and consumer code runs inside both while `current.operation` still names the operation — from a _structural_ one, that the drop stays last so `current.operation !== null` ⟹ `operation !== null` holds from statement order. It names the structural half as a proof and maintenance property rather than a runtime window, which is what the adjudication settled. `runPhysicalTeardown`'s one-line comment defers to it and names both halves rather than one.

**The witness's inline comment no longer overclaims.** `should still hold the operation while retirement runs` (`kernel.browser.test.ts:3670-3693`) now says it pins step 4 and only step 4, and says the final placement is deliberately unobservable. That is the correction F-275's required property asked for, and it is the claim the test actually supports.

**The `should retire a discarded activation` row witnesses ordinary-retirement disposal.** Its `prepare` returns `null`, so the activation policy retires an operation that `acquireActivation` had already taken pointer capture for and registered the release of through `live.lifetimes.motion.use(acquirePointerCapture(…))` (`kernel.ts:1319-1321`). The added `expect(harness.captures).toEqual(['acquire', 'release'])` executes the claim the row's prose already made. That it reaches retirement through `retireOperation` rather than teardown is not inferred — it is what the mutation below demonstrates.

**The mutation reproduces exactly as reported.** In a throwaway worktree at `14b1743c`, the three records dropped between `unwind(spec.retire)` and the `if (operation)` step of `retireOperation`:

```
FAIL  tests/kernel/kernel.browser.test.ts:1256:3 > activation > should retire a discarded activation
AssertionError: expected [ 'acquire' ] to deeply equal [ 'acquire', 'release' ]
  Tests  1 failed | 170 passed (171)
```

One failure, on that assertion, `['acquire']` against `['acquire', 'release']` — the missing release and nothing else, against a green 171-test baseline in the same worktree. The source was restored and its SHA-256 checked against the pre-mutation copy before the worktree was removed. No mutation was run in the live tree.

**F-276's docblock states complete-or-absent and nothing stronger.** It drops the `activation === null` _names the state_ equivalence; says presence means the activation transaction acquired these resources rather than that the operation reached a lifecycle state; notes that `acquireActivation` can throw after assignment and that `activation.effect` may fail later, leaving a live operation holding a complete record until retirement; and names `phase` as the sole lifecycle discriminant, with "read this record for what activation acquired, never for where the operation is." Record presence is not offered as a lifecycle discriminant anywhere in it.

**The docblock's one deviation from its stated required property is the correct one.** F-276's required property, following §6 of the adjudication, asked the docblock to say that a failed activation "retains it so the lift session stays reachable for the disposal already registered." The remediation declined that clause, and it was right to: `acquireActivation` registers the disposer as `live.lifetimes.presentation.use(session.dispose)` (`kernel.ts:1308`), so the lifetimes list holds the closure and the retention is independent of whether anything still points at the record. Writing the clause would have replaced one false claim with another. The deviation is not silent — both the F-276 row and the plan entry state it and give this reason.

**The records agree with the code.** The F-275 and F-276 rows, the D-168 amendment and the plan entry describe the delta as it landed, including the parts that are unflattering: that the `retireOperation` mutation came back green in the remediation pass, that the green result was shown non-vacuous by a throwing probe rather than assumed, and that no test was added in that pass because choosing a witness for an uncovered boundary is specifying the boundary. F-277 is untouched by the delta and remains non-blocking as recorded.

**The suite is green at the tip.** Full `drag2` run at `14b1743c`: 65 files, 1227 passed, 60 skipped, no type errors.

## Disposition

**F-275 and F-276 are closed, and D-168's implementation review is complete.** Both retirement paths now carry a witness on the observable half's step-5 side; the structural half remains a reading obligation by construction, which is what the adjudication decided and not a gap this review reopens. Nothing in the bounded delta is routed onward. F-277 stands as recorded, for a later cleanup pass.

## Method

Read at `14b1743c` throughout. The comment claims, the `operation!` census, `unwind`, `frame`, `scrub`, `acquireActivation` and both retirement paths were re-derived from source rather than taken from any record; the non-comment source parity and the mutation were run rather than inferred. The mutation ran in a detached worktree at `/tmp/d168-mut`, since removed; the live working tree's two owner modifications under `.claude/agents/` were left untouched. An empty untracked `tst.md` appeared in the repository root during the run; it is not this review's and was left in place.

**Two intermittents seen, neither in the delta and neither a finding here.** Across three full-suite runs, one run failed `consumer.node.test.ts > should pack every sourcemap its modules point at` and one failed `perf/m5.browser.test.ts > should report a difference that tracks a cost injected into window 1`; both pass in isolation and both runs either side were fully green at 1227 passed. They are load-sensitive — a build-artifact race and a timing falsifier — and untouched by this delta, so they are recorded as an observation rather than assessed. A closure review that saw a red suite and did not say so would be the wrong artifact to hand on.

**The contract index was reformatted and restored during this pass.** Running `npx just fmt` over `.plan/contract/00-index.md` collapsed forty-five findings rows into a single line — **F-231's defect exactly**, in the file that records it. Caught before committing, handled the way F-231's row prescribes: the committed formatting was restored and the three content edits re-applied on top, leaving a three-line diff. `references`, `decisions`, `docs` and `coverage` — the instruments that parse these documents by shape — were then run and pass. **The row is right and the hazard is live**: this file must not be passed to a formatter, and the handoff procedure's "format every created or updated Markdown file" does not except it.

**LSP plugin — available; not used:** the code questions were a fixed-site census and four short function bodies already named by the records, which `grep` settles directly; the one census that would have justified `findReferences` — the four writes to `operation` — was established by the adjudication at `15b11845` and is not in this delta.