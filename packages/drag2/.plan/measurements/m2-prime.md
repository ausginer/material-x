# M-2′ — controller cost at mixed populations

**Status: run 2026-08-20. The last Phase 21 measurement.** **Decision (b) closes: per-controller cost is predominantly _common_ rather than behavior-specific.** A sortable controller retains **5618 B**, a free-drag controller **4505 B**, and the difference — **1112 B, 20%** — is the whole of what the sortable's behavior adds. **Retention after the declared 1000-controller / 1000-drag mixed workload does not grow with the number of drags**, at an instrument whose sensitivity is measured rather than assumed. **P-02's retention half opens as a Phase 22 candidate**, with an exact figure: **6.29 MB** retained at a 100 000-item high water, of which **5.12 MB** is scalars no axis rule reads. **Decision (a) is withdrawn and is not re-opened.** No Phase 22 work is started.

## What is measured, and what is deliberately not

**The eager-retained frame-task policy is not re-opened** (D-96). The frame task is **sortable-owned and per-controller**: `createFrameTask` has one caller, `src/sortable/runtime.ts`, and free drag installs none. Replacing sortable controllers with free-drag ones therefore _removes_ frame tasks rather than stressing them, so every mixed population is strictly cheaper on that axis than the all-sortable case M-2 already measured. **No figure in this file may be quoted against the 148 B margin**, and none is.

**M-2's construction-model comparison is gone** (D-95): re-running two stand-ins that do not ship measures the stand-ins. What replaces it is the question Phase 22 needs answered before it reads the two surfaces as one — what a controller retains, and how much of that is shared.

## Harness

[`packages/drag2/tests/perf/m2-prime.browser.test.ts`](../../tests/perf/m2-prime.browser.test.ts), checked in. The structural rows — the sink falsifiers, the population pins and P-02's byte counts — run in CI on every suite run; the heap figures are opt-in with `VITE_DRAG_MEASURE=1` and assert nothing.

| Input | Value |
| --- | --- |
| **Engine** | Google Chrome for Testing **150.0.7871.24**, headless, via `@vitest/browser-playwright` (`playwright-core` 1.61.1) |
| **Runner** | Vitest 4.1.10, Node v26.4.0 |
| **Machine** | Linux 7.1.8-200.fc44.x86_64, i7-1255U devcontainer, shared CPU |
| **Flags** | `--js-flags=--expose-gc`, `--enable-precise-memory-info` — without the second, Chrome quantizes `usedJSHeapSize` to 100 kB and every figure is a rounding artifact |
| **Populations** | all sortable · half and half · all free drag, at **100** and **1000** controllers, with **real controllers of both behaviors** |
| **Policy** | `gc()` before every reading; the **minimum of 5 runs after 3 discarded warm-ups**, because heap noise is one-sided |
| **Sink** | module-level, **disposed and dropped before the baseline**, never after it |
| **Runs** | 3, all reported; every figure below reproduces across all three |

**No consumer slot is composed beyond the required resolution callback**, which runs at release and never at construction: free drag composes `onDrop`, the sortable composes `items` (an O(1) return of a stable array), `axis: y()` (a library feature) and `onReorder`. The figures are the library's, not the fixture's.

## Three methodological corrections, each found by a wrong number

M-2's heap policy is reused unchanged and is not sufficient on its own, because M-2's graphs were construction stand-ins and these are real controllers. Each correction below was forced by an output that could not be true.

### 1. `destroy(): Promise<void>` makes a synchronous heap loop invalid

Disposing a thousand controllers queues a thousand promise reaction jobs, and a **synchronous** measurement loop never lets the queue drain — so the previous population stays reachable across the `gc()` that precedes the next baseline. The baseline then never returns to its floor and building the next population reads as _freeing_ memory.

**The first run of this file measured 1000 free-drag controllers at −636 kB, stable to four significant figures across six consecutive readings.** A stable negative is a defect, not a number. Every reading is now separated from the next by a drained task queue, after which the baseline returns to ±5 kB of its floor every time.

M-2 could not have met this: its graphs had no asynchronous teardown at all.

### 2. `usedJSHeapSize` does not see a `Float64Array`'s backing store

The first sink falsifier held sixty-four 8 kB `Float64Array`s — 512 kB — and after the first run every later reading returned **7.4 kB**, because V8 keeps large backing stores in a cache and the next allocation reuses it.

The same defect reached a decision-driving arm before it was caught: P-02's retention, measured by heap sampling, returned **158 kB, 191 kB, 208 kB and 477 kB across four runs of an identical workload** against an arithmetic 192 kB. **That arm is now structural** — see §P-02 below — and the falsifiers retain plain objects, which the sampler measures in full.

