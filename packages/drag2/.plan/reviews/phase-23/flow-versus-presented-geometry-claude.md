# Flow geometry against presented geometry

Phase 23, blocking amendment to D-156 and D-157. The implementation pass found that the linear displacement constant is derived from a cross-element difference of `getBoundingClientRect()` values and therefore carries a destination row's **authored** presentation. The finding is correct, it generalises further than the constant, and it falsifies two named results. Both decisions are amended explicitly here rather than excepted.

**Scope note.** The implementation WIP was read as evidence. No production file was changed by this pass.

## 1. The defect, confirmed

`linear-shift.ts` derives

```
d = values[from * STRIDE + start] - hole[start]
```

Both operands come from `getBoundingClientRect()`. `tests/sortable/displacement.browser.test.ts` — _should compose with an authored translate value_ — authors `translate: 0 7px` on the reference row and expects `0px 47px` while displaced: **7 authored plus a 40 px inversion, added rather than replacing**. The derivation returns `40 + 7 = 47` as the constant, so the additive contribution becomes `7 + 47 = 54`. Exactly as reported.

The test is the specification. `47` is `7 + 40`, and the `40` is what the library owes.

## 2. The lemma, which is the whole boundary

Let `P_e(t)` be element `e`'s **presented** position — what `getBoundingClientRect()` reports — and `F_e(t)` its **flow** position, the border box as laid out, ignoring its own transform chain. Write `a_e` for the authored contribution, so `P_e(t) = F_e(t) + a_e`.

- **Same element, two instants:** `P_e(t2) - P_e(t1) = F_e(t2) - F_e(t1)`. **`a_e` cancels.**
- **Two elements, one instant:** `P_e(t) - P_f(t) = F_e(t) - F_f(t) + (a_e - a_f)`. **`a_e` does not cancel.**

> **G5 — the derivation rule.** A prediction may consume only a **same-element temporal difference** of presented geometry. A difference between two _different_ elements' presented geometry is not a flow quantity and must not drive a prediction.

One line, provable, and it decides every case below. The prediction was never wrong about _flow_; it read flow off a representation that does not hold it.

## 3. G1 splits, and the new clause is weaker than it sounds

- **G1-flow** — `box(item)`'s **flow** geometry is size-invariant under its position. This is G1 as written, now saying which geometry it means.
- **G1-presented** _(new)_ — authored presentation on a destination row is **invariant across a committed move**: it travels with the element rather than changing because of where the element landed.

G1-presented is what makes the model sound at all, because it is what lets a prediction maintain a cache of **presented** values using **flow** deltas. It does **not** forbid authored transforms — it forbids them _changing because of the move_, which is the same shape G1 already has. Every case in the existing displacement suite — an authored `rotate`, an authored `translate`, a concurrent consumer animation on `translate`, one on `transform` — satisfies it. **The supported composition boundary is unchanged.**

## 4. The representation stays presented, and that is a decision with a reason

The owner's invitation to consider a richer rebuild-time representation is taken up and **declined for absolute positions**. A flow-geometry cache would need an exact, cheap, transform-free absolute read, and the platform offers none:

- `offsetTop`/`offsetLeft` are transform-free but **integer-rounded**, so a cache maintained from them drifts by up to a pixel per move and the equivalence instrument would reject it — correctly;
- composing `translate`, `rotate`, `scale` and `transform` from computed style is a parser, is fragile across the used-value chain, and **sees only the element's own contribution**, never an ancestor's.

So the cache continues to hold presented geometry — which is also what the axis _rule_ needs, since hysteresis is judged against the pointer over what the user sees. What changes is not the representation but **which differences may drive a prediction**.

## 5. Linear: the constant is measured, not derived

Under G5 the constant is a flow quantity, so it must be observed as **one element's displacement across a committed move**. That is precisely what `verified-refresh` did, and its module comment gave the principle: _measured, never modelled, which is what keeps margins, `gap` and box-sizing out of this module entirely_. It keeps authored presentation out too. **The comment's constraint was broader than the reason it gave, and both D-156 and D-157 overrode it.**

