# D-162 as landed: feature proof

**Tree read at `e4e835ba`**, diffed against `c168126d`. Subject documents: the amended D-162 row and the F-213 / F-225 rows in [`contract/00-index.md`](../../contract/00-index.md), the plan entry _D-162 implemented as amended_, and [`displacement-coordinate-space-claude.md`](displacement-coordinate-space-claude.md). Only the landed state was judged; the prototype forms named in the artifact were not re-examined.

## Scope

Covered:

- the routed path, traced statement by statement from `acquireLift` through `ActivationScope.inheritedSpace`, `spec.ts`'s `PresentationView` literal, `y()`/`xy()`/`linear-shift.ts`, to the keyframe expression in `layout-animation.ts`;
- the browser evidence, **run** (`vitest run` under headless Chromium, the package's own browser project) and **falsified** by removing the projection in a throwaway worktree at `e4e835ba`;
- the F-225 boundary, from both sides, plus configurations the boundary's wording does not name — probed in the same worktree;
- D-85's stated invariants against the landed source;
- the whole package suite (65 files, 1233 passed / 60 skipped) and `tsc --noEmit`, both green.

Not covered, and silent rather than clean: the byte figures in the plan entry (no build was run, neither arm); `bench/size` budgets; lint and format recipes; the landing and free-drag paths; anything outside `src/sortable/`, `src/kernel/presentation.ts` and the four touched test files.

No project file was modified. Every probe ran in a detached worktree, since removed.

## What holds

**The routed correction is real and the path is single.** `inheritedSpaceOf` (`src/kernel/presentation.ts:410`) is derived from the one `coordinates()` traversal `acquireLift` takes before it mutates anything, returns the **inverse** of the ancestor linear part, and is `null` for the identity. `spec.ts:880` copies it once onto the per-operation `PresentationView`; `y()` reaches it through `linear-shift.ts:242` and `xy()` through `xy.ts:358`; the sink applies it at exactly one expression (`layout-animation.ts:181-193`). `presentation` is constructed at one site (`spec.ts:870`) and nulled at teardown — there is no second writer and no refresh path, which is what the new G7 clause states.

**The viewport-space invariants the record claims are the ones the code has.** `Contribution.dx/dy` store the unprojected vector (`layout-animation.ts:203`), the fold adds `previous.dx * remaining` in viewport (`:152`), and `settle` subtracts a viewport quantity from viewport rects (`:253-263`). Because the projection is linear and `remainingOf` returns the _transformed_ progress the keyframes interpolate against, the rendered viewport offset of a local keyframe decaying to zero is `M · (M⁻¹v · r) = v · r` exactly — so the settle walk and the `DEV` `verifyEquivalence` instrument in `rect-index.ts` stay sound. The new ancestor-`scale` cases pass **with** that instrument live, which is independent corroboration rather than a restatement.

**D-85 stands.** `@ydinjs/box-quad` is imported in exactly one module, `src/kernel/presentation.ts:11`; nothing under `src/sortable/` or `src/free-drag/` names it. No layout read was added on any path — `element.animate` is not one, and the projection is four multiplies or one null test. `InheritedSpace` is re-exported from `sortable/feature.ts:36` off the kernel's own declaration, so it is one declaration on two entries, the shape D-68 already ratified; `tests/kernel/vocabulary.node.test.ts` and `tests/docs.node.test.ts` both pass at the new surface.

**A premise correction on the brief.** D-85 defines no "sink" property. In this package _sink_ means the displacement sink (`DisplacementContribution` / `layoutAnimation()`); D-85's invariants are the one activation measurement, the behavior-measures-nothing packaging rule, and `InheritedSpace` publishing at `kernel.js`. Those three were checked and hold. There is no fourth, no-sink property to check.

**The evidence discriminates, and I falsified it rather than taking the record's word.** Removing the projection at `e4e835ba` and re-running `tests/sortable/displacement.browser.test.ts`:

| case | projected | unprojected |
| --- | --: | --: |
| ancestor `scale(2)` | carried 80 | **160** |
| descendant `visual`, no transform between | carried 80 | **160** |
| 1.5× wrapper between item and visual | carried 53.33 | **160** |
| control, no ancestor transform | 40 | 40 (passes either way, as declared) |

Three fail, the control does not, and the other 26 cases in the file are unmoved — so the new evidence is specific to the projection and the overshoot is exactly the stage, as the plan entry states. The observations are boxes (`getBoundingClientRect`), not declarations.

**The F-225 boundary is not absorbed and is not papered over.** F-225 stays open at tier B, the limit is published rather than folded in, and the excluded configuration is asserted as the failure the limit names (two thirds of the travel) rather than described. That part of the closure is exactly what it claims.

## Findings

### proof-1 — a `transform` on the item itself, with a descendant `visual`, is projected wrongly, and with no ancestor transform that is a regression the change introduces — **tier A**

**Current behavior.** `inheritedSpaceOf` is fed the `Box` measured **at the visual**, and `ancestorMatrix` in `@ydinjs/box-quad` accumulates every node _strictly above_ that element (`packages/box-quad/src/index.ts:237-243`: `if (current !== element) ancestorMatrix.preMultiplySelf(node)`). When `visual` resolves to a **descendant**, the item is strictly above the visual, so the item's **own** `transform`/`scale`/`rotate` enters the projection. A displaced row's `translate` applies before its own `transform` in the used-value chain, so the space it is actually spent in is the space above the row, which excludes any per-row transform. The two disagree by exactly the item's own linear part.

**Why it is a problem.** The published limit — `config.ts:112-121`, and the same sentence in the D-162 row and the F-225 row — rules out only a transform that sits **between** the item and its visual. A transform authored **on the item** is not between them, is not named by the limit, and is not addressed by either remedy the limit offers (_put the transform on the visual itself … or above the collection_ — neither is available to a consumer who wants the row itself transformed). Rows carrying an authored `transform` are elsewhere an explicitly supported and tested configuration (`displacement.browser.test.ts` → _should leave an authored transform untouched_).

Worse, the defect does **not** require an ancestor transform. With an untransformed ancestry the pre-fix sink was correct here, because viewport and local coincided; post-fix, the item's own transform makes `inheritedSpace` non-null and the projection divides by a factor that should not be there. That configuration therefore **regresses** at `e4e835ba`.

**Evidence / reproduction.** Detached worktree at `e4e835ba`, probe appended to `tests/sortable/displacement.browser.test.ts` — the landed _should count an intervening transform twice_ case with the `scale(1.5)` moved from the intervening wrapper onto the item, everything else unchanged.

- With the landed `rootStyle: { transform: 'scale(2)' }`: `{ travel: -80, carried: 53.33, keyframe: '0px 26.6667px' }`. Identical to the excluded configuration, from a shape the limit does not exclude.
- With **no** `rootStyle` at all: `{ travel: -40, carried: 26.67, keyframe: '0px 26.6667px' }` — the row must travel 40 px and is drawn back only 26.67, so it visibly jumps the remaining third. The same probe against the same tree with the projection expression removed yields `'0px 40px'` and passes, which is what makes this a regression rather than a pre-existing hole.

**Required property.** For every configuration the contract admits, the projection applied to a displaced row's vector must be the inverse of the linear part **that row's `translate` is actually spent in** — the space above the row — or the configuration must be excluded by a published limit that names its real condition. Neither holds today for a descendant `visual` over a transformed item. Whether that is met by widening the limit's wording or by obtaining the space above the item is a contract call, and is routed to the architect rather than answered here: §5 of the subject artifact already priced the second option against D-85's acceptance ground, but it priced it for the ancestor-transform case only, and the no-ancestor-transform regression above was not in front of that decision.

### proof-2 — the limit is documented on the slot that does not create the condition — **tier B**

**Current behavior.** The new sentence lands inside the doc block of `box` (`config.ts:100-123`), appended to the shared _Scope limits, stated positively_ paragraph. The condition it governs is created by `visual`, whose own doc block (`config.ts:94-99`) reads in full: _The node **faithfully lifted** — what the user sees travel. Defaults to the item._

**Why it is a problem.** The decision justifies the placement as _findable, because it sits with the limits already governing the slot that creates the condition_. A consumer who sets `visual` and leaves `box` at its default never has occasion to read `box`'s documentation, and the rendered TypeDoc member for `visual` carries nothing pointing at it. The justification and the landing disagree about which slot that is.

**Evidence.** `config.ts:94-99` against `config.ts:112-121`; the artifact's §5 sentence _it is findable, because it sits with the limits already governing the slot that creates the condition_.

**Required property.** A limit that a consumer can only violate through slot X must be reachable from slot X's own published documentation.

### proof-3 — the new coverage exercises one axis, and the coverage record does not say so — **tier C**

**Current behavior.** All four new cases build through `displacement.browser.test.ts`'s `build()`, which hardwires `axis: y()`. The `xy()` call site (`xy.ts:358`) is exercised only by `xy.browser.test.ts`, which passes `space: null` at both call sites. No test drives `xy()` with a non-null projection.

**Why it is a problem.** `tests/COVERAGE.md`'s new section is titled for the mechanism — _the coordinate space a displacement is spent in_ — and none of its four rows records the axis restriction, so a later reader takes the mechanism as covered on both axes. The exposure is small: the projection lives in the sink, not the axis, and both axes reach it by a one-argument pass-through. It is a record defect rather than a behavioral one; D-159/F-210 already established that _xy + layoutAnimation_ is a real composition the package instruments elsewhere.

**Evidence.** `displacement.browser.test.ts:107` (`axis: y()`); `xy.browser.test.ts:158,180` (`space: null`); `tests/COVERAGE.md` § _The coordinate space a displacement is spent in_.

**Required property.** A coverage row states the composition it was taken under, so a composition with no row reports nothing rather than reporting zero — the rule D-159 already wrote for the size instrument.

### proof-4 — the artifact's null-path evidence obligation did not land as stated — **tier C**

**Current behavior.** The subject artifact's closing evidence list asks for _a control at `scale: 1` proving the null path is taken_. What landed asserts the same keyframe and travel as the transformed case; it cannot distinguish `space === null` from a non-null identity projection, and I confirmed it passes unchanged with the projection expression removed.

**Why it is a problem.** Nothing published is wrong — the plan entry and `COVERAGE.md` both restate the case correctly, as a control that _passes either way, which is what a control is for_. The finding is only that the one evidence item the artifact framed as proving something is the one item that proves nothing, and no substitute for it landed. The null branch's selection is currently attested by reading `inheritedSpaceOf`, not by any assertion.

**Evidence.** `displacement-coordinate-space-claude.md` § _Evidence to add_ against `displacement.browser.test.ts` → _should render the same flow travel with no ancestor transform_; falsification run in the worktree, where that case passes with the projection removed.

**Required property.** An evidence item recorded as proving a property either discriminates on that property or is recorded as the control it is.

## Not findings

Checked and dismissed, so a later pass does not re-derive them:

- **`box !== item`.** `box` never reaches the projection; `space` is measured at the visual, which is the item under that configuration. Correct, as the artifact says.
- **A per-row authored `transform` with the default `visual`.** `inheritedSpaceOf` excludes the visual's own transform, and `visual === item`, so the row's own transform is out of the projection on both sides. The existing authored-`transform` and authored-`translate` cases pass unchanged.
- **Rows in per-item wrappers.** The placeholder is inserted with `item.after()` / `item.before()`, so items are siblings; siblings share an ancestry, and one projection serves all of them.
- **Ancestor `zoom`.** box-quad folds an ancestor's zoom into `ancestorMatrix`, so the projection divides it back out; the axis reports the zoomed viewport distance. Consistent.
- **A singular or non-finite ancestry.** `inheritedSpaceOf` returns `null`, so the sink writes the viewport vector unprojected. Nothing is visible in a singular space; this is D-85's existing published behavior, not something the change introduced.
- **`DisplacementReport`'s new required parameter.** A source-level break for a third-party axis, recorded in the D-162 amendment. The package is private and pre-release; no finding.
- **Scope creep at the F-225 boundary.** None. F-225 stays open, the limit is published rather than absorbed, and the excluded case is asserted as failing. The defect above is under-coverage of that boundary, not over-reach past it.