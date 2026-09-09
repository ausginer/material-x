# Arc D — full review swarm, consolidated

**Range:** `0c62b02c6..c553ff8da` on `drag2/fin-review` — four commits, the landing of D-191 and the close of the four-arc D-170 series. **All four passes read files at `c553ff8da`.**

**Subject:** the landed D-191 design. D-190 and the abandoned intermediate variants were not reopened, and no pass was asked to.

## The passes

| Lens | Artifact | Findings | Canonical |
| --- | --- | --- | --- |
| Reviewer (feature proof) | [`arc-d-swarm-feature-proof-claude.md`](arc-d-swarm-feature-proof-claude.md) | `reviewer-1` … `reviewer-5`, all tier B | F-409, F-410, F-411, F-412, F-413 |
| Integrity | [`arc-d-swarm-integrity-claude.md`](arc-d-swarm-integrity-claude.md) | `integrity-1`, tier C | F-414 |
| Cleanup | [`arc-d-swarm-cleanup-claude.md`](arc-d-swarm-cleanup-claude.md) | `cleanup-1`, tier C | F-415 |
| DER | [`arc-d-swarm-der-claude.md`](arc-d-swarm-der-claude.md) | `der-1` … `der-5`, two B three C | F-409, F-411, F-414, F-416, F-417 |

Nine canonical findings: **five tier B, four tier C. No tier A.** Nothing in this range changes what a correctly integrated consumer observes at runtime.

**Id allocation, per prefix independently.** `F-` stood at 408, `Q-` at 28, `I-` at 37, `O-` at 13, `D-` at 191, each scanned separately across `.plan`, `src`, `tests` and `bench`; one prefix's maximum says nothing about another's. Only `F-` is allocated here: **F-409 through F-417**. No `Q-`, no `I-`, no `O-`, and the consolidator mints no `D-`.

## Round hygiene of this round

**Three of four passes committed and pushed their reports to the shared branch while sibling passes were still running** — `a6315fa45` (cleanup), `bd78dc2c3` (integrity), `cc3d9e5de` (reviewer). DER committed `f73be1a1b` and **deliberately did not push**, stating that other passes were committing to the same branch and leaving the push to whoever closed the round. That was the correct judgement and the other three should have made it.

**The blast radius was bounded mechanically, not assumed.** Each of the four commits adds exactly one file under `.plan/reviews/d170-arc/`. The `packages/drag2/{src,tests,bench}` tree objects are byte-identical between `c553ff8da` and the branch tip — `e0c8630fae1d219f53b20cd625a53dc55dab9593`, `32f3cef1de56ac50de2c611d1c48b5ae2ca05e3e`, `61fa59c38f88e51e362115502db44e3801f0adaa` — so no pass's subject matter moved under it.

**The isolation risk is real and is not the same as the blast radius.** One pass's findings sat in the shared tree, reachable by another running pass's grep. What can be said: integrity's repo-wide greps explicitly excluded `.plan/reviews/**`; reviewer diffed the three sibling commits, confirmed them artifacts-only, and states it did not read them; cleanup finished first, with nothing to read; DER observed that commits existed. No finding-level contact is visible in any report. **That is evidence, not proof** — a negative of this shape cannot be established after the fact, which is exactly why the act should not have been taken.

Each pass's hygiene paragraph — "HEAD is unmoved", "the shared checkout was left clean" — was written **before** that pass committed, and is true of its investigation rather than of its whole run.

**Consolidator hygiene.** Every mutation cited below ran in a detached worktree at `c553ff8da` with `node_modules` symlinked, removed afterwards; the shared checkout was never written to. `git status` is clean and `HEAD:packages/drag2/src` is unchanged at `e0c8630fa`.

## Findings

### Tier B

#### F-409 — the F-404 instrument's pairing rows bound the opposite end from the one three live documents claim

`reviewer-1` + `der-1`, reached independently, same remediation unit.

`tests/sortable/feature.declaration.test.ts`'s block docblock says _a narrowing that emptied either would fail there_. The same claim is live in `.plan/contract/03-feature-composition.md` in the present tense and in `plan.md`'s Arc D entry (_so neither side can pass by narrowing to nothing_). The rows are `expectTypeOf<Owner>().toExtend<View>()`, which gets monotonically **easier** to satisfy as the view narrows and is vacuous at `{}`.