- **The first committed move after the constant becomes unknown is measured.** Write, then read one crossed row's new presented position; the constant is the signed difference against the cache's own value for that row. The plan for that move comes from the same reading — a true inversion for one move.
- **Every subsequent committed move is predicted with no DOM read.**
- **The constant is discarded by `invalidate()`**, so it is re-measured on the next committed move after a scroll, resize, zoom or collection change. Widening `invalidate()` to carry a reason is refused: the existing design deliberately has one flag with no reason, and during an autoscroll the cache is being fully rebuilt every frame anyway, so the marginal cost is one row read on top of a full scan.

**F-197 is falsified.** The `cache[g].top - hole.top` derivation is the forbidden form, and so is the end-gap variant. The two-slot fallback D-157 removed on its strength returns as the ordinary path: the constant is always measured, once.

## 6. Cellular: the same defect, and it is not repairable the same way

`xy()`'s rotation sets `target(i)` to the position **another element** currently holds. That is the forbidden form, and it is worse than the linear case in two ways: the error is per-element rather than one scalar, and it **does not cancel** anywhere.

It is also not repairable by one measurement. The linear rule needs one scalar; the cellular rule needs `count + 1` cell positions, and same-element temporal differences across a move yield only _adjacent cell differences within the span just crossed_ — the ones already behind the hole, never the ones ahead of it.

**So `xy()` does not predict.** It keeps a **measured** post-write rebuild and produces its plan from the warm cache against that rebuild. That is still better than today: the "before" values come from the cache the axis already holds rather than from a second list-wide measurement in a `beforeMove` hook.

## 7. Nothing is ever released, and the sink is what makes that possible

A measured rebuild must yield settled geometry, and once offsets are never released there is no window in which nothing is applied. D-157 left that as a coverage gap (F-200); it is now load-bearing for `xy()` on every committed move, so it must be solved rather than noted.

**The sink knows exactly what it applied.** It publishes

```
contribution(element: HTMLElement, out: PointCache): void
```

— the total remaining offset it currently holds for that element, computed from its own animation with `getComputedTiming()` and **no layout read**. `RectIndex.refresh` subtracts it per candidate, so a measured rebuild yields settled geometry **while animations run**.

This removes a concept rather than adding one:

- the **release-and-replay discipline** goes, for both axes;
- the **settled window** stops being a thing the design needs, so **F-200 dissolves** — the `DEV` equivalence instrument runs in every composition, including one that animates;
- retargeting stays exact on the cellular path, where a settle-then-measure would have lost the in-flight residual and popped.

It costs one call per candidate per **rebuild**, and only when a displacement feature is installed — a null slot otherwise. On the cellular path that sits beside a `getBoundingClientRect()` that already dominates it; on the linear path rebuilds are rare by construction.

**One D-157 detail walks back.** Answering `contribution` per element needs a per-element record, so the `Set<Animation>` becomes a `Map<HTMLElement, …>` holding the animation and the offset it was issued for, and a retarget **folds** — cancel, then start from `residual + newDelta` — rather than stacking. Folding reaches the same continuity deterministically, caps concurrent animations at one per element, and is what makes `contribution` answerable at all. **F-198's property is not falsified**; its mechanism becomes the fold.

## 8. The seam

The member that already exists carries the measured half, and one member is added for the predicted half. Both return a plan.

- **`project(frame, runtime): DisplacementPlan | null`** — pre-write. Returns a plan, or **`null` meaning "I could not predict; measure me"**. Filled by the linear axes; absent on `xy()`.
- **`measure(frame, runtime): DisplacementPlan`** — post-write, measured. Filled by `xy()` always, and by the linear axes for the constant-establishing move.

The behavior calls `measure` **only** when `project` returned `null` or is absent, so the predicted path pays one call and one null test and reads nothing.

## 9. The landing tail is a different shape, and this establishes it rather than assuming it

D-155's tail animates `from - target`, where `from = rendered` and `target = anchor - originRect`.

- **`rendered`** is the value the kernel itself last wrote to the session. It is library-computed and is **not a measurement of any element**.
- **`anchor`** is the **placeholder's** presented rect, measured in `anchorTarget`.
- **`originRect`** is the **visual's** presented rect, measured once at activation.

