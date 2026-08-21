# P-02 retention — the high-water shrink, measured

**Run 2026-08-21**, against D-104's design ([`../p02-retention-shrink.md`](../p02-retention-shrink.md)) and D-99's stop condition. Harness: [`tests/perf/p02-shrink.browser.test.ts`](../../tests/perf/p02-shrink.browser.test.ts).

**Outcome: the policy is exactly as sound as D-104 derives, it is _earned_, and it **landed** on 2026-08-21.** Every arm below was re-run against the shipped implementation and reproduces; the harness that measured the candidate now drives the shipped cache, and its falsifiers are the landed policy's.

**The first pass of this record declined it, and was wrong.** It bounded the drivable collection using a curve measured before P-06, on the very code path P-06 replaced, and never measured the interval where the arithmetic crosses D-99's threshold. §The interval that overturns the decline supersedes §The decision below, which is struck rather than deleted because the shape of the error is the part worth not repeating.

**No production shrink code was landed to take this measurement.** `src/` is untouched by this handoff; the policy exists only as a harness instrument, held to the shipped cache by an equivalence check.

---

## Reproducibility

|  |  |
| --- | --- |
| instrument | `Float64Array.byteLength` and buffer identity — M-2′'s structural probe, inherited rather than rebuilt. **No `usedJSHeapSize`**: M-2′ established that a typed array's backing store is precisely what the heap counter cannot see |
| policy | a faithful copy of `createRectIndex`'s sizing and scan plus D-104's one `else if`, in the harness. `STRIDE` 6, `capacityFor` unchanged, `retire()` keeps the buffer |
| equivalence | the instrument and the shipped cache produce identical `byteLength` and identical packed scalars on every workload where the gate cannot fire, including a 1000 → 300 shrink the gate refuses |
| rows | detached for every buffer arm (sizing depends on slot count, not geometry); **attached** for the rebuild-cost arm, which is the one measuring layout |
| structural rows | run on every suite run; the four measurement rows are `VITE_DRAG_MEASURE=1` |
| out of scope | the six-scalar representation, stride narrowing, `xy()`, P-06 |

---

## Question 1 — does the gate behave as derived?

**Yes, on every arm, including the one that could have killed it.**

| arm | workload | result |
| --- | --- | --- |
| **stable-large** | 100 000 items, unchanged, **1000 drags** | **1 allocation** — the initial growth — and `byteLength` constant at **6 144 kB** across the whole run. Zero reallocations after the first. The falsifier does not fire |
| **shrunk** | high water, then republished at 100, then 100 further drags | **exactly 2 allocations** (one growth, one shrink), never a third |
| **strictly less** | 100 000 → 100 | frees 6 144 kB, allocates 6 kB |
| **fitted-buffer proof** | every `n` from 1 to 4096 | `capacityFor(n) > 4 × n` is false at every one, so no fitted buffer can trip the gate at any size |
| **emptied** | republished at 0 | 48 B retained |
| **oscillating** | 1000 ⇄ 100, 99 transitions | 100 allocations, alternating 48 kB and 6 kB. **Telemetry, not a decline trigger** — a collection that changes size makes the library resize, exactly as growth already does |

**One edge D-104 does not name, found here and recorded rather than fixed.** With `n = 0` the gate reads `capacity > 0`, which is true of _every_ buffer including the one-slot buffer a previous empty refresh just produced — so an empty collection reallocates 48 B on **every** scan instead of settling. It is 48 B, and it is only reachable through a collection with nothing in it, which cannot be dragged. It is named so that a landing pass fixes the gate rather than discovering it.

**So the mechanical question is answered and the answer is clean.** Nothing below is a defect in the policy.

---

## Question 2 — is there a supported workload that earns it?

> **First-pass answer: no, on three grounds. Two of the three are withdrawn below**, and the corrected answer is **yes** — see §The interval that overturns the decline. The three subsections are kept because (a) survives intact and because the withdrawal is only legible next to what it withdraws.

~~**No. Three independent reasons, and any one of them is sufficient.**~~

### (a) The policy cannot fire at the moment the collection shrinks — **stands, as a limitation**

`refresh` runs only inside an operation — `resolve` from the spatial pipeline, `measure` from the committed-move bracket — so a branch placed there cannot run while a controller is idle. Asserted on the shipped API rather than argued: after one drag, republishing a live collection at a tenth of its size and calling `controller.invalidate()` reads **zero** geometry.

