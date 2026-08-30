# Displacement ownership: who pays for the machinery a composition never runs

The predictive model landed and made the animating compositions slightly cheaper and the non-animating ones markedly dearer. This asks whether that is a price of the result or a misplacement of it, prices four candidates separately, and settles one ownership boundary.

Architecture and contract only. Nothing here was implemented; every figure below came from an ablation applied to a clean tree, built, measured and reverted, and the baseline reproduces byte-exact afterwards.

## 1 — The regression is a misallocation, and it is the whole of it

Exact Brotli bytes, `bench/size/measure.ts`, parent `0beb9900` against the landed `63922766`:

| Composition                          | parent | landed |        Δ |
| ------------------------------------ | -----: | -----: | -------: |
| minimal                              |   9913 |  10032 | **+119** |
| minimal (xy)                         |   9580 |   9809 | **+229** |
| minimal + layoutAnimation            |  10353 |  10340 |      −13 |
| minimal + landing                    |  10178 |  10285 |     +107 |
| complete                             |  10595 |  10570 |      −25 |
| both behaviors                       |  11927 |  11967 |      +40 |
| baseline A                           |  10375 |  10399 |      +24 |
| free drag ×4, `drag.js`, `kernel.js` |      — |      — |    **0** |

**The two compositions that animate got cheaper and the two that do not got dearer.** That is not a feature costing what a feature costs; it is a feature being paid for by consumers who did not compose it, which is the failure §7 names. The six control rows moved by exactly zero bytes across every experiment below, so the instrument is not the story.

`minimal + landing`'s +107 is `minimal`'s +119 seen through an orthogonal feature, not a second effect.

## 2 — The floor, which is the number this pass is really about

Ablation **E** strips every trace of displacement from the graph — no plan, no contribution subtraction, no `project`/`measure` seam, no linear rule — and keeps only the packed cache and the cached placeholder rect. A committed move becomes one write and one `invalidate()`.

| Composition  | parent | landed |    floor | floor − landed |
| ------------ | -----: | -----: | -------: | -------------: |
| minimal      |   9913 |  10032 | **9380** |           −652 |
| minimal (xy) |   9580 |   9809 | **9444** |           −365 |

So a sortable that never animates is carrying **652 B (y) / 365 B (xy)** of machinery for a feature it did not compose — 6.5 % and 3.7 % of its bundle. The +119 / +229 regression is the visible tip of a misallocation that predates this pass: the old model charged the same consumers 533 B / 136 B for its own bracket.

## 3 — The four candidates, priced separately

Each is an independent ablation against the landed tree. **They are ranking instruments and they do not add** (§15): related deletions share tokens, so their parts understate any joint change, and where a deletion also makes the sink's own member dead the animating columns are contaminated. The columns that carry weight are the two minimal ones.

| Ablation | minimal | minimal (xy) | modules |
| --- | --: | --: | --: |
| **A** — cached placeholder geometry removed | −41 | −57 | 0 |
| **B** — displacement-plan production removed | −32 | **−170** | 0 |
| **C** — contribution-aware `RectIndex` removed | −57 | −11 | 0 |
| **D** — shared `project`/`measure`/`displace` protocol | _residual, ≤156_ | _residual, ≤184_ | 0 |
| **G** — the linear rule removed entirely | **−439** | 0 | −1 |
| **H** — the linear rule inlined into `y()` | −43 | 0 | −1 |

**A — cached placeholder geometry: 41–57 B, and the best trade in the pass.** It removes one `getBoundingClientRect()` from **every warm spatial frame**, which is the most frequent event in a drag and the read that dominated the trace. The `minimal (xy)` figure is the honest one — cached hole against a per-resolve read. The `minimal` figure is a different question and is read in §7. **Keep it.** It is also, as the owner suspected, independent of displacement in every direction: no other candidate below changes it.

**B — plan production: 32 B on `y()`, 170 B on `xy()`.** The asymmetry is the finding. For a linear axis the vectors are four numbers already in registers when the span advances, so only the returned closure is chargeable. For the cellular axis the _entire_ `measure` — the `before` buffer, the copy loop, the eager rebuild and the diff visitor — exists for no other purpose. A minimal `xy()` builds a displacement plan on every committed move and hands it to nothing.

**C — contribution-aware `RectIndex`: 57 B / 11 B, and a per-candidate cost in every composition.** A minimal rebuild pays a branch and four `− 0` subtractions per candidate to support a sink that is not installed.

**D — the protocol: a residual, and bounded rather than measured.** It cannot be ablated in isolation: strip the slots and the axis members they call become dead, strip the members and the slots have no producer. Taking the floor and subtracting the separable ablations bounds it at **≤184 B (xy)** and **≤156 B (y)** — an over-attribution by §15's own rule, since the parts understate.

## 4 — Two things the ablations answered that nobody asked