So the tail's operands are not two destination rows, and the row-versus-hole form that broke the linear constant does not appear. What does appear is the dragged item's own authored contribution, through `originRect` — and **it enters identically with or without a tail**: the kernel pins to the same `target` whether or not a runner was installed, so a dragged item carrying an authored `translate` already lands on `anchor` and then presents at `anchor + a_item` once the style lease is restored.

**Therefore D-155 is not falsified and the tail introduces nothing.** Any discrepancy here is a property of the lift's origin basis and the pin, is present on `main`, and belongs to the landing-space area rather than to this model (F-203).

**The decisive experiment is named rather than guessed**, because it turns on whether `@ydinjs/box-quad`'s `coordinates` folds the element's **own** `translate`/`rotate`/`scale` into the matrix `LIFT_FAITHFUL` writes — `UA_PROPS` neutralises `transform` and `transform-origin` but **not** those three, so if it does, the lifted visual applies them twice. One case in `tests/sortable/landing-space.browser.test.ts`: author `translate: 0 7px` on the dragged item, activate, and assert the lifted visual's rect against the item's pre-lift rect. **Do not fold it into this work.**

## 10. What the hot-path claim now says

Stated precisely, because the old sentence is no longer true:

- **A warm spatial frame reads nothing.** Unchanged, and it is the read that dominated — it was once per frame (F-195).
- **A committed move on a linear axis reads nothing, once the constant is established** — one row read per operation, and one more after each invalidation.
- **A committed move on `xy()` performs its measured rebuild**, as today, minus the second list-wide measurement `beforeMove` used to make.

The zero-read test stays and its assertion narrows to what is true: zero across a committed move on `y()` after the establishing move, and zero on every warm frame in every composition.

## 11. Continuation handoff

1. **Contract first.** Split G1; add G5. State both, with the axis's own instantiation, in the axis factories' published JSDoc — §1.2 requires it, and §1.1 deletes runtime guards on the strength of those sentences existing.
2. **`linear-shift.ts`** — delete the derived constant and both its forms. Add the establishing measurement: post-write, one crossed row, plan from the same reading. Keep `project` returning `null` until the constant exists.
3. **`rect-index.ts`** — subtract the sink's contribution per candidate when one is installed. The `hole` slot never has one.
4. **`xy.ts`** — no prediction. Fill `measure`; produce the plan from the warm cache against the rebuild.
5. **`layout-animation.ts`** — `Map` rather than `Set`; fold on retarget; publish `contribution`.
6. **`slots.ts` / `assemble.ts` / `spec.ts`** — add `projectInsertion` beside `measureInsertion`, both plan-returning; add the `contribution` slot; call `measure` only when `project` yields `null` or is absent.
7. **Tests** — the authored-`translate` and authored-`rotate` cases are the acceptance criteria and must pass **unchanged**. Add: the constant survives an authored offset on the reference row; `xy()` displacement with an authored offset; the establishing move animates like any other; the `DEV` instrument runs with animations in flight.
8. **Do not** touch the landing-space question in §9.

## 12. Two instrument results from the WIP, unrelated to the geometry question

Both are the implementation's to clear and neither is a design matter.

**Nine source comments carry review bookkeeping.** `tests/references.node.test.ts` — _should carry no history in a comment_ — reports `linear-shift.ts:196,211`, `rect-index.ts:46,164`, `runtime.ts:45`, `slots.ts:107`, `xy.ts:143,235` and `y.ts:146`. `CONTRIBUTING.md` Part I is explicit that a comment carries no `D-*`, `F-*` or `I-*`; the reason each one names is worth keeping, the pointer is not. **`argue for what is, never about what was.**

**One index citation is stale only against the staged rename.** `00-index.md` line 565 — D-102's retirement note — names `src/sortable/verified-refresh.ts`, which resolves against `HEAD` and not against the working tree. It is **deliberately left alone**: this pass commits documents only, so repointing it now would make the committed record disagree with the committed tree. **It belongs to the rename's own commit**, together with any other citation the rename invalidates.

The two witnesses in the deferred registry were repointed, because the WIP had already consumed the anchors D-156 and D-157 were written against. They now name what this amendment still requires be removed: the derived constant in `linear-shift.ts`, and `slots.ts`'s `displaces` flag, whose reason dissolves with F-200.