**Confirmed by the consolidator's own execution**, in a detached worktree at `c553ff8da`:

| Mutation of `src/sortable/slots.ts` | `tsc` errors | Where |
| --- | --- | --- |
| `InsertionRuntimeView` → `Readonly<{}>` | 4 | `sortable.browser.test.ts` only — declaration test **green** |
| `InsertionFrameView` → `Readonly<{}>` | 3 | `revision-2.ts`, `sortable.browser.test.ts` — declaration test **green** |
| `snapshot` re-declared on the runtime view | — | `feature.declaration.test.ts(103,9) TS2554` — **fires** |

So the disjointness row is a genuine falsifier exactly as D-191 predicts, and only the stated reason for the pairing rows is wrong. The consolidator's run surfaced one reddening file neither pass named (`tests/revision/revision-2.ts`), which widens the evidence without touching the claim.

**A terminology difference, not a disagreement.** Reviewer calls the assertion an **upper** bound on the view; DER calls it a lower bound. Both describe one mechanism from opposite sides. Reviewer's framing is the accurate one — the assertion caps what the view may declare — and the test docblock's own phrase _"The lower bound on the frame view"_ is part of what F-409 names.

**Required property.** Where a document states which assertion defends a property, that assertion is the one that fails when the property is broken.

**Routed:** whether to correct the three documents or to add an assertion that genuinely pins the views from below is an instrument-design choice, not a consolidation call.

#### F-410 — the amended D-158 coverage row cites a test that does not carry its new clause

`reviewer-2`. Reached by no other lens.

`4c9a5c1c6` amended `tests/COVERAGE.md:967` to add _and the same row carries the invalidation discipline — the happy path invalidates nothing, so the bracket's `finally` is the only thing between a failed write and a cache describing a move the DOM never made_, citing _should classify a throwing move hook_. Reviewer deleted the bracket's `finally` invalidation and found exactly one row red — _should classify a throwing lazy invalidation into the failing seam_ — while the cited row passed.

**Confirmed by inspection**: `sortable.browser.test.ts:3370-3386` asserts `expect(stages).toEqual([FAILURE_ACTION_EFFECT])` and nothing else. It never overrides, counts or observes `invalidateInsertion`. This is F-408's exact species, in the same register file, landed by the arc that repaired F-408.

**Reconciled against cleanup's null result, and the reconciliation changes the finding.** Cleanup cleared the deleted row `should invalidate when the move hook fails and not when it succeeds` as a documented strict subset. The consolidator read that row at `0c62b02c6:3465`: its body asserts `expect(failed.stages).toEqual([FAILURE_ACTION_EFFECT])` — **the same single assertion as the survivor**. Its title and its comment claimed invalidation discipline; its assertion never checked it either.

Both passes are therefore right, and the evidence separates the questions cleanly. **The clause was never witnessed by any row.** F-410 is an inherited coverage misstatement relocated by the amendment, not a regression the amendment created — which bears on how it is remediated.

#### F-411 — the package's two formatting gates demand contradictory text, and `just lint` is red at the tip

`reviewer-3` + `der-2`, same remediation unit, reached from different lenses.

**Confirmed by the consolidator's own execution** in `packages/drag2`:

```
$ npx just lint
oxlint .
tests/packaging.node.test.ts:321:10: error prettier(prettier):
  Replace `⏎··········await·sources(SRC)⏎········` with `await·sources(SRC)`
error: recipe `lint` failed on line 47 with exit code 1

$ npx oxfmt --check tests/packaging.node.test.ts
All matched files use the correct format.
```

`oxfmt` 0.58.0 says the landed form is correct; the `prettier` rule refuses it. `handoff.md` requires both. The disclosed item was **promoted on a ground other than the one it was disclosed under** — it was disclosed as formatter-only, and it is formatter-only; what makes it a finding is that it leaves the package's lint gate red.