**The module boundary is nearly free, and the parameterisation for `x()` is free.** `createLinearShift` has exactly one call site and five parameters that exist for an axis that does not ship, which reads as a §2.1 and §8 finding. Ablation **H** inlines it into `y()` and specialises the offsets to literals: **43 B**. The prior this repository has been carrying — roughly 150 B for a module to enter a graph — does not hold here; Brotli shares the tokens. So the 439 B of ablation G is **logic, not packaging**, and there is no cheap version of it to find.

**The cellular axis forces a synchronous layout that the ordinary path does not.** `xy().measure` invalidates and rebuilds _inside the same task as the write_, so the rebuild's first `getBoundingClientRect()` flushes layout. The spatial search is coalesced to one per animation frame (`spatialFrame` in `src/sortable/spec.ts`), so the alternative — invalidate, rebuild on the next frame — reads a **clean** tree and forces nothing. When a sink is installed the forced layout is inherent, because the vectors are needed before the animations start. When no sink is installed it is pure loss, and it is loss on top of the 170 B.

## 5 — The constraint that decides the shape

The owner's target — _presentation machinery stays tree-shakable with `layoutAnimation()`_ — meets two facts.

**Reachability is static.** A consumer writes `axis: y()` and `displacement: layoutAnimation()` as two independent imports. No module can be reachable from _both and only both_. Code that must ship whenever animation is composed must live where animation is imported; code that lives in the axis module ships whenever the axis is imported. There is no third place.

**The axis contract is third-party-authorable.** `src/sortable/feature.ts` publishes `AxisContribution` and `InsertionGeometry` and says so: _an axis installer is its only third-party producer_. So the seam cannot be widened into the packed cache, and `RectIndex` cannot become the currency between axis and sink without becoming published vocabulary that every third-party axis must implement — §12, and not recoverable later.

**Together these refute the strong form of the split.** _Move all displacement code behind `layoutAnimation()`_ is unreachable while the prediction is kept, because the prediction is axis knowledge and the axis module is in the minimal graph. Every arrangement that gets the linear rule out of `y.js` either leaks it into an `xy()`-plus-animation composition — the same §7 sin pointing the other way — or adds a third thing the consumer composes, which buys 400 B by making a common case more awkward, which §12 forbids in terms.

**What is reachable is the weaker and more useful form**: nothing that exists _because_ something animates may live in the axis, and nothing may be _constructed_ for a sink that is not there.

## 6 — The rule

> Ask of every piece: **would this code exist if nothing animated?** If no, it belongs to the displacement feature, or to a branch the displacement feature switches on. If yes, it belongs to the axis.

Applied:

| Piece | Would it exist? | Owner |
| --- | --- | --- |
| packed cache, measured rebuild | yes | axis |
| the placeholder rect, cached | yes — the search needs it every frame | axis |
| linear span advance and its constant | yes — the cache must survive a move | axis |
| plan closures, `DisplacementPlan` | no | sink |
| `before` snapshot, eager rebuild, diff | no — a non-animating `xy()` invalidates | sink-gated |
| contribution subtraction | no | sink |
| `project` / `measure` as two slots | no | deleted |

## 7 — The settled shape

**One post-write hook replaces the two-slot protocol.**

```ts
type DisplacementReport = (element: HTMLElement, dx: number, dy: number) => void;

moved(
  frame: InsertionFrameView,
  runtime: InsertionRuntimeView,
  report: DisplacementReport | null,
): void;
```

- **Called once, after the write.** The projection had no reason to precede it: advancing a cache arithmetically does not depend on the DOM, and `displace` already ran after the write. Collapsing them deletes one slot, one seam wrapper call, one null test, and the two-instant reasoning the `stale` flag carries. The `DEV` equivalence instrument keeps the same relationship — it checks the previous claim at the head of the next call.
- **The visitor is passed in, not returned.** `DisplacementPlan` is deleted. `y()` calls `report` inside the span walk it already runs; `xy()` takes `if (!report) { index.invalidate(); return; }` as its first line. **No composition allocates anything per committed move**, where today every one of them allocates a closure.
- **`xy()`'s measured diff stays in `xy.js` and stops executing.** The 170 B is an accepted, measured residual: recovering it costs either a public API change (§12) or leaking the cellular differ into every animating composition (§7). The forced synchronous layout of §4 goes with the branch, which is the part that mattered.

**The sink settles the buffer; the cache does not ask per candidate.** `RectIndex.refresh` loses the `contribution` parameter and the per-candidate subtraction, and gains one nullable hook called **once per rebuild**: `settle(values, items, count)`. The walk and the map lookups move to `layout-animation.ts`, which is the only party that knows what it is holding. Minimal pays one branch per rebuild instead of one branch and four subtractions per candidate — cheaper in bytes **and** on the rebuild path. The linear rule's one-row establishing read settles a one-slot scratch through the same hook.