**That breaks the story the candidate is motivated by.** "The user drags in a large list, then filters it to a hundred, and the buffer sits there" is exactly the state this policy does _not_ touch. Reclaim requires a **subsequent drag at the smaller size**, so the workload is not _drag, then filter_ but _drag, filter, drag again, then idle_ — strictly narrower, and narrower in the direction that removes the case where the retention is most visible.

### (b) The high water is bounded by the library's own per-move cost — **withdrawn, see §The interval that overturns the decline**

The buffer this policy recovers is capacity a collection once **scanned**, and the scan is a `getBoundingClientRect()` per row. Measured on attached rows, one rebuild in isolation:

| n      | scan         | per row | fraction of a 16.67 ms frame | buffer   |
| ------ | ------------ | ------- | ---------------------------- | -------- |
| 800    | 0.80 ms      | 1.00 µs | 0.05                         | 48 kB    |
| 2 000  | 2.80 ms      | 1.40 µs | 0.17                         | 96 kB    |
| 5 000  | 5.20 ms      | 1.04 µs | 0.31                         | 384 kB   |
| 10 000 | 7.70 ms      | 0.77 µs | 0.46                         | 768 kB   |
| 20 000 | **15.80 ms** | 0.79 µs | **0.95**                     | 1 536 kB |

**And this is the optimistic curve.** It times the scan alone, on a settled layout, with no placeholder write before it. M-4′ measured the same rebuild in the deployed regime at **3.504 ms for 800 rows**, because the first read after the placeholder write is a forced layout flush — ≈4.4 µs per row rather than 1.0. On that curve one committed move fills a frame at roughly **3 800 rows**, and a drag makes many committed moves.

So a non-virtualized sortable is usable up to a few thousand rows, and a virtualized one never reaches a high water at all: its `items()` returns the rendered window, which is small and does not shrink from anything.

### (c) At every reachable size, D-99's own threshold is met from below — **withdrawn with (b)**

D-99 set the stop condition: _if the largest collection a supported consumer plausibly holds keeps the unread retention under ~100 kB per controller, decline both halves._

| high water | buffer   | reclaimed by a shrink to 100 |
| ---------- | -------- | ---------------------------- |
| 800        | 48 kB    | **42 kB**                    |
| 2 000      | 96 kB    | **90 kB**                    |
| 4 000      | 192 kB   | 186 kB                       |
| 20 000     | 1 536 kB | 1 530 kB                     |
| 100 000    | 6 144 kB | 6 138 kB                     |

At the largest collection the library can drive inside a frame, **the entire buffer is under 100 kB** — so the recoverable historical excess is necessarily under it too, and the threshold is met from below at every size a consumer can reach. The rows at 20 000 and 100 000 quantify a payoff at collection sizes the measurement above shows are not drivable.

**The 100 000 → 100 arm is not offered as deployment evidence**, and D-99's own gap statement is why: it is the synthetic figure M-2′ used to make the retention _visible_, and using it to justify the policy would be citing the instrument as the workload.

---

## ~~The decision~~ — superseded by §The decision, corrected

> **Wrong, and kept for the shape of the error.** Its reason (b) bounded the drivable collection at ≈3 800 rows from M-4′'s **general** rebuild curve — measured _before_ P-06, on the path P-06 replaced. On the current tree 2 100–3 000 rows costs a third to a half of a frame per committed move. Reason (c) followed from (b) and falls with it; reason (a) survives as a limitation and not as a decline.

~~**P-02's shrink sub-candidate is declined**, on D-104's second stop condition, in the words it was written in: _if supported deployments do not shrink their collections, the policy is correct and worthless, and it should be declined on D-99's own terms rather than landed because it is cheap._~~

~~The policy is correct. It is worthless at the sizes it is reachable at, and it misses the state it was pictured recovering.~~ **Landing a nearly-free change is not a reason** — the sentence D-104 closes with — and that part of the reasoning stands; what failed is the premise it was applied to.

**Nothing is implemented and nothing is left behind.** `src/` is untouched. The harness stays, because it is the record's instrument.

**P-02's other half is untouched.** The 5.12 MB of scalars no axis rule reads belongs to the **stride** sub-candidate, which is not designed, not measured here, and not closed by this. The two figures may not be added or quoted for each other — which is the misreading D-104 was written to prevent, and this record inherits the prohibition rather than relaxing it.

---

## What would reopen this