**One factual disagreement, separated by evidence.** DER attributes the error to `oxlint`'s `prettier` rule; reviewer to the ESLint `prettier/prettier` rule, reporting a package-wide count of 5 → 6. The `lint` recipe runs `oxlint` first and `eslint` second; the run fails at **line 47, the oxlint line**, so eslint never executes, and `oxlint .` alone reproduces it as the **only** diagnostic in the package. DER's attribution is the confirmed one.

**Left unestablished, deliberately.** Reviewer's ESLint half and its 5 → 6 counts could not be reproduced here: `npx eslint` fails to load the TypeScript config (`The 'jiti' library is required…`). Reviewer's claim is preserved as reported and is neither adopted nor rejected; the finding stands without it, on the oxlint failure alone.

**Routed:** DER records that upstream oxfmt 0.67.0 does not reproduce the disagreement, making this a pin question. Which tool wins, and whether the pin moves, is a repository-policy decision.

#### F-412 — the M-5 perf falsifier's threshold is an uncalibrated absolute, and the disclosed flake reproduces

`reviewer-4`. Reached by no other lens.

One of four full-suite runs went red: `tests/perf/m5.browser.test.ts` — _should report a difference that tracks a cost injected into window 1_ — `AssertionError: expected 0 to be greater than 0.02`. The assertion is an absolute millisecond figure with no floor calibration, so on a loaded host the measured difference rounds to `0`.

**Not Arc D's.** `git log 0c62b02c6..c553ff8da -- tests/perf/` is empty. Reported because it reproduces, not because it was disclosed, and explicitly **not** attributed to this landing.

**Why the other passes' green runs do not retract it, argued from each lens's own question.** Integrity ran the full browser project three times and observed `861 passed | 60 skipped` each time; cleanup ran `tests/sortable/` three times and `sortable.browser.test.ts` once. Neither asked whether a perf instrument's threshold is calibrated, and a flake that reproduces once in four is not refuted by three greens — a green run is evidence about that run. DER did not reach the browser suite at all and says so.

#### F-413 — F-325's own landing re-opens method bivariance, so a local axis view's runtime shape is no longer pinned

`reviewer-5`. Reached by no other lens.

D-191 amends F-404 on the ground that every mutation the arc makes is already red under `just typecheck`, citing that removing `snapshot` from `InsertionRuntimeView` reddens eight sites including `xy.ts:158` and `y.ts:181`. Reviewer establishes that the citation reproduces at the **baseline** and stops holding at the **landed tree**: the baseline redness was an artifact of `insertion`, which the baseline published view carried and the local views did not, leaving the two mutually non-assignable. F-325 deletes `insertion`, the published runtime view becomes a subset of any local one, and bivariance re-opens.

**Confirmed by the consolidator's own execution.** In a detached worktree at `c553ff8da`, `snapshot: CollectionSnapshot | null` re-added to `y.ts`'s local `InsertionRuntimeView` — an axis that was never migrated:

```
npx tsc -p tsconfig.json --noEmit  →  0 errors
```

An unmigrated axis compiles green and would read `undefined` at run time. `slots.ts` documents the local-narrower-view pattern as the intended one, so this is the supported shape rather than an abuse of it.

**Tier B rather than A**, on consequence: the tree's own axes are in fact migrated and nothing defective ships. What fails is the instrument claim the amendment rests on — the migration was established by reading, and nothing would have caught it being missed.

**Routed:** whether the tree should carry an instrument pinning local axis views is a design question.

### Tier C

#### F-414 — the D-191 retirement narrative is pipe-wrapped row syntax where twenty-five prior cycles are prose, and both ledger instruments are blind to it

`integrity-1` + `der-5`, same defect, each contributing evidence the other lacks.

`00-index.md:2218` — pinned by the consolidator; integrity's `2216-2218` span is right, DER's `:2219` is one line off, a citation slip to correct rather than a reason to reject. Integrity supplies the convention census: every one of the twenty-five prior retirement narratives in §Decisions not yet implemented, back through the ninth cycle, is prose below an emptied table. DER supplies the second blind instrument.

**Both mechanisms verified by the consolidator:**

