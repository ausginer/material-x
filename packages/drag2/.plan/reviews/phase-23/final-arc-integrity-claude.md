# Package coherence — final `drag2` arc (D-156, D-158, D-159)

**Commit files were read at:** `43b9f520` (arc range `0beb9900..43b9f520`).

**Scope covered.** The displacement-model rewrite end to end as a cross-file property: the `plugins` → named `displacement` key migration (`feature.ts`, `config.ts`, `assemble.ts`, `slots.ts`, `runtime.ts`, `sortable.ts`), the `project`/`measure` → single post-write `moved` hook collapse, the `verified-refresh.ts` → `linear-shift.ts` rename, the new `RectIndex.settle` seam (`rect-index.ts`, `y.ts`, `xy.ts`, `layout-animation.ts`), the public surface (`README.md`, `files.json`), the shared `free-drag`/`sortable` composition module (`shared/composition.ts`), the size-measurement harness (`bench/size/measure.ts`, `noncomposed.js`, `budget-rebases.md`), and the declaration-test migration (`feature.declaration.test.ts`, `composition.declaration.test.ts`). `npx just typecheck` from `packages/drag2` was run independently and is green.

**Scope not covered.** The feature's own correctness against the plan (G3/G5 geometry rules, the zero-read claims, the ownership/residue size arithmetic already recorded in `displacement-ownership-claude.md` and `xy-residue-and-failure-stage-claude.md`) — that is the `reviewer` lens, not this one, and I did not re-derive or re-check those figures. I did not audit `free-drag/*` beyond confirming it is untouched and unaffected by the shared module's edits. I did not run the browser test suite (only `typecheck`).

## Findings

All findings below are the same shape: a description of the current architecture that a reader would form from one site, contradicted by a second site the arc did not update. None required a source-code change to see — `typecheck` cannot catch any of them, since every one is a comment, doc-comment or prose claim, not a type.

### integrity-1 — `README.md`'s export-topology table for `sortable/feature.js` names four types the arc deleted or renamed

**Tier B.**

**Claim:** the package's own record of its public type surface disagrees with the surface `sortable/feature.ts` actually exports.

**Evidence.** `packages/drag2/README.md:101` (unchanged by this arc) still lists `sortable/feature.js`'s type-only exports as `AxisInstaller`, `SortableLandingInstaller`, **`SortablePlugin`**, `FeatureContext`, `AxisContribution`, `LandingContribution`, **`SortablePluginContribution`**, `InsertionGeometry`, `InsertionFrameView`, `InsertionRuntimeView`, **`DisplacementHook`**, **`DisplacementView`**, `Insertion`, `Disposer`, `DOMRealm`, plus the three landing seam types.

`packages/drag2/src/sortable/feature.ts` (as landed) exports no `SortablePlugin`, `SortablePluginContribution`, `DisplacementHook` or `DisplacementView` — `grep '^export' feature.ts` shows the current set is `SortableDisplacementInstaller` (feature.ts:240), `DisplacementContribution` (feature.ts:177), and `DisplacementReport`/`DisplacementSettle` re-exported from `slots.ts`/ `rect-index.ts` (feature.ts:39-49). The four names README documents do not exist anywhere in `src/` (confirmed by a repo-wide grep).

Nothing in the test suite checks README's prose against the actual export set — `tests/docs.node.test.ts` checks TypeDoc's _unresolved-reference_ warnings against `typedoc.json`'s `intentionallyNotExported` list, which is a different property (structural closure, not README's manually-written table) and would not fire on this drift.

**Required property.** README's export-topology table names exactly the type-only exports `sortable/feature.js` carries, since it is the document contract 03 §export topology and this file's own "Export topology" section point to as authoritative.

### integrity-2 — `globals.d.ts` misidentifies which module holds the package's `__DEV__` binding, and the module it names does not exist

**Tier B.**

**Claim:** the one normative sentence describing where `__DEV__` is bound names a file this arc deleted, and the binding is not in the file the arc renamed it to either.