- **A supported deployment with a drivable high water above ~4 000 rows.** That needs the rebuild to get cheaper first, which is P-06's and the stride candidate's territory, not this one's — so this reopens _after_ them, if at all.
- **A reclaim point that does not require a subsequent drag.** D-104 refuses a timer and an idle hook by construction, and refuses `retire()` because it would have to predict. If some other already-existing lifecycle point holds the real collection size, reason (a) weakens — but not reasons (b) or (c).
- **Evidence that many controllers reach a high water simultaneously.** M-2′ established population heap is linear in the controller count with nothing shared, so a thousand controllers each holding 48 kB is 48 MB. Nothing measured suggests that shape, and it would be a different candidate with a different workload.
- **The threshold moving.** D-99's ~100 kB is the number this declines against. A deployment that argues for a smaller one reopens the arithmetic, not the policy.

---

## The interval that overturns the decline

**Re-run 2026-08-21, after review.** The first pass jumped from **2 000 items (96 KiB, capacity 2048)** to **20 000 (not drivable)** and declined on the gap between them. The next capacity bucket opens at **2 049**, where the buffer is already **192 KiB** — so the entire decline rested on an interval it never measured.

### The bound was computed from the wrong curve

Reason (b) put one committed move at a frame near ≈3 800 rows, from M-4′'s **general** rebuild at 4.4 µs per row. That figure was measured _before_ P-06, on the code path P-06 replaced. On the current tree seven committed moves in eight read **five witnesses** instead of `n − 1`, so the deployed cost per move is not that curve at all. **Extrapolating a post-optimization bound from a pre-optimization measurement is the error**, and it is the same class as quoting a workload that entails its own result.

### The interval, measured on the current tree

One committed move, real composed controller, `y()`, one sample per **real** frame after 10 warm-ups, 60 measured frames, bracket timed between `beforeInsertionMove` and `afterInsertionMove`. Every frame committed a move.

| n | composition | bracket per committed move | fraction of a frame | buffer |
| --- | --- | --- | --- | --- |
| 2 100 | bare | 5.700 ms | **0.34** | 192 KiB |
| 2 100 | `layoutAnimation()` | 5.742 ms | **0.34** | 192 KiB |
| 3 000 | bare | 6.212 ms | **0.37** | 192 KiB |
| 3 000 | `layoutAnimation()` | 8.353 ms | **0.50** | 192 KiB |

The average includes the full rebuilds the `k = 8` re-synchronisation forces and the full rebuild that opens every operation, so it is the honest per-move figure rather than the verified-path best case.

**2 100–3 000 rows is comfortably drivable.** No claim is made above 3 000: the first pass's 20 000-row row measured an isolated scan and is not a deployed figure either, and nothing here re-measures it.

### The reclaim, across the boundary

| high water | capacity | retained | reclaimed by a shrink to 100 | crosses ~100 kB |
| --- | --- | --- | --- | --- |
| 2 000 | 2048 | 96 KiB | 90 KiB | no |
| **2 049** | **4096** | **192 KiB** | **186 KiB** | **yes** |
| 2 100 | 4096 | 192 KiB | 186 KiB | yes |
| 3 000 | 4096 | 192 KiB | 186 KiB | yes |

**And once the high water is in the 4096 bucket, every possible firing clears the threshold.** The gate needs `4096 > 4 × n`, so it fires only below 1 024 items, and `capacityFor(1023)` is 1 024 — so the **smallest** reclaim available is `196 608 − 49 152` = **144 KiB**, and the largest is 192 KiB less 48 B. There is no firing from that bucket that lands under D-99's figure. Asserted structurally, both directions: every destination from 2 049 clears it, and no destination from 2 048 does.

### The lifecycle, end to end on the shipped API

Not arithmetic on the instrument. One live controller at 2 100 rows: a drag that commits moves, `pointerup`, the collection republished at 100 through the `items()` pull source with `controller.invalidate()` (D-44), then a **second drag at the smaller size** that also commits moves. Both operations reach `refresh` — the first to grow the buffer, the second at the size that would shrink it.

### What still stands from the decline

**Reason (a) is unaffected and is now a property of the workload rather than a reason to refuse it.** `refresh` runs only inside an operation, and a live controller whose collection shrinks between drags still reads **zero** geometry. So the reclaim is not available at the moment the collection shrinks; it arrives on the next drag. That is a real limitation, it is what makes the workload below _specific_, and it is why the second drag is part of the workload rather than an afterthought.