**Slot record.** `projectInsertion`, `measureInsertion`, `displace`, `settleDisplacement` and `contribution` — five members, four of them nullable — become `movedInsertion` (required, from the axis) plus `report` and `settle` (both nullable, from the sink).

**`settleDisplacement` is deleted outright**, and not only as a rename. Its stated reason — _without the settle the rebuild measures rows mid-transit_ — was dissolved when the sink began publishing what it holds: the release rebuild already yields settled geometry. What survives of it is a plain `cancel()` on every in-flight contribution at release, which snaps each displaced row from `T + residual` to `T` in one frame. That is precisely the release-and-replay pop the amendment removed, reintroduced at the one instant the user is watching the item land.

## 8 — The one piece that stays, and its price

**The linear rule stays in `y.js`, and it costs `minimal` 439 B.** This is a §0 trade and it is recorded as one rather than absorbed.

_Against keeping it_: 4.4 % of the minimal bundle, for a composition that never consumes a vector. Removing it costs one list-wide `getBoundingClientRect()` sweep per **committed move** — not per frame — on a **clean** tree in the following animation frame, forcing no layout. For a 20-row list that is ~21 cheap reads a handful of times a second.

_For keeping it_: it **is** the mechanism of D-156. Delete it from `y.js` and the prediction is gone from every composition, including the animating one, because there is nowhere else it can be reached from (§5). The alternatives cost either a public API change or a §7 leak. And ablation H says there is no packaging to reclaim: 43 B, not 150.

**Recommendation: keep it, and record the number.** The pass that would revisit this is not a size pass — it is the one that ships `x()`, at which point the same 439 B is amortised across two axes and the module boundary is load-bearing rather than anticipatory.

## 9 — The hole: is six fields wider than necessary?

Yes, and by less than it looks. `resolve` reads only the centres; the linear rule reads and writes `TOP`, `BOTTOM` and `CENTRE_Y`; `LEFT` and `RIGHT` have no reader on either axis today. Narrowing costs one of two things: writing only the centres forces the linear rule to measure the placeholder a **second** time per rebuild, which trades a hot-path win for a rebuild-path loss; giving the hole a stride different from a slot's costs the property that both rules read it with the same offsets.

Ablation A's `minimal` column prices the aggressive end — the shared six-field record replaced by three axis-private scalars, zero-read warm frames intact — at **41 B**. That is a §2 micro-choice, not an ownership one.

**Settled: the hole stays six-field and shared.** Two dead stores per rebuild are a rounding error against a property worth naming — the hole is packed exactly like a slot, which is why one rule can read it with the offsets it already has and a second linear axis needs no new field.

## 10 — What this changes about D-157, and what it does not

**Not reopened**: the geometry contract G1-flow, G1-presented, G2, G4, G5; the measured constant; `xy()` not predicting; zero-read warm frames; the fold on retarget; nothing released so that something can measure.

**Amended**: the two-slot `project`/`measure` seam and the `DisplacementPlan` return become one post-write `moved` taking a visitor; `RectIndex` stops taking a per-candidate probe; the five displacement members of `SortableSlots` become three; `settleDisplacement` is deleted; `layoutAnimation()`'s published `contribution` probe becomes an internal detail of its own settle walk.

## 11 — Evidence the implementer must carry

**Preserve unchanged**: the authored-`translate` and authored-`rotate` composition cases; the zero-read assertions; the G3 conformance fixtures including the negative one; continuity under interruption.

**Add**:

- a minimal-composition case asserting that a committed move on `xy()` performs **no** `getBoundingClientRect()` and no rebuild in the write's own task — today it forces one;
- a case asserting that release does **not** cancel in-flight contributions, and that a row mid-flight at release finishes its travel rather than snapping;
- an allocation case: a committed move constructs no closure and no array in any of the four sortable compositions.

**Measure**: jointly, across all fourteen rows, with `free drag minimal` and `drag.js` as declared controls that must move **zero**. Predicted direction: `minimal` and `minimal (xy)` down by 150–250 B and 200–300 B; `minimal + layoutAnimation` and `complete` **within noise** — the machinery moves rather than disappears there, and a large move on those rows means something was deleted that a sink still needs. Re-base the two minimal budgets only after the result is accepted, never during the pass (§18).

## 12 — Instrument notes

- Every ablation was applied to a clean tree, built, measured, reverted; the restored tree reproduces the baseline **byte-exact** in all fourteen rows, so the pipeline's determinism held across nine builds.
- Six rows — the four free-drag compositions, `drag.js`, `kernel.js`, and `baseline B` — reported exactly 0 for every ablation. They are the declared controls and they behaved.
- `DEV` folds correctly: the measured `minimal` bundle contains no trace of the equivalence instrument. The 439 B of ablation G is shipped logic.
- The `+layoutAnimation` and `complete` columns of ablations B and C are **contaminated** and are not quoted: removing the consumer of a sink member makes that member dead, so those rows credit the ablation with bytes that belong to the sink.