**Evidence.** `packages/drag2/src/globals.d.ts:11-13` (unchanged by this arc): "the kernel binds it nowhere... so `sortable/verified-refresh.ts` holds this package's one binding". Before this arc (`0beb9900`), that was true — `git show 0beb9900:packages/drag2/src/sortable/verified-refresh.ts` contains `const DEV: boolean = __DEV__;` at line 56. This arc renamed that file to `sortable/linear-shift.ts` and, in the same rewrite, moved the `__DEV__` read out of it: a repo-wide grep for `__DEV__` in `src/` today returns only `globals.d.ts` and `sortable/rect-index.ts`. The binding now lives at `sortable/rect-index.ts:152` (`export const DEV: boolean = __DEV__;`), documented there as "package vocabulary... the behavior tier binds it directly" — `rect-index.ts:140-151`. `sortable/linear-shift.ts` contains no `__DEV__` reference at all.

**Required property.** `globals.d.ts`'s claim about the sole `__DEV__` binding site names the file that actually contains it — a promise the file makes explicitly ("holds this package's one binding") and a reader would use to find the one place the dev-only equivalence instrument lives.

### integrity-3 — `slots.ts` and `y.ts` give different, disagreeing accounts of the same shared field's second read site

**Tier B.**

**Claim:** `InsertionRuntimeView.insertion` is documented by the behavior's own slot type as read a second time by a seam member (`project`) that this arc deleted, while the axis module that actually reads the field documents the same read as belonging to `moved`.