---

## The workload that earns it, stated minimally

**A single live sortable controller in which all four hold:**

1. the collection reaches **≥ 2 049 items** — the smallest size in the 4096 capacity bucket;
2. **a drag completes at that size**, so `refresh` grows the buffer to 192 KiB;
3. the collection is then republished at **< 1 024 items** — the gate is `capacity > 4 × n`;
4. **a subsequent drag occurs at the smaller size**, which is the only moment the policy can fire.

**Reclaim: 144 KiB at the smallest firing, 186 KiB to a hundred-item collection, against D-99's ~100 kB threshold.** Every one of the four steps is a supported act on the public surface, and the drag in step 2 costs a third of a frame per committed move.

**A filtered or searchable reorderable list of a few thousand rows is exactly this shape** — reorder, filter, reorder again — and it is the first concrete deployment description this candidate has had. What it is _not_ is the 100 000-item arm: that stays the instrument M-2′ used to make retention visible, and it is still not offered as deployment evidence.

## The decision, corrected

**P-02's shrink sub-candidate is not declined. D-104 returns to the deferred-decision table as unimplemented, in Phase 22.**

Its design is unchanged and unretracted — this run changed no part of it, and confirmed every mechanical claim in it. What changed is the second stop condition's answer: supported deployments _can_ shrink their collections from a high water that matters, at a size the current tree drives comfortably, and the reclaim clears the threshold at every firing from that bucket.

**Still not implemented, and nothing was landed to measure it.** `src/` is untouched. The one edge this run found — an empty collection reallocating 48 B on every scan, because `n = 0` makes the gate `capacity > 0` — is the one thing a landing pass must fix rather than inherit.

**P-02's stride half is still untouched and still not closed.** 5.12 MB of unread scalars is a different quantity with a different candidate behind it; the two may not be added or quoted for each other.
---

## Re-run on the landed implementation

**2026-08-21.** The policy shipped in `RectIndex.refresh` — see [`../p02-retention-shrink.md`](../p02-retention-shrink.md) §What landed for the one divergence from the designed slice and for the `n = 0` correction. This harness no longer carries a copy of the policy: every arm drives `createRectIndex` directly, so the figures below are the shipped cache's rather than an instrument's.

| arm | before landing | on the landed tree |
| --- | --- | --- |
| stable-large, 100 000 × 1000 drags | 1 allocation, 6 144 kB constant | **identical** |
| qualifying shrink | exactly 2 allocations, then settled | **identical** |
| reclaim at 2 049 | 186 KiB | **identical** |
| smallest firing from the 4096 bucket | 144 KiB | **identical** |
| 2 048 bucket, any destination | under the threshold | **identical** |
| one committed move at 2 100 rows | 5.70 ms bare / 5.74 ms animated | **3.93 / 4.60 ms** |
| one committed move at 3 000 rows | 6.21 / 8.35 ms | **5.19 / 4.51 ms** |

**The committed-move figures came in faster on the re-run**, on a quieter machine and with the same 60-real-frame method. The conclusion they support is unchanged and was never close: a quarter to a third of a frame either way.

**Two arms changed meaning rather than value, and both are improvements.** The `n = 0` arm asserted _reallocates on every scan_ and now asserts _settles after one_, which is the correction landing. And a new arm pins that a cache asked only for an empty collection allocates **nothing at all** — `capacity` is 0 and neither trigger fires — where the pre-landing shape would have taken a 48 B buffer it could not use.

**The equivalence check changed with them.** While the policy was undecided it compared _the instrument against the shipped cache_; there is one cache now, so what is proved instead is that **a cache that shrank is indistinguishable from a cache that never grew** — same bytes, same packed scalars, same count — plus that a shrink the gate _refuses_ leaves contents matching a fresh scan slot for slot as far as the count goes.

**Five mutations of the landed branch were run against the sortable suite and this file**, and each is caught: gating at `2 ×` (1), removing the gate (2), dropping the settle guard (1), shrinking by `subarray` instead of rescanning (**126**, across the whole sortable suite), and shrinking to an exact count rather than a power of two (5).

**Cost: +34 B on the `y()` compositions, +14 B on `minimal (xy)`, brotli.** Inside the ~150 B headroom on every row, so no budget moves — which is what that headroom is for. `xy()` pays its 14 B correctly: the shrink is a property of the dimension-neutral cache both axes share, not one axis rule's private optimization.