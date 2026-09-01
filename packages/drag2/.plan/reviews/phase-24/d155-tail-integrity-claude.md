# D-155 tail — package coherence (integrity pass)

Files read at `37ae30e6` (drag2/fin-review). Diff range `09f26770..37ae30e6`, commit subject "drag2: replace the landing gate with a relinquished tail" — the sole commit in range, 70 files, +2447/-2905.

Read first, per the task brief: `.plan/contract/00-index.md`'s D-155 row, `.plan/reviews/phase-23/d155-d156-implementation-shape-claude.md` (§2, §10), `.plan/reviews/phase-24/d155-space-model-projection-claude.md`, then the full diff.

## Scope

Covered, with evidence:

- Every deleted export (`SettlementScope`, `LandingStart`, `LandingContext`, `LandingHandle`, `FAILURE_LANDING_CREATE`, `FAILURE_LANDING_INTERRUPTED`, `holdForLanding`, `createLandingStart`) grepped across `src/`, `tests/`, `bench/` for orphaned consumers.
- `src/kernel.ts` and `src/kernel/seams.ts` (the published SPI) cross-checked against what `src/free-drag/spec.ts` and `src/sortable/spec.ts` actually consume post-change.
- `src/free-drag/landing.ts`, `src/sortable/landing.ts`, `src/sortable/layout-animation.ts` read in full for parity between the two features' integration of the tail.
- `packages/drag2/.plan/measurements/budget-rebases.md` and `README.md`'s size/option-domain tables cross-checked arithmetically against `bench/size/measure.ts`'s budget constants and `bench/size/noncomposed.js`.
- `tests/COVERAGE.md`'s diff read in full; the five settled-behavior cases named in the task (absent policy, zero delta, reduced-motion collapse, policy failure, platform animation refusal) matched against live test titles and bodies in `tests/kernel/kernel.browser.test.ts` and `tests/sortable/features.browser.test.ts`.
- Every file under `.plan/contract/` read via its diff (00, 01, 02, 03, 04, 05, 06, 07, plus `plan.md`), and the _current_ text of 02, 03 and 05 grepped for leftover mentions of retired identifiers not caught by the diff review, to catch a stale sentence sitting next to an edited one.