### 3. A DOM baseline is the noisiest term available, so it is not subtracted

Per-controller figures were first taken as _DOM-plus-controllers minus DOM-only_. The subtrahend read **6 B and 241 B per root for the identical 500-element tree** in two runs of one session, because a child element's JS wrapper is collectable while its node is not.

**The DOM is now built inside the baseline and attaching the controllers is the measured work**, which removes the term instead of estimating it. The per-controller figures went from a ±240 B spread to agreeing to the byte across runs.

## Falsifying the sink discipline, before any near-zero is trusted

Two rows, both asserting on every suite run:

- **The reading scales with what is retained.** `heap(ballast(n))` against `heap(ballast(2n))` must be between 1.7× and 2.4×. A **ratio**, not a byte constant, so the claim is engine-independent.
- **The M-2 defect, reproduced deliberately.** The same retention measured without clearing the sink first must read **under a tenth** of the correct figure. Holding the graph in a variable the builder overwrites frees one while allocating the next; the net is zero and it reads exactly like _costs nothing_.

Three further rows pin the population itself: the declared behavior mix is built, both behaviors get byte-identical DOM, and one driven drag both lifts the visual and puts it back — so a "drag" that never activated cannot make the retention arm's answer meaningless.

## Result 1 — per-controller retained heap, by behavior (decision-driving)

Bytes retained by **one controller**, over DOM that already exists:

