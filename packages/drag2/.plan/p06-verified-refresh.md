# P-06 — the verified incremental refresh

**Status: designed 2026-08-20 (D-100). Not implemented.** This is the Phase 22 architecture handoff for P-06, the first and only candidate this phase opens. It works from D-98's boundary and from M-4′'s evidence, and it takes no measurement: Phase 21 has already given this candidate every number it will get.

**The optimization survives.** It survives in a different shape from D-98's sketch, and the difference is the whole architectural content: **the span is a hypothesis the feature verifies with a constant number of reads, not state it trusts.** That is what makes the fast path locally falsifiable, which is the condition the phase entry set for taking it at all.

---

## What was checked

D-98 asserted that a committed placeholder move changes only the rows between the two gaps. That is q7 answer 1's finding, and the rebuild is the only thing standing on it, so it was checked rather than inherited.

**The claim, stated exactly.** After the placeholder moves from destination gap `A` to gap `B`, with the candidate list `snapshot.items` minus the dragged item, and the placeholder sitting in flow at the gap:

- **(S1)** the rows whose geometry changed are exactly `[min(A,B), max(A,B))`;
- **(S2)** every such row shifted by the same scalar `δ` along the axis;
- **(S3)** no row outside that range changed.

**In a linear, non-wrapping flow with non-collapsing spacing, all three hold**, and for a structural reason rather than an empirical one: a row's flow position is the cumulative sum of the contributions above it, and removing the placeholder's contribution at one gap while adding the identical contribution at another leaves every prefix below `min(A,B)` and every suffix at or above `max(A,B)` with an unchanged cumulative sum. The rows between shift by exactly that contribution.

**Four ways they fail, and all four are real.**

1. **Collapsing margins.** Removing the placeholder at `A` releases one collapsed margin and inserting at `B` consumes a different one. The two contributions are then unequal, the suffix moves, and **(S3)** fails.
2. **Wrapping containers.** A one-slot move is a reflow that changes lines; `δ` is not a scalar and not uniform. Already excluded by D-98 — this is why the fast path is `y()` only.
3. **A `transform` on a single row.** It changes `getBoundingClientRect()` without changing flow, so it moves one row and nothing else. **(S3)** fails in a shape no flow argument predicts.
4. **Scroll anchoring.** Chromium adjusts `scrollTop` when content above the viewport changes — which is precisely what moving a placeholder does — and the compensating `scroll` event is dispatched **after** the bracket has already run. So the geometry can shift under a move without the invalidation that would normally cover it. This is the sharpest of the four, because it is triggered by the library's own action on the exact DOM shape the fast path is for.

**Repeated moves compose, and that is not the hazard.** Each move's `δ` applies to its own span, the packed values stay in the same units, and nothing accumulates that a second move interprets differently — the cache holds absolute viewport scalars, not deltas. **The hazard is drift, and drift does not compose with anything: it simply is not seen.**

**One property makes drift cheaply detectable, and it is the design's load-bearing observation.** In a linear flow, any change to any row's contribution shifts **every subsequent row**. Flow drift is therefore _suffix-shaped_: it is visible at the **last candidate**. Scroll anchoring is visible there too, because it shifts everything. Only case 3 — a transform on one non-witness row — escapes a suffix witness, and case 1 does not escape it either.

---

## The design

**1 — The reason costs nothing, because it is already in the call graph.** D-98 asked for reason-aware invalidation and expected to widen `invalidateInsertion`. That is not needed. `InsertionGeometry.measure` has **exactly one call site**, `src/sortable/spec.ts` inside the committed-move bracket, so _being called at all_ is the signal that a committed move just happened; `invalidate()` without a following `measure()` is everything else. The bracket calls `invalidate()` and then `measure()` as consecutive statements inside one `action.effect`, and the queue is run to completion, so **no scroll or resize can interleave between them** — the pairing rests on an invariant this package already holds rather than on a new one.

**Distinguishing "only the bracket" from "the bracket plus something else" is a count.** The feature increments a counter in `invalidate()` and clears it on any full scan. At `measure()`, **exactly one** pending invalidation means the bracket's own and nothing else; more than one means an external invalidation is also outstanding and the fast path is refused. A scroll that arrived earlier and was already serviced by a `resolve()` has cleared the counter, so it does not poison later moves. This is state derived entirely from calls the feature receives, and a test can falsify it by dispatching a scroll before a move and asserting a full scan.

**2 — The span is a hypothesis, not tracked state.** The destination gap `B` is `Insertion.index`, already computed by the behavior and already written to the per-operation view before the bracket. The previous gap `A` is the feature's own record of the last gap it serviced. **That record is exactly the kind of state D-98 worried about** — it can silently disagree with reality — so it is never trusted. It only proposes a span, and the span is then checked.

**3 — Verification, in a constant number of reads.** With the hypothesised span `[lo, hi)`:

- **the in-span witness**, row `lo`, yields `δ` by differencing its measured rect against its cached one. `δ` is **measured, never modelled** — which is what removes margins, `gap` and box-sizing from the design entirely, and is the part of D-98's one-row idea that survives as mechanism rather than as proof. A `δ` of zero refutes the hypothesis;
- **the after-witness**, row `hi`, must be unchanged;
- **the suffix witness**, row `count − 1`, must be unchanged. This is the one that catches collapsing margins, scroll anchoring and any flow drift originating anywhere in the list;
- **the before-witness**, row `lo − 1`, must be unchanged, when one exists.

**Any refutation falls back to a full rebuild in the same window.** The fallback is not an error path and is not reported: it is the general path, taken for a frame, exactly where it runs today.

