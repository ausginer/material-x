# Decision-elimination review: the final `drag2` arc (D-156, D-158, D-159)

**Commit files were read at:** `43b9f520` (`drag2: report the true stage for a displacement fault and measure the cellular sink`).

**Range reviewed:** `0beb9900..43b9f520` — five commits: `63922766` (D-156, measured-constant displacement model), `ff1837f9` (ownership settlement against the axis geometry cache), `482507fd` (D-158, one post-write hook), `4317b2d3` (cellular residue accepted), `43b9f520` (D-159, failure stage corrected).

## Method

Ran both directions of the decision-elimination lens against the decision text for D-156, D-157 (amended into D-158), D-158 and D-159 in `.plan/contract/00-index.md` and the narrative in `.plan/plan.md`, cross-referenced against the production sources the arc touched: `src/sortable/{spec,slots,runtime,rect-index,linear-shift,xy,y,layout-animation,assemble,feature,config,globals.d}.ts` and the touched test files under `tests/sortable/`.

- **Backward** — for machinery that survived the arc (the cached placeholder rect, the `DEV` equivalence instrument, `xy()`'s measured rebuild, the teardown-only `retire` on `layoutAnimation()`, the kept `catch` around `invalidateInSeam()`, `x()` still unshipped): checked each against the decision that currently justifies it. All matched; no backward-direction finding.
- **Forward** — for every mechanism D-156/D-157/D-158 explicitly named as deleted (the `beforeMove`/`afterMove` seam, the `project`/`measure` two-slot protocol, `DisplacementPlan`, `settleDisplacement`, the `plugins` position, `SortablePlugin`/`SortablePluginContribution`/`SortableComposition`, `DisplacementHook`), grepped the current tree for surviving identifiers, then for surviving *prose* describing them. The identifiers are gone (verified: `DisplacementHook`, `DisplacementPlan`, `settleDisplacement`, `SortablePlugin`, `SortableComposition`, sortable's `plugins` key all absent from `src/`). Five comment sites still describe machinery the arc's own commits retired.

## Scope

**Covered:** the displacement/geometry machinery D-156/D-158/D-159 touched — `rect-index.ts`, `linear-shift.ts` (renamed from `verified-refresh.ts`), `xy.ts`, `y.ts`, `layout-animation.ts`, `slots.ts`, `runtime.ts`, `assemble.ts`, `feature.ts`, `spec.ts`'s `TAG_SPATIAL` bracket, `globals.d.ts`'s `__DEV__` doc, and the touched test files (`sortable.browser.test.ts`, `y.browser.test.ts`, `xy.browser.test.ts`, `assemble.browser.test.ts`, `features.browser.test.ts`, `feature.declaration.test.ts`). Cross-checked the `.plan/contract/00-index.md` entries for D-155 through D-159 and the `xy-residue-and-failure-stage-claude.md` / `displacement-ownership-claude.md` review records against the landed code.

**Not covered:** D-155 (presentation-tail lease) — explicitly out of scope for this arc, unimplemented and untouched by these commits, confirmed still absent from `layout-animation.ts` (no lease/tail code exists there). `x()` — does not ship, nothing to review. The kernel tier, free-drag package, and any file outside the diff `0beb9900..43b9f520` (`git diff --stat` enumerated 24 files; every finding below is inside that set except where noted). No performance/runtime measurement was independently re-run; the byte and frame figures in the decision records were taken as given and only checked for internal consistency against the code shape, not re-measured.

## Findings

### der-1 — Tier A. Two production comments describe a `beforeMove`/`afterMove` hook pair that D-156 deleted inside this arc's own first commit.

`src/sortable/placement.ts:253-254` (`placeholderAt`'s doc, untouched by this arc — last touched 2026-08-01/08-26) still reads:

> "the move pipeline brackets the write with `beforeMove`/`afterMove` hooks, and a hook that measures the whole list must not be paid for a write that will not happen"

`src/sortable/spec.ts:1112-1113` (inside the `TAG_SPATIAL` effect, also last touched 2026-08-01) says the same thing, immediately above code that commit `482507fd` rewrote in this arc to call the single `moved` hook (`slots.movedInsertion(current, view, slots.report)` at line 1187) — the new comment for that call (lines 1164-1185, dated 2026-08-30) sits thirty lines below the stale one and does not describe a hook pair at all.

**Evidence the machinery is gone:** D-156's own contract text (`00-index.md`) states "Moving the prediction ahead of the write deletes the measure-mutate-measure bracket, the `beforeMove`/`afterMove` seam, and the release-all-offsets discipline." `git log -S"beforeMove" -- src/` shows the literal `beforeMove`/`afterMove` slot fields (typed `DisplacementHook[]`) were removed by commit `63922766`, the first commit of this arc (confirmed via `git show 63922766` diff of `feature.ts`/`slots.ts`, which shows `- beforeMove: readonly DisplacementHook[]; - afterMove: readonly DisplacementHook[];` replaced by `projectInsertion`/`measureInsertion`, later collapsed again by `482507fd` into the single `moved` hook). No identifier named `beforeMove` or `afterMove` exists anywhere in `src/` today (`grep -rn` returns nothing outside comments and one historical test-fixture file). The justification the comment gives — paying for a two-hook bracket on a write that never happens — cannot hold for a pipeline that no longer exists in any of its historical shapes (neither the original two-array-of-hooks form, nor the D-157 `project`/`measure` form).

### der-2 — Tier A. Two test comments in files this arc directly rewrote still assert the same retired `beforeMove` hook and the deleted `settleDisplacement` member as live mechanism.

`tests/sortable/y.browser.test.ts:543` (file touched by both `63922766` and `482507fd` in this arc):

> "The entry barrier. `settleDisplacement` runs the `beforeMove` hooks and `release.prepare` resolves immediately afterwards, so a rebuild can be entered on a controller that a hook already destroyed"

`tests/sortable/xy.browser.test.ts:799` (same two commits touch this file):

> "The entry barrier: a dirty cache can be entered on a controller a `beforeMove` hook already destroyed."

**Evidence:** `settleDisplacement` is confirmed deleted — D-158's own text: "`settleDisplacement` is deleted outright" (F-204), and `grep -rn "settleDisplacement" src/` returns nothing. Contrast with the *correct* handling of the same retirement elsewhere in files these same two commits touched: `tests/sortable/features.browser.test.ts:1630-1636` and `tests/sortable/assemble.browser.test.ts:220-224` both explicitly say the `beforeMove`/`afterMove` pipeline no longer exists ("there is no pipeline left to record", "unrepresentable since D-157") — proving the arc's author knew to update this class of comment in some places but missed these two.

### der-3 — Tier A. `src/sortable/slots.ts`'s published `InsertionRuntimeView.insertion` doc still names the deleted `project` member, in the same file the arc used to introduce and then delete it.

`src/sortable/slots.ts:113-119`:

> "A rule reads it in two places and means the same thing in both: `resolve` records which gap the buffer it just measured reflects, and `project` is told which gap the write about to happen will move it to."

`git blame` attributes these lines to `63922766` — the commit that introduced `AxisContribution.project`/`.measure` (per D-157's original two-slot shape). Commit `482507fd`, later in this same arc, collapsed `project`/`measure` into the single `moved` hook (D-158: "`project` and `measure` collapse into `moved(frame, runtime, report)`") and rewrote `slots.ts` (128 lines changed per the arc's diff), but left this doc comment naming `project` untouched. `grep -rn "\bproject\b" src/sortable/*.ts` confirms no identifier `project` exists anywhere in the current tree outside this one comment and the unrelated English word "projection" in `runtime.ts` (der-4). This is published surface — `InsertionRuntimeView` is re-exported from `sortable/feature.ts` for third-party axis authors — so a third-party author reading this type's own doc is told to expect a member (`project`) the axis contract no longer has.

### der-4 — Tier B. `src/sortable/runtime.ts`'s `PresentationView.insertion` doc uses "the projection" to describe a step D-158 deleted, in a file the deleting commit itself touched.

`src/sortable/runtime.ts:72`: "Written immediately before **the projection** and read only inside the bracket". `git blame` attributes this wording to `63922766` (which introduced the `project` step), and `git log` confirms `482507fd` — the commit that deleted `project` in favor of the single post-write `moved` hook — also touched `runtime.ts`, without updating this word. The field is in fact now written immediately before *the write* (`movePlaceholder`), not before any projection step, per the local comment at `spec.ts:1124` ("Published before the write, so the axis is told which gap the placeholder now occupies"), which is accurate. Lower tier than der-1..3 because the sentence remains roughly true in effect (the write and the erstwhile projection happened at the same point in the old model) and this is vocabulary drift rather than a claim of surviving structure — but it is the same class of defect: prose keyed to a step name D-158 retired.

### der-5 — Tier B. `src/globals.d.ts` still names the deleted file `sortable/verified-refresh.ts` as the sole holder of the `DEV`/`__DEV__` binding; the binding moved to `rect-index.ts` inside this arc.

`src/globals.d.ts:10-12`: "Its four author-facing checks are production checks, so `sortable/verified-refresh.ts` holds this package's one binding, in the one tier with per-frame dev work."

**Evidence the fact changed inside the arc's own range:** at the parent commit `0beb9900`, `sortable/verified-refresh.ts` did hold `const DEV: boolean = __DEV__` and `rect-index.ts` had no such binding (confirmed by diffing both files at `0beb9900` against `43b9f520`). This arc deleted `verified-refresh.ts` outright (632 lines removed per the diff stat) and split its contents: the linear rule moved to the new `linear-shift.ts`, and the `DEV`/`verifying`/`verifyEquivalence` binding moved into `rect-index.ts` (`export const DEV: boolean = __DEV__;` at `rect-index.ts:152`, plus the doc there: "This is the package's one binding, and `tests/kernel/vocabulary.node.test.ts` asserts that."). `globals.d.ts` itself was not touched by any commit in the range, so nothing in the arc's own diff carries the correction to this cross-reference.

Confirmed this is not caught mechanically: `tests/kernel/vocabulary.node.test.ts`'s own comment states the enforced invariant is scoped to *tiers*, not filenames — "moving the binding to another `sortable/` module fails neither [row]" — so the test that exists specifically to police this rule says in its own text that it cannot catch a rename inside the tier, which is exactly what happened here.

## What was checked and found *not* to be a finding

- `xy()`'s measured-rebuild shape, the cellular 170 B residue kept in `xy.js`, the cached placeholder rect staying six-field/shared, the linear rule staying in `y.js` at 439 B, the `FAILURE_ACTION_EFFECT` stage on the `moved` hook, the kept `catch` around `invalidateInSeam()` and its latch-order comment, `layoutAnimation()`'s `retire` being teardown-only (not a per-release cancel) — all match their governing decision text exactly (D-158 §7-8, D-159) and none carries stale prose.
- `settleDisplacement`, `DisplacementPlan`, `DisplacementHook`, `SortablePlugin`, `SortablePluginContribution`, `SortableComposition`, and the sortable `plugins` key are confirmed absent as identifiers everywhere in `src/`; `sortable/config.ts` and `sortable.ts` both carry accurate present-tense notes about their absence.
- `tests/revision/revision-2.ts` and `tests/COVERAGE.md:579` still use retired vocabulary (`SortablePlugin`, a "`beforeMove` row") but both are self-declared historical/ledger documents (a frozen revision-closure fixture and a coverage table using an old row's name as a stable identifier, respectively), not ordinary source comments asserting current structure — judged out of the class this lens targets.
- D-155 (deferred) is untouched by this arc and no code implements or half-implements its tail; nothing to report.

## Summary for consolidation

Five sites (der-1 through der-5) carry documentation whose justification was retired by decisions inside this very arc — three of them (der-1's `spec.ts` half, der-2, der-3) inside files the retiring commit itself edited, which is the sharper case: a partial amendment rather than a merely-stale file. No finding contradicts a decision's current substance (the geometry contract, the measured constant, the ownership split, or the failure-stage correction all hold as stated); every finding is prose that outlived the machinery it described. None require architect action beyond directing a documentation fix — no `D-*` is contested, expired in substance, or unimplemented.