| population | 100 controllers | **1000 controllers** |
| --- | --- | --- |
| all sortable | 5623 B | **5618 B** |
| half and half | 5072 B | **5062 B** |
| all free drag | 4498 B | **4505 – 4506 B** |
| **sortable-specific** (sortable − free) | 1124 B | **1112 B** |
| **common** (≤ the kernel's share) | 4498 B | **4505 B** |

Every figure reproduces to the byte across three runs at 1000 controllers, and to within 0.3% at 100.

**The additivity check holds exactly.** A mixed population must cost the mean of the two pure ones, and at 1000 controllers the prediction and the measurement are **both 5062 B**, in all three runs. That is worth stating as a result rather than as a check: **nothing is shared between controllers.** Per-controller cost is genuinely per controller, so a page's controller heap is linear in the count and a mixed page costs exactly its mix.

**The answer to decision (b): predominantly common, not behavior-specific.** At least **4505 B — 80% — of a sortable controller is carried by a free-drag controller too**, and the sortable's behavior adds **1112 B, 20%**. For Phase 22 that is the whole point: work on the shared construction path moves 80% of controller cost for **both** surfaces, and work on the sortable moves 20% of one.

**The bound is stated as a bound.** _Common_ is an upper bound on the kernel's share, not the kernel's share: free drag's own behavior cost is inside that 4505 B and this workload cannot separate them. What is exact is the **difference**, 1112 B, because the kernel and the DOM cancel out of it.

### Telemetry — scale

At 1000 sortable controllers the population retains **5.6 MB**; at 100, **0.56 MB**. Stable across two orders of magnitude, as M-2 found for its own subject.

## Result 2 — retention after the declared workload (decision-driving)

**Every controller is dragged once inside the baseline.** A controller retains its first drag's steady state — a committed frame, a rect index sized to its collection — and counting that as retention would report a per-controller constant as a leak. What is measured is the **second pass and beyond**, over a 1000-controller mixed population:

| measured drags          | reported retention | per drag        |
| ----------------------- | ------------------ | --------------- |
| 1000 (one more pass)    | 80.1 – 85.0 kB     | 82 – 87 B       |
| 2000 (two more passes)  | **1.0 – 3.6 kB**   | 0.5 – 1.9 B     |
| 4000 (four more passes) | 22.9 – 25.3 kB     | **5.9 – 6.5 B** |

**Retention does not grow with the number of drags, and that is the finding.** The **smallest** workload produces the **largest** reading, in all three runs; a per-drag leak cannot do that. The 1000-drag figure carries a one-time term — a second pass optimizes hot code that later passes do not re-optimize — and the per-drag term is what the 2000- and 4000-drag rows show.

### The sensitivity is measured, not assumed

The falsifier retains eight plain records per drag and reports its own sensitivity:

|  | value |
| --- | --- |
| injected, measured in a quiet arm | **781.4 kB** (800.1 B per drag) |
| reported by the retention arm | **108.7 – 110.5 kB** (111 – 113 B per drag) |
| **sensitivity** | **0.14**, in all three runs |

**The arm reports about a seventh of a known retention under this workload's churn**, and that is stated rather than hidden: a thousand real drags leave enough uncollected garbage in the baseline to absorb most of a deliberate leak. Dividing the tightest observed per-drag figure by it puts true per-drag retention at **≲ 46 B** at 4000 drags — and that division assumes the sensitivity at 4000 drags is no worse than at 1000, which this run did not check.

**So the primary claim is the shape, not the bound**: retention is flat in the drag count across a 4× range, at an instrument that detects 800 B per drag. **The workload leaks nothing that accumulates.**

**Two earlier falsifiers were too weak and are recorded because they nearly passed.** One retained `DOMRect` per drag reported ~100 B in total, and eight of them ~111 B — because `usedJSHeapSize` reflects a platform object's JS wrapper and not the object, the same way it does not reflect a typed array's backing store. Either would have "detected a leak" at a level indistinguishable from the arm's own noise, which is not a control.

### Telemetry — the first drag

A first pass over a **fresh** population retains **329 kB — 337 B per controller**, reproducing to 0.1 kB across three runs. That is a per-controller steady state a controller reaches once and keeps: it does not repeat on the drags after it, which is what the table above shows.

## Result 3 — P-02's retention half

**Not named by the Phase 21 §M-2′ decision list.** M-4′'s record deferred P-02's retention half here after closing its time half, and it is recorded under P-02's own row rather than under M-2′'s decisions.

**It is not a heap sample, and it must not be.** A `Float64Array`'s backing store is exactly what `usedJSHeapSize` cannot see — §2 above. The observable that **is** exact is the buffer's own `byteLength`, and the retention question is structural with an exact answer at every collection size. Two rows assert it in CI: the buffer is `capacityFor(n) × STRIDE × 8`, and **`retire()` keeps it** while emptying the element array beside it.

| largest collection ever scanned | capacity | **retained buffer** | what a stride of 1 would retain |
| --- | --- | --- | --- |
| 100 | 128 | 6.0 kB | 1.0 kB |
| 1000 | 1024 | 48.0 kB | 8.0 kB |
| 4000 | 4096 | 192.0 kB | 32.0 kB |
| **100 000** | 131 072 | **6144 kB — 6.29 MB** | **1024 kB** |

**P-02's original figure is confirmed exactly**: a 100 000-item high-water collection retains a 131 072 × 6 `Float64Array`, 6.29 MB, for the controller's lifetime.

**Five of the six scalars are read by nothing.** `RectIndex` writes `left`, `top`, `right`, `bottom`, `centreX`, `centreY`; `y()` reads `CENTRE_Y` and `xy()` reads `CENTRE_X` and `CENTRE_Y`. No shipped reader touches the four edges — verified over the module graph, not assumed.

**P-02's retention half therefore opens as a Phase 22 candidate**, and it is a different quantity from the time half M-4′ closed. M-4′ measured the stride's cost in **time** — ~8% of the rebuild at 800 rows, because the reads dominate the stores — and closed it. This is **space**, it is **retained rather than transient**, and it scales with the high water rather than with the current collection: **5.12 MB of a 6.29 MB buffer is scalars nothing reads.**

**Two sub-candidates, both Phase 22's to design and neither started here.** Narrowing the stride to what the axis rule consumes is one; a high-water shrink policy is the other, and they are independent — a narrower stride still never shrinks. **This measurement takes neither**, and it deliberately does not propose a stride, because `xy()` needs two scalars where `y()` needs one and that is a design question rather than a measurement.

## What this closes, and what it opens

- **Decision (b) closes.** Per-controller cost is predominantly common: 80% shared, 1112 B behavior-specific for the sortable. Nothing is shared between controllers, so population cost is linear.
- **Retention closes.** The declared workload leaks nothing that accumulates, at an instrument whose sensitivity is measured at 0.14 and stated.
- **Decision (a) stays withdrawn.** No figure here bears on the frame-task policy, by D-96's argument rather than by omission.
- **P-02's retention half opens**, as the second Phase 22 candidate this phase produced, beside P-01 and P-06. **No optimization work is started.**
- **§Check D-56 stays Phase R's** and is not recorded as satisfied here.

## What would reopen this

- A behavior whose controller carries substantially more than the sortable's 1112 B, which would move the 80/20 split and change where Phase 22 should work.
- A workload that shares state between controllers — a page-level registry, a shared observer — which would break the additivity that makes population cost linear.
- An engine whose `performance.memory` reflects typed-array backing stores and platform-object storage. Both exclusions are V8's, both were found by a wrong number here, and both are the reason two arms in this file are structural rather than sampled.