**The span reaching the end of the list is a named degradation, not a special case.** When `hi === count` there is no after-witness and no suffix witness outside the span, so the hypothesis cannot be checked and the refresh is full. Dragging to the last slot therefore pays the old cost, and that is accepted rather than worked around.

**4 — The re-sync policy, and the trade it makes explicit.** Verification cannot see case 3. A **full rebuild every `k` committed moves** bounds how long such a drift can persist, and **it also caps the payoff at `k×`**: with the incremental path near zero, average cost is `full / k`. That tension is the policy, and it is stated rather than buried — `k` is not a tuning constant, it is the exchange rate between the drift window and the saving. **`k = 8` is the recommended first landing**: at 800 rows it turns ~3.4 ms into ~0.42 ms while capping unverifiable staleness at eight moves, and it can be raised once the equivalence instrument below has run against real fixtures.

---

## The contract cost

**One additive field on a published view type.** `InsertionRuntimeView` gains the committed `Insertion` — or its `index` — so `measure` can read the destination gap. The behavior's per-operation object **already carries it**: `runtime.ts` declares `insertion: Insertion | null` and the bracket sets it before `measure` is reached. This is the **fifth widening of a consumer-declared view** in the same additive form the previous four took, which `y.ts` already documents as costing no wrapper, no allocation and no import edge back to the runtime.

**Nothing else in the public surface moves.** `invalidateInsertion` keeps its signature, `measure` keeps its signature apart from the widened view, `SortableContribution` is unchanged, and no new subpath or export appears.

**One observable that is not in any contract but is worth naming.** A consumer who overrides `getBoundingClientRect()` on their rows will see **fewer calls per committed move**. Nothing promises a call count, but that population is precisely the one I-36's barriers exist for, and a design that changes how often their code runs should say so rather than let them discover it.

---

## The invariant boundary

The fast path is refused, and the full rebuild runs, unless **all** of these hold:

|  | condition | why |
| --- | --- | --- |
| 1 | the installed axis is **`y()`** | `xy()` wraps; `δ` is not a scalar (D-98) |
| 2 | **`getBox === null`** | the candidate is its own box and is in the list's flow. Any resolver may return an element the flow does not govern — and this is the strict reading of D-98's `box === visual`, since a `visual()` resolver also fills `getBox` |
| 3 | the snapshot **version is unchanged** | membership changed ⇒ the packed order changed. Already enforced by `refresh` |
| 4 | **exactly one** pending invalidation at `measure()` | anything else means an external reason is outstanding |
| 5 | `measure()` was reached with a **non-null insertion** | the reason signal |
| 6 | the span has an **after-witness and a suffix witness** | otherwise the hypothesis is uncheckable |
| 7 | fewer than **`k`** committed moves since the last full scan | the re-sync policy |
| 8 | **all four witnesses agree** with the hypothesis | the verification |

**I-36 is unchanged in kind and smaller in extent.** Each witness read is a consumer-owned element's `getBoundingClientRect()` and therefore a consumer call under C4-01's reading, so a `live()` reading is owed after each — four rather than `n`. The existing `abort()` exit is reused unchanged; the fast path adds no new terminal-barrier shape.

**The eager position is untouched.** This is a smaller rebuild in the same window, between the placeholder write and `afterMove`, for the same correctness reason. Nothing here makes anything lazier, and D-95's exclusion of the eager position from cost-driven re-decision is preserved.

---

## The smallest implementable slice

1. Widen `InsertionRuntimeView` with the committed insertion; the behavior already supplies it.
2. In `RectIndex`: the pending-invalidation counter, the last-serviced gap, the moves-since-full-scan counter, and a `refresh` fast path guarded by the eight conditions above.
3. `y()` opts in. **`xy()` does not, and its call site is left byte-identical**, so a regression has one candidate cause.
4. **The equivalence instrument, and it is the deliverable that makes the rest admissible**: for every fast-path refresh, the packed buffer must equal what a full scan of the same tree would have produced — asserted structurally, on every suite run, not behind the measurement flag. The reproducibility standard already requires an equivalence check for a specialized path measured against a general one; here it is promoted from a measurement precondition to a permanent assertion, because it is the only thing that turns "the span hypothesis held" into something the suite can falsify.
5. Each of the eight conditions gets a negative fixture that drives it individually and asserts a full scan — including a **scroll dispatched between two moves** and a **row transformed mid-drag**.
6. Re-run M-4′'s harness unchanged for the paired before/after. **No new measurement is designed**; the existing one is the instrument.

**Not in the slice, and deliberately:** any change to `xy()`, any change to the stride (P-02's sub-candidate touches the same buffer and must land after this, not beside it), any tuning of `k` beyond the recommended first value, and any attempt to make case 3 detectable.

---

## What would stop this

- **The equivalence instrument fails on a realistic fixture** and the refutation is not one of the eight conditions. That means (S1)–(S3) are wrong in a way this analysis missed, and the candidate ends there rather than growing a ninth condition.
- **`k` has to fall below ~4 to keep drift acceptable.** The saving is `k×`; below that the win no longer justifies the state, and the honest answer is to decline.
- **The witness reads turn out not to be free.** The design assumes four `getBoundingClientRect()` calls cost approximately nothing against `n − 1`. At `n = 50` that ratio is 4:49 and the fast path may be within noise — in which case P-06 is a large-list optimization and should be gated on `count`, or declined for small lists rather than defended at every size.
- **Any of this needs a second public widening.** One additive view field is the budget. A second — a reason argument, a new contribution member, a new slot — means the design has failed to fit the SPI it was supposed to fit, and the trade should be re-argued rather than paid incrementally.