Not covered: `packages/material-x` — this commit touches only `packages/drag2/`, so the Material X `files.json` check in my brief does not apply and I did not run it. I did not re-derive or re-check the `d155-space-model-projection-claude.md` projection arithmetic itself (that pass's own conclusion, `visualSpace`, is treated as settled per the task brief) beyond confirming `src/kernel/kernel.ts`'s `startTail` reads `visualSpace` (not `itemSpace`) at the point named in that record. I did not run the test suite; all coverage claims below are checked by reading test titles against `tests/COVERAGE.md` and reading the bodies of the specific tests named for the five settled-behavior cases, not by executing them.

## Findings

### integrity-1 — `02-kernel-behavior-contract.md`'s own `SettlementTransition` code sample still types the deleted `scope: SettlementScope` parameter

**Tier B.**

**Current behavior.** `.plan/contract/02-kernel-behavior-contract.md` carries, in one fenced code block (~line 1163):

```ts
type SettlementTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>, input: SettlementInput): PreparedSettlement; // throws to fail (D-152)
  effect(
    current: Readonly<Frame<Part>>,
    prepared: PreparedSettlement,
    scope: SettlementScope,
  ): void;
}>;
```

**Why it's a problem.** The doc comment immediately above this exact block was edited by this commit to read: _"Settlement stages nothing, and carries no capability either: the gate plan went with D-41's protocol and the last gate with D-155, so both phases hand the behavior committed state and nothing else."_ Seven lines later the same file's own §The settlement gate section (also edited by this commit) states _"`SettlementScope` is deleted outright... `settlement.effect(current, prepared)` now takes no capability at all, and the seam's envelope hands it none"_ (~line 1259). The code sample between those two edited statements was not touched, so it still shows a three-parameter `effect` typed against a deleted type — contradicting both surrounding paragraphs and the shipped `SettlementTransition` in `src/kernel/spec.ts`, which is:

```ts
export type SettlementTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>, input: SettlementInput): PreparedSettlement;
  effect(current: Readonly<Frame<Part>>, prepared: PreparedSettlement): void;
}>;
```

A related, second site in the same file: "Capabilities passed at call time" (~line 907) still reads _"That holds for the two lifetime-shaped ones: a `LifetimeScope` whose lifetime has disposed invokes a late `use()` disposer immediately, and a `SettlementScope` past sealing ignores and reports a late hold."_ — presented as current fact, with no strikethrough, immediately before a paragraph the commit _did_ edit (the next one, on `BehaviorLiftSession.write`).

**Evidence.**

- `.plan/contract/02-kernel-behavior-contract.md`, code block at ~line 1163-1170, vs. the doc comment immediately above it (edited this commit) and §The settlement gate (~line 1259, edited this commit, "`SettlementScope` is deleted outright").
- `.plan/contract/02-kernel-behavior-contract.md` ~line 907, unedited by this commit (confirmed via `git diff 09f26770..37ae30e6 -- .plan/contract/02-kernel-behavior-contract.md`: the hunk touching this paragraph's neighbor leaves this sentence as unchanged context).
- `src/kernel/spec.ts`'s actual `SettlementTransition` (two-parameter `effect`, no `scope`) and `git diff 09f26770..37ae30e6 -- src/kernel/spec.ts`, which shows `SettlementScope` deleted outright.

**Required property.** A contract page's own type sample must agree with its own surrounding prose and with the type it purports to reproduce; where a commit rewrites the prose describing a seam's capability, every code sample and capability-inventory sentence for that same seam on the same page must be rewritten with it.

### integrity-2 — `05-lifecycle-invariants.md`'s bracket-discharge table still describes `landing({ duration })` as running "inside `start`" and relying on `runner.destroy()`

**Tier B.**

**Current behavior.** `.plan/contract/05-lifecycle-invariants.md` ~line 468, in the reachability/bracket-discharge table under §I-36:

> `landing({ duration })` thunk → `matchMedia` → `visual.animate()` → `finished.then` | **feature**, inside `start` | **Bracket-discharged under I-36 (1)** — the whole stretch sits inside the F-30 revalidation, whose `runner.destroy()` cancels the unpublished handle in the same synchronous stretch with no intervening paint.

This row carries no strikethrough and is not annotated as historical, unlike every other retired-mechanism reference this commit touched on the same page (e.g. the row immediately below it, `LandingStart, anchorTarget, LandingHandle.destroy/retarget`, _was_ rewritten with strikethrough and a D-155 note).

**Why it's a problem.** Four lines later, the paragraph directly under the table (~line 472, edited by this commit) says the opposite: _"Since D-155 the site is shorter and the residue is smaller: the thunk and the media query are the feature's, the `animate()` call is the kernel's, and there is no `finished` subscription at all."_ There is no `start`, no `finished.then`, and no `runner.destroy()` anywhere in the shipped tree — confirmed against `src/shared/landing.ts` (`createLandingTiming` returns a plain `(fromX, fromY, toX, toY) => LandingTail | null` function, no `start`/`done`/`fail` triple) and `src/kernel/kernel.ts` (`startTail` calls `element.animate(...)` directly with no `finished` subscription and no handle to destroy).

**Evidence.**

- `.plan/contract/05-lifecycle-invariants.md` line 468 (table row, untouched by `git diff 09f26770..37ae30e6`) vs. line ~472 (same file, same section, edited by this commit).
- `src/shared/landing.ts` (`createLandingTiming`) and `src/kernel/kernel.ts` (`startTail`), neither of which has a `start`/`done`/`fail`/`finished`/`runner.destroy()` shape any more.

**Required property.** Every row of a reachability/bracket-discharge table must describe the mechanism that actually discharges the reading it claims to discharge; a table row and the prose paragraph analyzing the same call site on the same page must describe one mechanism.

### integrity-3 — `03-feature-composition.md` still asserts D-51's relinquishing-invocation list "has one member," against the ledger's own "empty since D-155"

**Tier B.**

**Current behavior.** `.plan/contract/03-feature-composition.md` (~line 707), in the discussion of the candidate-rebuild loop's bracket discharge (unedited by this commit, confirmed absent from `git diff 09f26770..37ae30e6 -- .plan/contract/03-feature-composition.md`):

> D-51's relinquishing exception does not reach here: its closed list has one member, `LandingHandle.destroy()`, and a candidate resolver releases nothing the library is holding.

**Why it's a problem.** `.plan/contract/00-index.md`'s D-51 ledger row was edited by this commit and now reads: _"~~The list is currently one member: `LandingHandle.destroy()`.~~ **The list is empty since D-155 (2026-09-01)**... no tier supplies a runner any more, because the interpolation the kernel owns holds nothing that a consumer's code could be asked to relinquish."_ The two pages disagree about the current size of the same named list — one says one member, naming a type deleted by this commit; the other, edited by this same commit, says zero.

**Evidence.**

- `.plan/contract/03-feature-composition.md` ~line 707 (unedited by `37ae30e6`).
- `.plan/contract/00-index.md` D-51 row (~line 227, edited by `37ae30e6`): "The list is empty since D-155."

**Required property.** A named list referenced from more than one contract page (D-51's relinquishing-invocation list) must have one size, stated consistently on every page that names it; a commit that empties the list at its ledger row must not leave a dependent page still counting the member it removed.

### integrity-4 — README's kernel-tier "values" count omits the four `CANCEL_*` origins, understating the enforced export list by 4

**Tier B.**

**Current behavior.** `README.md`'s export-topology table (edited by this commit) states:

> `kernel.js` — **the kernel tier**, new (D-48) | **29 values** (D-68, as trimmed by D-130 and D-155): `draggable`, the 10 `FAILURE_*` ..., the 3 `LIFT_*`, the 5 `SETTLED_*`, `AT_PROPOSAL`/`AT_CONSUMER`, and the 8 phases

`1 (draggable) + 10 (FAILURE_*) + 3 (LIFT_*) + 5 (SETTLED_*) + 2 (AT_*) + 8 (phases) = 29`, matching the stated figure — but the enumeration silently omits `CANCEL_ABORTED`/`CANCEL_FAILED`/`CANCEL_INTERRUPTED`/`CANCEL_SUPPLIED`, which `kernel.js` also exports as values (`src/kernel.ts` re-exports them from `kernel/failures.ts`).

**Why it's a problem.** `tests/exports.node.test.ts`'s `SURFACE.kernel` array — the test the package treats as the frozen, enforced truth of this export list — has 33 entries, and its own adjacent comment computes it as `1 + 10 + 3 + 5 + 2 + 4 + 8` (the `4` being the four `CANCEL_*` origins). A reader using README's table to enumerate the kernel tier's public surface undercounts it by exactly the `CANCEL_*` group.

This predates the commit: the pre-image row said "31 values" (`1+12+3+5+2+8`, the same omission against the pre-image's 35-entry test array, since the pre-image `FAILURE_*` count was 12). This commit's edit recomputed the `FAILURE_*` half correctly (12 → 10, matching D-155's two deletions) but carried the `CANCEL_*` omission forward into the new figure (31 → 29) rather than correcting it.

**Evidence.**

- `README.md`, export-topology table, `kernel.js` row (edited this commit, 31 → 29).
- `tests/exports.node.test.ts`, `SURFACE.kernel` (33-entry array) and its comment: _"the whole of D-68's value half — 33 names, which is `1 + 10 + 3 + 5 + 2 + 4 + 8`... **The four `CANCEL_*` origins join them under the same rule** (D-154)."_
- `git show 09f26770:packages/drag2/README.md`'s same row ("31 values"), confirming the omission predates this commit and this commit's edit did not close it.

**Required property.** README's stated per-entry value count for a subpath must equal the length of that subpath's array in `tests/exports.node.test.ts`, the test the package already uses to enforce the export topology.

## Areas checked with no finding

- **Deletion completeness (lens 1).** Every consumer of `SettlementScope`, `LandingStart`, `LandingContext`, `LandingHandle`, `FAILURE_LANDING_CREATE`, `FAILURE_LANDING_INTERRUPTED` in `src/` is gone — no orphaned import, no dead re-export. The design-probe files that still name these types (`tests/probes/13b-settlement.ts`, `tests/probes/13c-free-drag.ts`, `tests/revision/phase-14.ts`) were rewritten to compile against the current shape, using `@ts-expect-error` against the retired members rather than importing them live.
- **SPI narrowing (lens 2).** `src/kernel.ts` publishes `LandingTail` in place of the three deleted landing types and `LandingTail` alone is what `src/free-drag/spec.ts` and `src/sortable/spec.ts` reach for (`landingTail(current, fromX, fromY, targetX, targetY)`); neither feature module reaches for anything the kernel stopped exporting.
- **Feature parity (lens 3).** `src/free-drag/landing.ts` and `src/sortable/landing.ts` are structurally identical thin factories over `src/shared/landing.ts`'s `createLandingTiming`, both taking `{ realm }` from `FeatureContext` and returning `{ landingTiming }`. Both `landingTail` implementations in `src/free-drag/spec.ts` and `src/sortable/spec.ts` follow the same pattern: read `slots.landingTiming`, gate on a feature-specific policy decline (`current.domain?.type !== 'accepted'` for free drag, `current.recovery !== RECOVERY_IMMEDIATE` for sortable), delegate to `landingTiming(...)`. `src/sortable/layout-animation.ts`'s comments were correctly updated for the item/visual split without changing its disjointness argument.
- **Size narrative (lens 4).** Every budget constant in `bench/size/measure.ts` and every control value matches the corresponding row of `budget-rebases.md`'s new table exactly (checked minimal, minimal(xy), both layoutAnimation rows, both landing rows, complete, all four free-drag rows, both-behaviors, kernel root, baseline A, baseline B, vocabulary root). `bench/size/measure.ts` and `bench/size/noncomposed.js`'s module-path assertions were updated from `shared/landing-runner.js` to `shared/landing.js` throughout.
- **Test coverage integrity (lens 6).** `tests/COVERAGE.md`'s diff is thorough and, for the five settled-behavior cases named in the task brief, backed by live tests I read in full: `should start nothing without a landing policy`, `should start nothing when the visual is already where it was pinned` (absent policy / zero delta), the reduced-motion pair in `tests/sortable/features.browser.test.ts` (`should read a duration thunk under a reduced-motion preference too`, `should land an unbounded thunk result under a reduced-motion preference`), `should report a policy that throws and still terminate` (policy failure), and `should report a duration the platform refuses and still terminate` (platform animation refusal) — all present in `tests/kernel/kernel.browser.test.ts` with real assertions, not prose-only claims.

## What I did not chase further

`.plan/contract/06-vertical-sortable-trace.md`'s MEASURE section (the `target = spec.anchorTarget(current)` step) never states the origin-relative-delta conversion explicitly (it jumps from the raw anchor point to "This measurement is AUTHORITATIVE" without showing `target.x -= origin.x`), and the join section's `lift.write(target.x, target.y)` relies on that conversion having already happened. This omission predates the commit (present identically in the pre-image at the same location) and is a simplification in the trace's pseudocode style rather than a new drift, so I did not report it as a finding — the commit's edit to the join section is, if anything, a correctness improvement over the pre-image (which duplicated a stale re-measurement step there). I flag it here only so a reader of this report is not surprised to find the arithmetic step written nowhere on that page.