- `tests/ledger.ts:199` `ROW_SHAPED = /^\|\s*D-\d+\s*\|/u`, and at `:416` a pipe-shaped line that does not match falls through `continue` **silently**.
- `surplus()` at `:895` returns early on `cells.length <= width`; a one-cell row in a four-wide table trivially satisfies it, so F-83's check catches over-authoring only.

**A tier question, routed rather than settled.** `decisions.node.test.ts` carries a row named _should refuse a table row it cannot parse rather than skipping it_. Here is a table row it cannot parse, and it skips it. If that guard's property covers any pipe-shaped line, this is an unsound instrument and tier B; if it means _decision_ rows specifically, a narrative row is not one and tier C is right. **That turns on what the instrument is for**, which is not the consolidator's to decide. Both passes independently assigned C, and C is what stands — by consequence (record-only, nothing relies on it), not by their agreeing.

#### F-415 — published JSDoc on `InsertionFrameView.snapshot` carries design defence beyond an actionable precondition

`cleanup-1`.

**Both premises verified by the consolidator.** `src/sortable/feature.ts:41-46` re-exports `InsertionFrameView` via `export type { … } from './slots.ts'`, and `./sortable/feature.js` is a published subpath carrying `types` in the exports map, so the block reaches a consumer's `.d.ts`. `documentation.md` §5.1, retrieved by section: _"**No rejected alternatives, and no defence of the design.** A consumer cannot act on why the other shape lost."_ Cited verbatim and correctly.

**Preserved with a distinction the pass did not draw.** The docblock's middle sentence states _what the value is_ — the committed snapshot, not the live one — which a third-party rule author can act on and which reads as a precondition. The trailing clause about the behavior recomputing the home gap from the same value is internal narration. Where the §5.1 line falls between them is a judgement about the rule's scope, so the finding is carried forward with the split named rather than resolved here.

Cleanup notes the convention is pervasive and pre-existing in the same file (`item`, `box`), and scopes the finding to the newly-authored instance. That scoping is kept.

#### F-416 — `arc-d.md` understates the F-326 edge in two ways

`der-3`. Reviewer's clean result 5 and DER agree the edge is unreachable; F-416 is about the **booking's accuracy**, not reachability.

**Both claims verified by the consolidator:**

- `spec.ts:1321` destructures the committed `snapshot` from `draft`; `:1405` builds from `this.#snapshot`.
- The consequence of a divergence is not that "the two reads part company": `collection.ts:175` returns `null` on `insertion.version !== snapshot.version`, and `spec.ts:1411` throws `drag: sortable/release-no-proposal`.
- The interval proved clean in the record (`lifetimes.motion.dispose()` alone) is narrower than the resolve→build interval, which additionally spans `#invalidateInSeam()` and the consumer-reaching axis rebuild.

Still unreachable today, because `Kernel.dispatch` queues through `#bracket.dispatch` — but that is a second argument the record does not make.

#### F-417 — comments still reasoning from the deleted per-operation view and bench view

`der-4`, at `sortable.browser.test.ts:209`, `:482`, `:2469`, `:3333`.

**This does not contradict reviewer's clean result 3, and the two answer different questions.** Reviewer grepped for the literal tokens `view.insertion`, `runtime.snapshot`, `runtime.insertion` across `src/`, `tests/` and `bench/` and found **nothing** — the consolidator reproduced that null. DER's four sites contain none of those tokens; they are comments reasoning from the deleted mechanism. A code-read census and a comment census are different lenses on the same file.

**Preserved, and narrowed by evidence the consolidator gathered.** `:2469` (_`snapshot()` reads what the runtime actually holds_, where `snapshot` now comes off the frame) and `:482` (a bench docblock describing the deleted `view()` observation slot) read as genuinely stale. `:209` is weaker: its comment says the per-operation view is published with a non-null placeholder, and the line beneath it asserts exactly `expect(runtime.placeholder).toBeInstanceOf(HTMLElement)`, which is live. The site list may be over-inclusive; per-site adjudication belongs to remediation. The claim is not rejected — rejecting it would require judging four comments' referents, which is not what consolidation is for.

## Local → canonical

