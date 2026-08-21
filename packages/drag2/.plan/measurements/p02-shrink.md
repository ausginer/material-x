# P-02 retention — the high-water shrink, measured

**Run 2026-08-21**, against D-104's design ([`../p02-retention-shrink.md`](../p02-retention-shrink.md)) and D-99's stop condition. Harness: [`tests/perf/p02-shrink.browser.test.ts`](../../tests/perf/p02-shrink.browser.test.ts).

**Outcome: the policy is exactly as sound as D-104 derives, and it is declined.** Not because it churns — it provably does not — but on D-104's own second stop condition and D-99's own threshold: at every collection size the library can actually drive, the whole buffer is smaller than the figure D-99 said would end the candidate, and the moment the payoff story describes is one the policy cannot fire at.

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

**No. Three independent reasons, and any one of them is sufficient.**

### (a) The policy cannot fire at the moment the collection shrinks

`refresh` runs only inside an operation — `resolve` from the spatial pipeline, `measure` from the committed-move bracket — so a branch placed there cannot run while a controller is idle. Asserted on the shipped API rather than argued: after one drag, republishing a live collection at a tenth of its size and calling `controller.invalidate()` reads **zero** geometry.

**That breaks the story the candidate is motivated by.** "The user drags in a large list, then filters it to a hundred, and the buffer sits there" is exactly the state this policy does _not_ touch. Reclaim requires a **subsequent drag at the smaller size**, so the workload is not _drag, then filter_ but _drag, filter, drag again, then idle_ — strictly narrower, and narrower in the direction that removes the case where the retention is most visible.

### (b) The high water is bounded by the library's own per-move cost

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

### (c) At every reachable size, D-99's own threshold is met from below

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

## The decision

**P-02's shrink sub-candidate is declined**, on D-104's second stop condition, in the words it was written in: _if supported deployments do not shrink their collections, the policy is correct and worthless, and it should be declined on D-99's own terms rather than landed because it is cheap._

The policy is correct. It is worthless at the sizes it is reachable at, and it misses the state it was pictured recovering. **Landing a nearly-free change is not a reason** — the sentence D-104 closes with, applied to D-104.

**Nothing is implemented and nothing is left behind.** `src/` is untouched. The harness stays, because it is the record's instrument and the falsifier if this is ever reopened.

**P-02's other half is untouched.** The 5.12 MB of scalars no axis rule reads belongs to the **stride** sub-candidate, which is not designed, not measured here, and not closed by this. The two figures may not be added or quoted for each other — which is the misreading D-104 was written to prevent, and this record inherits the prohibition rather than relaxing it.

---

## What would reopen this

- **A supported deployment with a drivable high water above ~4 000 rows.** That needs the rebuild to get cheaper first, which is P-06's and the stride candidate's territory, not this one's — so this reopens _after_ them, if at all.
- **A reclaim point that does not require a subsequent drag.** D-104 refuses a timer and an idle hook by construction, and refuses `retire()` because it would have to predict. If some other already-existing lifecycle point holds the real collection size, reason (a) weakens — but not reasons (b) or (c).
- **Evidence that many controllers reach a high water simultaneously.** M-2′ established population heap is linear in the controller count with nothing shared, so a thousand controllers each holding 48 kB is 48 MB. Nothing measured suggests that shape, and it would be a different candidate with a different workload.
- **The threshold moving.** D-99's ~100 kB is the number this declines against. A deployment that argues for a smaller one reopens the arithmetic, not the policy.