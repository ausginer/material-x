# P-06 — the verified incremental refresh

**Status: designed 2026-08-20 (D-100); implemented 2026-08-21.** This is the Phase 22 architecture handoff for P-06, the first and only candidate this phase opens. It works from D-98's boundary and from M-4′'s evidence, and it takes no measurement: Phase 21 has already given this candidate every number it will get.

**The implementation record is [§What landed](#what-landed) at the foot of this file**, including the measured before/after, the two places the tree differs from the design, and the one contingency in §What would stop this that was measured and did not fire.

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

**4 — The re-sync policy, and the trade it makes explicit.** Verification cannot see case 3. A **full rebuild every `k` committed moves** bounds how long such a drift can persist, and **it also caps the payoff at `k×`**: with the incremental path near zero, average cost is `full / k`. That tension is the policy, and it is stated rather than buried — `k` is not a tuning constant, it is the exchange rate between the drift window and the saving. **`k = 8` is the recommended first landing**: at 800 rows it caps unverifiable staleness at eight moves, and it can be raised once the equivalence instrument below has run against real fixtures.

> **Corrected after the run (D-102).** The paragraph above is right that `k` caps the payoff and wrong about where the cap binds. It assumed a verified move costs approximately nothing, so that `k = 8` would turn ~3.4 ms into ~0.42 ms. **A verified move costs ≈1.0 ms**, because the rebuild's dominant term in the deployed regime is the **forced layout after the placeholder write**, not the per-row reads — P-06 removes the reads and cannot touch the flush. **The binding ceiling is therefore `full / verified` ≈ 3.5×, not `k×`**, and `k` only decides how close the mean gets: `k = 8` measures **2.67×**, 76% of what is achievable, against `k = 16`'s ~12% more and `k = 4`'s ~24% less. **`k` is not the binding constraint, the invitation to raise it is withdrawn, and `k = 8` stays.** The exchange-rate framing survives; the arithmetic under it does not.

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

---

## What landed

**Implemented 2026-08-21**, against the design above and D-100's eight-condition boundary, with no re-decision of the eager window, no change to `xy()`'s call site and no tuning of `k`.

### The tree

| Where | What |
| --- | --- |
| `src/sortable/slots.ts` | `InsertionRuntimeView.insertion: Insertion \| null` — the one additive field, carrying a value `runtime.ts` already holds and the bracket already writes |
| `src/sortable/y.ts` | the same field on the module's own consumer-declared view, and `measure` passing `insertion === null ? -1 : insertion.index` to `refresh`. **That argument is the entire opt-in** |
| `src/sortable/rect-index.ts` | `refresh`'s optional `gap`, the pending-invalidation count, the last-serviced gap, the moves-since-full-scan count, `shift` (the four witnesses and the δ application), `verify` (the equivalence instrument) and `RESYNC_INTERVAL = 8` |
| `src/sortable/xy.ts` | **unchanged** |

`tests/sortable/incremental-refresh.browser.test.ts` is new: the instrument's falsifier and its control, the eight conditions each driven individually, the fallback, and retirement. `tests/perf/m4-prime.browser.test.ts` gained the paired general/verified arms in both regimes.

### The equivalence instrument

It is `__DEV__`-gated, on by default, and runs on **every** fast-path refresh in every suite run — which the mutation table below shows reaches three composed suites, not only its own file. It **heals before it throws**: the scan it performs to compare is the scan the full path would have run, so it writes the authoritative values back and only then reports. A mismatch therefore leaves the cache correct and the drag classified, rather than correct in the message and wrong in the buffer.

**Its falsifier is D-100 case 3**, and that is the point: a `transform` on a single in-span row that is not a witness. Every witness still agrees, `δ` is genuine, the hypothesis is nonetheless false, and nothing but a full comparison can see it. The same fixture without the transform is the control, so the assertion cannot pass by always failing.

**Four mutations of the shipped code, each run against the whole `tests/sortable` suite:**

| Mutation | Caught by |
| --- | --- |
| apply `δ` to `[lo, hi]` instead of `[lo, hi)` | 8 tests in **3 files** — the instrument's own control, and two composed suites (`displacement`, `input-policy`) |
| drop the suffix witness | 4 tests |
| accept any pending invalidation instead of exactly one | 2 tests |
| never re-synchronise | 1 test |

The first row is the load-bearing one twice over: it proves the assertion discriminates, and it proves the fast path is genuinely reached through real composed drags — including one driven by real Playwright input — rather than only by the direct-drive fixture.

### The measured before/after

Both arms in one session, one arm live at a time, differing by **one argument**: the control withholds the committed gap from `measure`, so the _shipped_ `y()`, cache and resolve loop take the general path. Rule-level equivalence (the gaps proposed over a run twice `k`) is asserted before any ratio is quoted, on top of the buffer instrument.

The instrument is switched off for these arms and for the `m4-prime` structural rows, and for nothing else. It performs the very full scan the measurement is trying to detect, it is `DEV`-only, and it exists in no build a consumer can install.

**Deployed pacing — one committed move per real frame. This is the decision-relevant table.**

| n | composition | rebuild, general | rebuild, verified | bracket, general | bracket, verified |
| --- | --- | --- | --- | --- | --- |
| 50 | bare | 0.437 ms | 0.270 ms | 0.501 ms | 0.326 ms |
| 200 | bare | 1.174 ms | 0.460 ms | 1.227 ms | 0.511 ms |
| 800 | bare | 3.504 ms | 1.312 ms | 3.566 ms | 1.374 ms |
| 50 | `layoutAnimation()` | 0.468 ms | 0.384 ms | 1.112 ms | 1.111 ms |
| 200 | `layoutAnimation()` | 1.087 ms | 0.505 ms | 1.831 ms | 1.251 ms |
| 800 | `layoutAnimation()` | 3.318 ms | 1.151 ms | 4.333 ms | 2.293 ms |

160 committed moves per arm after 20 warm-up frames; resolution 0.0006 ms. The general column reproduces M-4′'s recorded ~3.4 ms at 800 rows, which is the check that the control arm is the old path and not a new one.

**Read counts, asserted structurally in CI rather than measured:** the rebuild reads `n − 1` on the first committed move of an operation and **4** on every verified one, at both 50 and 800 rows, with the span, write, after and resolve segments byte-for-byte identical between the arms. P-06 is a smaller rebuild in the same window — not a re-timing, not a removal.

### What the numbers say that the design did not predict

**The saving is ~2.6× at 800 rows, not the ~8× `k` allows, and `k` is not the reason.** If a verified move were free the average would be `full / 8` = 0.44 ms; it is 1.31 ms, so a verified move costs ≈1.0 ms of the general path's 3.5 ms while doing four reads instead of 799. **The dominant term of the rebuild in the deployed regime is the forced layout after the placeholder write, not the per-row reads** — one flush of ≈1 ms at 800 rows, then ≈3 µs per row. P-06 removes the second term and cannot touch the first.

Three consequences, all recorded rather than acted on here:

1. **`k` is not currently the binding constraint**, so raising it would buy little and spend drift tolerance for it. D-100's "raise it once the equivalence instrument has run against real fixtures" should be read against this: the instrument has now run, and the answer is that there is not much left for a larger `k` to win.
2. **The forced flush is the next thing in this bracket worth a candidate**, and it is not P-06's and not in this slice.
3. **At 50 rows with `layoutAnimation()` composed the bracket is unchanged** (1.112 → 1.111 ms) — the rebuild does shrink, but the displacement feature's own work dominates a list that small.

### The `count` contingency did not fire

D-100 §What would stop this reserved the possibility that "the witness reads turn out not to be free… at `n = 50` that ratio is 4:49 and the fast path may be within noise — in which case P-06 is a large-list optimization and should be gated on `count`, or declined for small lists".

**Measured, at `n = 50`: 0.437 → 0.270 ms bare (1.62×) and 0.468 → 0.384 ms animated (1.22×), against a 0.0006 ms resolution.** The fast path is faster at the smallest measured size, not within noise and not worse. **So no count gate exists and no threshold was invented** — the eight conditions in §The invariant boundary are the whole boundary, and a ninth would have needed evidence that the measurement does not provide.

### Where the tree differs from the design

**Two places, both flagged rather than absorbed.**

**Both are now decided — D-101 and D-102 — and neither changed P-06's correctness design, its boundary or its measurements.** (1) is **ratified**: the bare read is the correct form, because `__DEV__` is package vocabulary rather than kernel vocabulary. (2) is **refused**: the boundary moves so `xy()` carries no P-06 machinery, and the budgets stay red until it does.

1. **`rect-index.ts` reads the bare `__DEV__` global instead of importing `DEV` from `kernel/dev.ts`.** The substitution and the folding are identical — this is the mechanism M-3 measured — but the import is not: `tests/kernel/vocabulary.node.test.ts` fails any name the behavior tier reaches into `kernel/` for unless contract 02 §What stays internal names it with a substitute, and adding `DEV` there is a decision about the tier boundary rather than about this cache. Reaching across and then legislating for it would have widened a second contract to land a design whose stated budget is one additive field. **This is the first dev assertion at the behavior tier**; if a second wants one, that is the moment to decide whether the tier gets a shared constant of its own.
2. **`xy()`'s call site is byte-identical, but its bundle is not.** The fast path lives inside `createRectIndex`'s closure, which both axes share, so `xy()` links code it can never execute. The size bench measures **+135 B** on the minimal `xy()` composition and **+135 to +164 B** across every sortable composition (~1.3%); free-drag compositions are untouched. Splitting the fast path into a module only `y()` imports would recover it and is a change to how the shared cache is factored — **not taken here**, and the declared budgets are left red rather than re-based, so the number is visible rather than absorbed. **D-102 takes it**: the split is required, the required property is an `xy()`-composition graph absence rather than a prescribed factoring, and the residue left in `createRectIndex` is the falsifier — if it is not materially smaller than +135 B the split bought nothing and the cost is accepted with a re-base instead.

### What is still true

`invalidateInsertion` keeps its signature. `SortableContribution` is unchanged. No new subpath, no new export on any entry. The eager window is where it was, between the placeholder write and `afterMove`, for the same correctness reason — nothing here made anything lazier, and D-95's exclusion of the eager position from cost-driven re-decision is preserved.

**Not in this slice, as declared:** any change to `xy()`, any change to the stride (P-02's sub-candidate touches the same buffer and lands after this), any tuning of `k`, and any attempt to make case 3 detectable.