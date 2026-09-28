# D-166's relinquished join write — implementation review consolidation

**Range reviewed:** `b91ce5c6..57827a2a` (the sole commit, "drag2: delete the join's pin write and migrate the vocabulary"). This is a **reviewer-only** handoff — no integrity, cleanup or DER pass was called for or ran:

- [`d166-relinquish-write-feature-proof-claude.md`](./d166-relinquish-write-feature-proof-claude.md) — feature proof (`48ebb4fa`)

## Verdict

**The runtime delta is correct and complete.** The three attacked properties all hold, each verified against shipped control flow — not vocabulary — with four falsification probes (P-A through P-D) run against mutated copies of the tree and reverted:

1. The removed join write, its `runLeaf` wrapper and its `failed`-deferral branch have no surviving caller, reader or contract obligation; the move-path `lift.write` and its `FAILURE_RENDERER_WRITE` classification are independently confirmed untouched (one producer in `src/`, unchanged by the diff, exercised by three live test rows).
2. `ERROR_REPORTED` is not orphaned: six live classified-failure producers reach it, instrumented and confirmed by direct probe; the join's own path between settlement commit and `finalized` classifies nothing, and each of its four steps has a non-silent (warning) channel rather than a vanished one.
3. A terminal-callback fault produces exactly one terminal, traced step-by-step and confirmed by instrumented probe (`sameOp: false, phase: IDLE` on entry to `handleErrorReported`); both the accepted and rejected result rows survive and are driven by a throwing terminal callback.

The I-24 sanity check also holds: the old measurement/pin/runner success conditions have no surviving subject, the release is unconditional and latched to run exactly once, and I-24's dependency on I-25 is unchanged and still the boundary — I-24 does not reach past it.

**Re-verified directly in this consolidation, not taken on the pass's word:** the `sortable/spec.ts:1521` and `kernel.ts:2191` exclusion sites; the `kernel.ts:1592-1650` join body and the `kernel.ts:1643-1645` comment; `handleFailed`'s `ERROR_REPORTED` dispatch and `failOperation`'s `FAILED` dispatch; `dispatchKernel`'s re-entrant-enqueue mechanics; the D-166 and D-66 ledger rows in `00-index.md`; the F- high-water mark (F-268, set by D-166's own implementation commit); the `sortable.browser.test.ts` docblock and `COVERAGE.md` rows quoted by the finding; the single `FAILURE_RENDERER_WRITE` producer in `src/`; and the exact lines of `.plan/contract/06-vertical-sortable-trace.md` and `05-lifecycle-invariants.md`'s I-24/I-25 rows. All quotes and line citations check out against the current tree.

No defect was found in shipped behavior. What the pass found is entirely **about the record of the change**, not the change: two places where the implementation's own account of why a property still holds turns out to name a mechanism that isn't actually load-bearing, plus one current-state document a sibling migration missed.

## Findings

| Canonical | Tier | Claim | Local origin |
| --- | --- | --- | --- |
| **F-269** | B | D-166's ledger row, `sortable.browser.test.ts`'s docblock and `COVERAGE.md` all assert that D-66's two surviving rows are falsified by removing either post-commit stage exclusion ("remove the exclusion and both rows fail"). Neither is true: reinstating either exclusion (`sortable/spec.ts:1521` unconditional, or `kernel.ts:2191`'s `stage !==` test deleted) leaves the full suite green — `??=` already preserves the committed result regardless, and `ERROR_REPORTED` never reaches its own stage test on this path (shares its cause with F-270). The rows are real witnesses for _something_ (both accepted and rejected results survive a throwing terminal callback), but not for the mechanism the records name as their reason | d166-1 |
| **F-270** | B | `kernel.ts:1643-1645`'s comment on the unconditional `dispatchKernel(RETIRE, …)` states the ordering backwards: it reads as though the checkpoint the terminal-callback failure queued might retire the operation first and make `RETIRE` stale, when the actual mechanism (confirmed by instrumented probe and by reading `dispatchKernel`'s re-entrant-enqueue rule) is the reverse — `RETIRE` is queued ahead of the later `ERROR_REPORTED` `handleFailed` dispatches, runs first, and it is `ERROR_REPORTED` that arrives stale. The guard everyone points to (`handleErrorReported`'s `stage !== FAILURE_TERMINAL_CALLBACK` exclusion) is never reached on this path at all — the queue order is the actual guard | d166-2 |
| **F-271** | B | `.plan/contract/06-vertical-sortable-trace.md` was not migrated by this commit and still traces the deleted `lift.write(target.x, target.y)` at the join, annotated `[I-24]`, its `FAILURE_RENDERER_WRITE` throw branch, and the deleted `failed`-deferral `STOP *here*` branch, plus two standalone sentences asserting "the join's pin decides correctness" and that the visual "teleports back into its slot when the join pins." `05-lifecycle-invariants.md`'s own I-24 row was correctly migrated to the unconditional form in the same commit, so the `[I-24]` marker in 06 now attaches the invariant to a statement that no longer produces it. Second occurrence of the identical drift shape F-252 closed one day earlier for a different decision on the same page | d166-3 |

No tier disagreement to record — all three are Tier B by the repository's own consequence test (no shipped behavior changes; an integrator or later reviewer reading the package's own account is misled, or an instrument the repository relies on is unsound), independent of provenance since only one pass ran this round.

## What was not decided here — routed

Each finding pairs a straightforward documentation-consistency defect (fix the stale claim/comment/trace) with an open question the pass explicitly declined to answer and this consolidation does not answer either:

- **F-269 and F-270** share a root cause and jointly raise: does `handleErrorReported`'s `FAILURE_TERMINAL_CALLBACK` exclusion at `kernel.ts:2191` have _any_ reachable subject anywhere in the tree, or is it a guard against a state the queue ordering already makes unreachable? The pass established only that the join path doesn't reach it and that no current test covers its removal — it did not attempt an exhaustive elimination argument. That is a DER-shaped question; no DER pass ran this round, and none should be improvised here. Routed to a future DER pass or the architect.
- **F-271** raises whether `06-vertical-sortable-trace.md` should be swept for this drift, or — per F-252's own closing sentence, which predicted exactly this recurrence — given an instrument that holds it to its normative source, given the page is explicitly illustrative and declares itself subordinate to contract 02. That choice is the architect's, not this review's.

Nothing else requires a design decision. F-269 through F-271 are each remediable by correcting the record (a fixed claim, a fixed comment, a swept trace) without reopening D-166, D-66 or I-24's substance.

## Explicitly out of scope, not commented on

**F-268** (the sortable/free-drag `??=` tie-break losing its kernel-side first-party producer) is a separate, already-open architecture question and was not reviewed here. **F-265** (the D-155-round retained-`Animation` finding) and the older cleanup backlog were likewise out of scope by instruction; the pass reports it did not comment on either even where the diff passed through adjacent code.

## Verification cited

`npx just test`: 65 files, 1226 passed, 60 skipped, 1286 total, no type errors — run twice (before and after all falsification probes), identical both times. `npx just typecheck`: clean. Four probes (P-A/B/C/D) applied to mutated copies and reverted; working tree confirmed clean at `57827a2a` before the report was written.