**Evidence.** `packages/drag2/src/sortable/slots.ts:112-118` (unchanged by this arc's `moved`-collapse edits to the surrounding file): "A rule reads it in two places and means the same thing in both: `resolve` records which gap the buffer it just measured reflects, and **`project`** is told which gap the write about to happen will move it to." There is no `project` member on `InsertionGeometry` (`feature.ts:106-152`, current) — the two-slot `project`/`measure` protocol was collapsed into one post-write `moved` hook by this arc (feature.ts diff at the same commit range: `- measure?(...)` / `+ moved(...)`).

`packages/drag2/src/sortable/y.ts:52-56`, updated by this arc, gives the correct account of the _same_ field on its own structurally-identical local type: "in `resolve` the rebuild records which gap its buffer reflects; in **`moved`** the write has just put it there."

The two files describe the identical field — `slots.ts` says so explicitly ("the frame's own committed insertion, republished here so a rule needs no second view") — and name different, non-overlapping seam members as its second reader.

**Required property.** Both descriptions of `InsertionRuntimeView.insertion` / `InsertionFrameView.insertion` name the same current seam member as the second read site.

### integrity-4 — Two production comments describe a pre-write "beforeMove/afterMove" bracket that D-158 removed

**Tier C.**

**Claim:** the reasoning behind an early-return optimization is attributed to hooks that no longer exist, in two files this arc did not touch for this purpose.

**Evidence.** `packages/drag2/src/sortable/placement.ts:250-255` (unchanged): "Exported because inertness has to be decidable _before_ the move: the move pipeline **brackets the write with `beforeMove`/`afterMove` hooks**, and a hook that measures the whole list must not be paid for a write that will not happen." `packages/drag2/src/sortable/spec.ts:1111-1114` (unchanged): "The pipelines bracket the write, so a `beforeMove` hook that measures the whole list would otherwise be paid in full for a write that never happens."

`beforeMove`/`afterMove`/`beforeInsertionMove`/`afterInsertionMove` do not exist anywhere in `src/` after this arc (confirmed by grep) — `AxisContribution` lost both hooks (feature.ts diff: "**D-157 emptied this group of everything but its one slot**"), and the displacement protocol is now a single post-write `moved`/`report` call, which is the entire point of D-158 ("one post-write hook the sink is passed into" — commit `482507fd`). `runtime.ts`'s equivalent comment on the same `insertion` field was correctly rewritten by this arc to say "written immediately before **the projection**... read only **inside the bracket**" with no hook names (`runtime.ts` diff, current lines 69-79), showing the other three sites are the outliers rather than a deliberate retained vocabulary.

**Required property.** A comment justifying skipping the write for an already-correct gap names the actual hook the skip protects (`moved`), not a two-hook bracket the package no longer has.

### integrity-5 — `shared/composition.ts`'s worked example for `Composed`/`UniqueIn` names fields that exist in neither of its two current consumers

**Tier C.**

**Claim:** the doc comment illustrating what a multi-writer plugin group looks like cites concrete field names that are no longer producible by either behavior this shared module serves.

**Evidence.** `packages/drag2/src/shared/composition.ts:121-125` (unchanged): "**Multi-writer slots are untouched**: an entry naming only members the plugin group declares maps to itself, so any number of features and plugins keep accumulating into **`beforeInsertionMove`, `afterInsertionMove`** and `retire`." This module is shared by exactly two consumers post-arc: `sortable/feature.ts`, which deleted its `plugins` position entirely this arc (replaced by the single-writer `displacement` key — `feature.ts`: "the composition check's four helpers no longer travel with them... there is no positional check left for them to serve"), and `free-drag/feature.ts`, whose `FreeDragPluginContribution` (feature.ts:165-173) declares **no** multi-writer slot at all ("free drag has **no multi-writer slot**, so the group is a lifetime and nothing else"). `beforeInsertionMove`/`afterInsertionMove` never belonged to free-drag's vocabulary and no longer belong to sortable's, so the comment's own example cannot occur in the codebase that imports it today.

**Required property.** The comment's worked example is realizable by at least one of the module's actual consumers, or is stated generically rather than with field names belonging to a deleted contribution group.

### integrity-6 — `DisplacementView` is described in the present tense as live architecture in two files, while a third file in the same test suite correctly marks it superseded

**Tier C.**

**Claim:** three sites in the same package disagree on whether `DisplacementView` currently exists.

**Evidence.** `DisplacementView` was deleted from `src/` by this arc (the `feature.ts`/`slots.ts` diffs remove the type entirely; a repo-wide grep of `src/` returns no hits). `packages/drag2/tests/sortable/sortable.browser.test.ts:3296-3297` (unchanged by this arc) still asserts, present tense: "`PresentationView.insertion` is documented as meaningful only inside the committed-move bracket, and **the hook-facing `DisplacementView` declares it non-null** on that basis." `packages/drag2/tests/COVERAGE.md:577` (unchanged by this arc) likewise: "the pass-specific rows are therefore driven directly, with **a hand-built `DisplacementView`**." Both read as descriptions of current test infrastructure. By contrast, `packages/drag2/tests/sortable/feature.declaration.test.ts:160`, edited by this arc, correctly uses the repository's struck-through convention for a superseded name: "I-10, re-pointed by D-157 at the group that replaced **~~`DisplacementView`~~**". The same arc that fixed the reference in one file of the suite left it unfixed, in present tense, in two others.

**Required property.** Every reference to `DisplacementView` in the test suite either names it as a currently-existing type or marks it as superseded with the repository's own convention — not both, in the same suite, for the same symbol.

## Clean checks worth recording

- `packages/material-x` (the only other in-repo consumer package) does not reference any of the renamed/deleted sortable symbols (`SortablePlugin`, `plugins`, `beforeInsertionMove`/`afterInsertionMove`, `DisplacementHook`/ `DisplacementView`, `measureInsertion`) — no cross-package break.
- `assemble.ts`, `config.ts`, `runtime.ts`, `y.ts`, `xy.ts`, `rect-index.ts`, `layout-animation.ts` and `sortable.ts` are mutually consistent on the new `displacement` key / `report`+`settle` wiring; `bench/size/noncomposed.js`'s hand-assembled baseline A mirrors `assemble.ts`'s real wiring exactly.
- `bench/size/measure.ts`'s composition budgets and `control` figures match `.plan/measurements/budget-rebases.md`'s D-158/D-159 re-base tables line-for-line for every row checked.
- `free-drag/*` is untouched by this arc and its own `Composed`/`UniqueSlot` plugin-composition check (still exercised via `free-drag.ts`'s `FreeDragComposition<T>`) still type-checks against the shared module.