# Ordinary sortable displacement under a stable-slot premise

Phase 23, architecture pass. Asked: if the supported layout model for `x()`, `y()` and `xy()` is a **permutation of stable, interchangeable geometry**, is the current `measure → release → mutate → rebuild → measure → FLIP` model more general than those three rules require? Evaluate rather than assume; reject if a real invariant disproves it.

Sources read: [`rect-index.ts`](../../src/sortable/rect-index.ts), [`verified-refresh.ts`](../../src/sortable/verified-refresh.ts), [`y.ts`](../../src/sortable/y.ts), [`xy.ts`](../../src/sortable/xy.ts), [`layout-animation.ts`](../../src/sortable/layout-animation.ts), [`placement.ts`](../../src/sortable/placement.ts), [`slots.ts`](../../src/sortable/slots.ts), [`domain.ts`](../../src/sortable/domain.ts), and the spatial and release seams in [`spec.ts`](../../src/sortable/spec.ts). Size figures are a `just size` run on this branch; forced-layout figures are from [`trace-execution-topology-claude.md`](trace-execution-topology-claude.md).

**Verdict in one line.** The predictive half of the proposal is not merely viable — **every target position an ordinary sortable move produces is already in the packed cache, one index away, and needs no measurement at all.** The lagging-placeholder half is rejected: it enlarges the library's presentation claim rather than shrinking it, in the direction D-155 just spent a decision narrowing.

## 1. The smallest honest geometry contract common to `x()`, `y()` and `xy()`

The premise has to be stated as something an implementation can rely on and a reviewer can falsify. Four clauses, and the third is the one that does the work.

- **G1 — box rigidity.** For the duration of one operation, `box(item)`'s rect is invariant in size under the item's position in the collection. Different items may differ; one item may not change because of where it lands.
- **G2 — order rigidity of the destination view.** The destination view — the collection minus the dragged item — holds a **fixed relative order for the whole operation**. This is not a premise being introduced; it is a fact of the existing design. A sortable operation moves exactly one item, so the other `n − 1` never change places among themselves. Every committed move relocates **one hole**.
- **G3 — slot rigidity.** The sequence of _positions_ the flow offers is a property of the container and the multiset of boxes, not of which box occupies which position. Formally: there is a position sequence `cell(0..n−1)` such that with the hole at gap `g`, the item at destination slot `i` is rendered at `cell(i)` for `i < g` and `cell(i + 1)` for `i ≥ g`.
- **G4 — one item, one slot.** `box(item)` contributes exactly one contiguous cell to the flow. A `display: contents` wrapper whose box is a single descendant satisfies this; one whose children are two independent flow participants does not.

**G3 is the whole premise, and it is deliberately _not_ stated in pixels.** The tempting form — _the crossed rows all translate by a common δ_ — is true for `y()` and `x()` and **false for `xy()`**, where an item at the end of a line wraps to the start of the next and travels by `(−lineWidth + stride, +lineHeight)`. Stated as slot occupancy instead, one sentence covers all three rules and names no coordinate. That is what makes it the _common_ contract rather than the vertical one generalised.

G3 excludes exactly the list the owner question excludes — masonry and repacking, positional CSS that sizes by `:nth-child`, layouts where moving one item resizes another, collapsing-margin tricks — and it excludes them **as consequences of one clause** rather than as an enumeration. It permits everything the question wanted permitted: unequal item sizes, `box !== item`, `display: contents`, per-item margins (a margin travels with its item and is part of its cell).

**Where the premise is narrower than its wording, and this needs saying.** For `xy()`, "different item sizes are fine" and G3 are in tension. In a _wrapping_ flow with non-uniform boxes, moving the hole changes where lines break, so `cell(k)` depends on the occupants and G3 fails. `xy()` therefore holds the contract only under **occupant-independent cell geometry**: a fixed grid template, `grid-auto-rows` at a fixed size, equal-basis flex items. A card grid whose row height is the max of that row's cards is _precisely_ "moving one item causes unrelated items to acquire different shapes", and is out — but it is a common enough shape that the exclusion must be published rather than left implied.

## 2. What the current model promises, and two places its shape already outruns it

The model in the tree is more general than `x()/y()/xy()` require — and it is also, in two places, **less correct than its generality implies**. Both matter, because the second is the owner's own argument in a stronger form.

**2.1 It already declines to model, on purpose.** `verified-refresh.ts` proposes a span and then **measures** δ rather than deriving it, and says why: _measured, never modelled, which is what keeps margins, `gap` and box-sizing out of this module entirely._ That is a correct instinct about a δ formulated in pixels. §3 shows the instinct does not apply to a δ formulated in slots, because there is no δ.