| Local | Canonical | Tier | Note |
| --- | --- | --- | --- |
| `reviewer-1` | F-409 | B | merged with `der-1` |
| `der-1` | F-409 | B | merged with `reviewer-1` |
| `reviewer-2` | F-410 | B | scope refined against cleanup's null |
| `reviewer-3` | F-411 | B | merged with `der-2`; ESLint half unestablished |
| `der-2` | F-411 | B | merged with `reviewer-3`; attribution confirmed |
| `reviewer-4` | F-412 | B |  |
| `reviewer-5` | F-413 | B |  |
| `integrity-1` | F-414 | C | merged with `der-5`; line corrected to `:2218` |
| `der-5` | F-414 | C | merged with `integrity-1`; cited `:2219`, one off |
| `cleanup-1` | F-415 | C | preserved with a distinction added |
| `der-3` | F-416 | C |  |
| `der-4` | F-417 | C | preserved, narrowed |

## What the round establishes about the landing

**The measurement is reproduced, twice, independently.** Reviewer rebuilt both commits and reproduced **all thirty byte figures** in `arc-d.md`'s table, all fifteen module graphs member-for-member, and the declaration weight at 116,389 → 116,432 B. Integrity did the same independently and matched the table exactly. The eight sortable-carrying rows move as recorded; the five rows whose graphs exclude `sortable/` are byte-identical; no module entered or left any graph.

**O-13 is an executed restoration.** All five suspended controls hold at 8,116 / 8,274 / 8,276 / 8,426 / 6,185, verified by both reviewer and integrity, and reviewer confirmed each **fires when perturbed by one byte**. The witness retires only at the final step — `measure.ts` is touched by `c553ff8da` alone in the range. Restoration and budget disposition stay separate acts.

**The §18 decline re-derives independently.** SC-1 is unmet on all three limbs; no `budget:` moved; the shrink does not itself compel a re-base; and the series ending is stated in three records as inadmissible as a trigger, and was not used as one.

**The series is closed.** No `**Unimplemented` marker survives, D-191 is `active` and D-190 `inactive`, O-13 has moved to §Discharged, and the four-arc count is consistent across D-191, O-13 and `arc-c.md`, with D-188's disagreeing clause carrying a pointer rather than a rewrite.

**The core of the arc holds.** Six `readonly` members, one write site, one clear site, `!` sites 6 → 4, both declines on the stated grounds; the `kernel.closed` barrier unweakened with the failure shape changed as D-191's residue required; the `RELEASING` edge with no legal producer; five distinct bracket exits kept with only the strict-subset duplicate removed.

## Scope and silence, from each lens's own question

Stated from the pass's own boundaries. **That a parallel pass covered a subject is not a justification for another's silence**, and is not used as one here.

- **Reviewer** did not cover the kernel tier beyond the release/retire path the arc's residue names, free drag beyond confirming it untouched, C4 and O-3, or D-190 except where a D-190-originated claim is still live in D-191.
- **Integrity** did not re-derive D-190/D-191's architecture, did not independently re-measure the published-declaration weight, and looked at `packages/material-x` only far enough to establish there is no dependency edge onto `@ydinjs/drag2`.
- **Cleanup** did not cover `.plan` prose beyond a consistency check, the kernel and free-drag tiers, or the measurement arithmetic beyond spot-checking the five `control:` literals — each outside the discipline lens.
- **DER** did not run the browser suite, **so it has no evidence about the disclosed flake either way**, and did not execute `measureAll()`, **so `arc-d.md`'s figures are unverified from its lens**. What it did verify is that `controlViolations()` reads the field, making the restored equalities assertions rather than comments. Kernel and free-drag tiers unreviewed except where the release path reaches them.

## Routed, not decided here

1. **F-409** — correct the three documents, or add an assertion that genuinely pins the views from below.
2. **F-411** — which formatting gate wins, and whether the `oxfmt` pin moves.
3. **F-413** — whether the tree should carry an instrument pinning local axis views against the published shape.
4. **F-414's tier** — whether `decisions.node.test.ts`'s "refuse rather than skip" property covers any pipe-shaped line or only `D-` rows. C stands until that is answered.
5. **F-415** — where §5.1's line falls between a semantic precondition and a defence of the design.

No `D-` was minted, no architectural question was settled, and Q-28 was not touched.