**2.2 `layoutAnimation()` composed with `xy()` animates one component of a two-dimensional displacement.** [`layout-animation.ts`](../../src/sortable/layout-animation.ts) records `element.getBoundingClientRect().top` and animates `translate: 0 ${delta}px`. Its `collect` walks `nextElementSibling`/`previousElementSibling`, which is a contiguous-flow assumption. Nothing forbids `sortable(…, xy(), layoutAnimation())`, and no contract document states the restriction. An item that wraps to another line animates vertically and **jumps horizontally**. So the feature is not a general layout-animation engine that we would be giving up; it is a vertical displacement animator with no guard (F-191).

**2.3 The fast path refuses the documented `box` use case.** `verified-refresh`'s licence includes `!getBox` — _the only shape in which every candidate is its own box and sits in the list's own flow_. So a `display: contents` wrapper composition, which the owner premise explicitly wants supported, pays a full O(n) rebuild plus a forced layout on **every** committed move. The slot model has no equivalent reason to refuse, because it never assumes the box is the flow participant — only that the box moves rigidly with it (F-192).

## 3. The derivation: every target position is already in the cache, one index away

`insertionAt` fixes the index algebra: gap `g` means the placeholder sits between `destination[g − 1]` and `destination[g]`. `RectIndex` is indexed by destination slot and holds, at slot `j`, the rect of the item currently occupying it.

Write `cache[j]` for that rect and `P(j, g)` for slot `j`'s rendered position with the hole at `g`. G3 says `P(j, g) = cell(j)` for `j < g` and `cell(j + 1)` for `j ≥ g`. The placeholder itself occupies `cell(g)`.

For a committed move `A → B` with `B > A`, the affected span is `[A, B)`, and item `i` in it goes from `cell(i + 1)` to `cell(i)`. Substituting:

| Quantity needed | Where it already is |
| --- | --- |
| target of item `A` | `cell(A)` = **the placeholder's current rect** |
| target of item `i`, `A < i < B` | `cell(i)` = `cache[i − 1]` |
| target of the placeholder | `cell(B)` = `cache[B − 1]` |
| FLIP delta for item `i` | `cache[i − 1] − cache[i]`, or `placeholderRect − cache[A]` for `i = A` |

A backward move `B < A` is the mirror: item `i` in `[B, A)` goes to `cell(i + 1)`, which is `cache[i + 1]` except at `i = A − 1`, where it is the placeholder's current rect; the placeholder goes to `cache[B]`.

**Three consequences, and none of them needs a measurement.**

1. **Every FLIP delta is a difference of two rects the cache already holds** — available _before_ the DOM write, as a vector, in both coordinates.
2. **The post-move cache is the pre-move cache rotated by one through the span**, with the vacated end filled by the placeholder's pre-move rect. `values` rotates; `items` does not, because destination order is fixed by G2. That is the same write `verified-refresh`'s `shift` performs today, with the δ deleted and the correctness no longer conditional.
3. **The placeholder's own position is derivable**, so the per-frame `centreOf(placeholder)` / `getBoundingClientRect()` in both axis rules — one forced layout on **every spatial frame, warm cache included** — has a source that is not the DOM.

Nothing in this derivation names a coordinate, a margin, a `gap` or a box-sizing mode. It is the same arithmetic for `y()`, a future `x()` and an `xy()` that satisfies G3. The reason it works is not that flow was modelled successfully — it is that **the cache was already the model**, indexed by slot, and only ever read as though it were indexed by element.

## 4. What this eliminates, and what it does not

**Eliminated:**

- the `beforeMove` measurement pass — the deltas are known before the write;
- the `afterMove` measurement pass — the targets are known before the write;
- the **release-all-offsets-then-rebuild** discipline, which exists solely so the eager rebuild reads settled presentation geometry. Nothing reads. The single most intricate ordering rule in the sortable tier is a consequence of measuring, not of sorting;
- δ, and with it `verified-refresh`'s witness arithmetic in its present form;
- the per-frame placeholder read;
- the _interrupted-displacement_ problem. Today an in-flight offset must be released and replayed because it would corrupt a measurement. With no measurement, an additive `translate` per move that decays to zero simply **sums**: `n` concurrent additive animations converge to the correct position with no cancellation at all. Folding them into one per element is still available and still needs no layout — `getComputedTiming().progress` gives the remaining contribution.

**Not eliminated:** the packed cache, the axis rules, the hysteresis, `placeholderAt`'s early return, the invalidation channel, the terminal barriers. This is a change to _how the cache is maintained_, not to what it is or who owns it.

**And note what the bracket becomes.** Compute deltas from the cache, write the placeholder, rotate the cache, start the animations — **one DOM write and zero DOM reads per committed move**, in place of a pipeline whose ordering carries three barriers and a `finally`.

## 5. What still genuinely requires the browser

Honest list, because the model's value depends on it being short.

1. **The initial build**, after the placeholder is inserted at activation. The item is lifted out of flow and a differently-margined element takes its place; nothing predicts that transition. Unavoidable, and already paid once.
2. **Every existing invalidation**: scroll, resize, zoom, collection republication, consumer DOM mutation. These are exactly the events G3 does not cover, and the channel for them already exists and is already lazy.
3. **The final resolve at release** — see §6, where it turns out to be the containment argument rather than a cost.
4. **A resync**, if one is kept — §8.
5. **Nothing else.** In particular, not the future DOM. The question _what will the layout be after this move_ is answered by G3 without materialising anything, which is the substantive finding of this pass.

## 6. Semantic correctness versus animation continuity

These separate cleanly, and the separation is what makes the predictive model admissible rather than merely cheap.

**The semantic result is already measured, never predicted, and always will be.** `ReorderProposal` is built exactly once per operation, after motion closes. The release path calls `settleDisplacement`, then `invalidateInSeam()`, then `resolveInsertion` — an unconditional full rebuild against settled geometry. Mid-drag insertions fire no consumer callback; they position a placeholder and nothing else.

So a cache that has drifted from the DOM — because a consumer violated G3 — costs **an intermediate gap proposal and a wrong-looking animation**, and cannot reach `onReorder`, `ReorderRequest`, or the committed order. That containment property exists today, is not created by this change, and has never been written down (F-193). It is the reason a predictive model is a _presentation_ risk rather than a _correctness_ risk, and it is why the answer to "what if the premise is violated" is bounded rather than open.

Animation continuity under external invalidation is a different matter and degrades gracefully: an invalidation forces a rebuild, the next move's deltas are computed against fresh geometry, and the in-flight additive animations converge to zero from wherever they are. The transit is wrong for one interval; the destination is not.

## 7. The lagging placeholder — rejected

The proposal bundles two claims. The first (targets are derivable without materialising the future DOM) is established. The second — _semantic insertion advances immediately while physical placeholder position may lag_ — should be rejected, and not for implementation difficulty.

**It enlarges the library's presentation claim rather than shrinking it.** If the placeholder does not move, the rows do not move either, so "CSS interpolates toward targets" means the library must hold a `translate` on every displaced row **for the remainder of the operation** — a persistent, whole-drag, per-row claim on consumer elements. Today's claim is a 160 ms decaying contribution per move. D-155 was decided in the opposite direction: hold less, hold it shorter, hold nothing that needs releasing. A lagging placeholder is that argument run backwards.

**Three further costs, each independent of the first.** A DOM that lags the semantic state for the whole drag is _observable_ — `:nth-child` styling, a consumer `MutationObserver`, assistive technology walking the tree — where today the tree is continuously truthful between frames. Every external invalidation must now reconcile persistent offsets against a tree that never moved, instead of against a settled one. And the terminal becomes a synchronised release of `n` offsets against a single large placeholder jump, where today release moves a placeholder that is already almost right.

**What it buys is already bought.** The reason to defer the write was to avoid a measurement bracket around it. §3 removes the bracket while keeping the write. So the recommended shape is: **move the placeholder immediately as today; predict everything; measure nothing.** The DOM stays honest, and the bracket disappears anyway.

## 8. The witness problem, which is the real cost

This is where the model actually spends something, and it should not be buried.

`verified-refresh` is fail-safe by construction: four reads test the hypothesis, any refutation falls through to a full rebuild in the same window, a `DEV` equivalence instrument holds the buffer to a full scan on every suite run, and `RESYNC_INTERVAL = 8` bounds drift the witnesses cannot see. A fully predictive cache **has no per-move witness**, and the obvious fix is self-defeating: every witness is a forced layout, which is the cost the model exists to remove.

Three positions, and the third is the recommendation.

- **Verify every move.** Keeps today's safety, keeps today's forced layout, discards the runtime win and keeps only the bundle win. Not worth it.
- **Verify never.** Cheapest, and the shipped build then has no self-correction of any kind, because `resolve` no longer reads geometry either. Under §6 the blast radius is presentational and the terminal is measured — but a consumer whose layout violates G3 gets a silently wrong drag with no diagnostic, which `CODE_OF_SIZE.md` §1.1 asks a question about.
- **Predict always; resync on the existing schedule; verify equivalence in `DEV`.** Keep `RESYNC_INTERVAL`'s shape: a full measured rebuild every `k` committed moves, which is an amortised `1/k` of today's forced layouts rather than none, and self-corrects within `k` moves. Keep the `DEV` equivalence instrument — it already exists, it is already free in the published bundle, and under this model it becomes a **direct test of G3**, which is a better thing for it to test than a δ hypothesis. This preserves the package's established discipline instead of trading it for bytes, and the per-frame placeholder read — the larger runtime cost — goes regardless.

**One thing that does not survive and should be said plainly**: the four-witness apparatus and its two in-span witnesses are not portable to the slot model. They test a scalar uniform translation, which is `y()`-only and is exactly the formulation §1 rejected as the common contract. The idea worth keeping is the resync interval and the equivalence instrument, not the witnesses (F-194).

## 9. `xy()`, where the premise and the model collide

Stated once more because it is the only place the proposal is genuinely narrower than it sounds. `y()` and a future `x()` satisfy G3 for any list of differently-sized items in a non-wrapping flow — the common case, and the strongest form of the result. `xy()` satisfies G3 only under occupant-independent cell geometry. Outside that, an `xy()` composition needs the measured path, which is the _existing_ path, so the fallback is not new machinery.

That is a clean architectural split and it matches the stated product goal: the predictive model is the 80% case, and a general animated-layout-mutation behavior — should one ever be wanted — is a separate, heavier capability that measures, and does not tax the ordinary list.

## 10. Evidence

**Size** (`just size`, this branch, Brotli): `minimal` 9.91 kB, `minimal (xy)` 9.58 kB, `minimal + layoutAnimation` 10.35 kB, `complete` 10.60 kB.

- `layoutAnimation()` costs **≈ 440 B**, of which the FLIP bracket, the `tops`/`affected` buffers, `collect`'s sibling walk and the release-and-replay discipline are the substance. A predictive displacement plugin has no measurement pass, no `tops` buffer, and no release phase.
- `minimal (xy)` is **330 B smaller than `minimal (y)`** despite carrying a squared-Euclidean metric and a `compareDocumentPosition`. The difference is `verified-refresh.ts` — a whole module, 632 lines, whose purpose is to avoid a rebuild the slot model makes free and exact.
- The bracket structure that remains in `minimal` with both pipelines empty is **≈ 387 B** across three modules ([`trace-execution-topology-claude.md`](trace-execution-topology-claude.md) §4.2, and the same object as [`size-ownership-audit-claude.md`](size-ownership-audit-claude.md) B-3). Under a predictive model there is no `beforeMove`/`afterMove` seam to leave behind.

Roughly **0.8–1.1 kB against a 9.91 kB floor** is in scope, and — the part that matters more — it is concentrated in the two modules whose entire reason for existing is that the future layout was assumed unknowable.

**Forced layout.** `Layout` events per animation frame: **18/36 in `minimal`, 44/44 in `complete`**; `UpdateLayoutTree` 55 vs 133 (F-182). The mechanism is `centreOf`'s single unchanged `getBoundingClientRect` in the axis resolve, forced to a real layout because `layoutAnimation`'s animations keep it dirty. **The predictive model removes the read, not the dirtiness** — which is the correct place to fix it, because the dirtiness is what an animation _is_. This is the largest single item in the pass and it is a runtime result, not a byte one (F-195).

## 11. The decision

**Adopt G1–G4 as the published geometry contract for `x()`, `y()` and `xy()`**, with `xy()` additionally requiring occupant-independent cell geometry. **Adopt the slot-rotation model**: derive every target and every delta from the packed cache and the placeholder's current rect, maintain the cache by rotation, and derive the placeholder's position rather than reading it. **Keep the immediate placeholder write; reject the lagging placeholder.** **Keep a resync interval and the `DEV` equivalence instrument**, repointed at G3; retire the four-witness δ apparatus with the δ.

The consequence for the two features is asymmetric, which answers the question the owner asked about them separately. **`layoutAnimation()` stops being a geometry feature** — it holds no measurement, no bracket and no released state, and becomes what its name says: duration, easing, and an additive `translate` per affected row per move, over deltas the library computed anyway. Whether it remains a separate composable at that size is a question for the implementation pass, not a premise. **The axis rules keep their geometry ownership entirely**; they simply stop asking the DOM a question they can already answer.

What is _not_ decided here: whether the resulting displacement is still worth a plugin seam or folds into the axis; the exact resync policy; and whether `x()` ships. Those need the shape in the tree first.

## 12. Findings

- **F-191** — `layoutAnimation()` with `xy()` animates only the vertical component; no guard, no documented restriction.
- **F-192** — the incremental path refuses `box` compositions, so the documented `display: contents` case pays the full rebuild on every move.
- **F-193** — the committed semantic result is measured, never predicted, and that containment was never written down.
- **F-194** — the witness apparatus does not survive the generalisation; the resync interval and the equivalence instrument do.
- **F-195** — one forced layout per spatial frame on a warm cache, from a read that is derivable.