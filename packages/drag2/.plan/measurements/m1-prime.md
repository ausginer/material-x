# M-1′ — the shared publication site, and free drag's sample

**Status: run 2026-08-19. Four of the five decisions it was taken for are closed; P-01 is not, and the reason is structural rather than a shortfall in the run — see §What M-1′ does not close.**

M-1′ is Phase 21's second measurement, taken against [`phase-21.md`](phase-21.md) §M-1′ as amended by **D-96**, which is authoritative wherever it and D-95 differ. It re-runs M-1's questions against the complete package — two behaviors on one page — and corrects three arms whose earlier form measured something other than the quantity its decision turned on.

## Harness

[`packages/drag2/tests/perf/m1-prime.browser.test.ts`](../../tests/perf/m1-prime.browser.test.ts), checked in beside `m1.browser.test.ts` rather than replacing it: M-1's file is the record of what was measured in Phase 11 and its numbers are still cited. Structural assertions run on every suite run; timings are opt-in with `VITE_DRAG_MEASURE=1` and assert nothing.

| input | value |
| --- | --- |
| engine | Chromium — Google Chrome for Testing **150.0.7871.24**, headless, via `@vitest/browser-playwright` |
| flags | `--js-flags=--expose-gc`, `--enable-precise-memory-info` (set for this project's browser suite in `.scripts/vitest-config.ts`) |
| runner | Vitest 4.1.10, Node **v26.4.0** |
| machine | Linux 7.1.8-200.fc44.x86\_64, 12th Gen Intel Core i7-1255U, devcontainer (shared CPU) |
| policy | 5 discarded warm-ups; a calibrated batch doubling until one sample clears 2 ms; 21 samples; **median** — M-1's policy, reused unchanged |
| heap policy | M-2's: `gc()` before the baseline **and** before the final reading; minimum of 5 runs after 3 warm-ups |
| runs | **6 paired runs of the whole file**, each arm and its control in the same session |

```
VITE_DRAG_MEASURE=1 npx vitest run -c vitest.config.ts \
  --project browser tests/perf/m1-prime.browser.test.ts
```

**One measurement file per run**, as the standard requires. Every figure below comes from a run of this file alone.

### The operational rule this run added

**Every arm of a paired comparison must dispose its fixture before the next arm is built.** A free-drag controller listens for `pointermove` on the document, so a fixture left alive receives every later arm's samples as well and each arm measures the sum of itself and its predecessors.

The first run of this file did exactly that, and the result looked like a finding rather than a defect:

```
M-1' C bare=3.5156µs  axis=8.0078µs  bounds(element)=7.0313µs  bounds(thunk)=9.3750µs
```

`axis: 'y'` cannot cost 4.5 µs more than no axis at all — it is two comparisons — and that impossibility is what exposed the contamination. Under the same pacing with one controller live at a time, every one of those deltas is a null. **This is the fourth operational rule and it belongs beside the other three**, because M-4′, M-5 and M-2′ all run paired arms and would reproduce it exactly.

## Arm A — the publication cliff, relocated

One line of configuration rather than a new measurement: the 12-to-16-field jump is Chromium's and not a portable constant, and the engine has moved since 2026-08-02.

Generic publication, median, µs, across the six runs:

| part fields | M-1 (2026-08-02) | M-1′ range | M-1′ typical |
| --- | --- | --- | --- |
| 3 | 0.061 | 0.064 – 0.098 | 0.067 |
| **8 — the sortable's shape** | **0.098** | 0.101 – 0.113 | **0.107** |
| 12 | 0.147 | 0.134 – 0.147 | 0.140 |
| 16 | 1.465 | 1.416 – 2.246 | 1.514 |
| 20 | 1.758 | 1.660 – 1.709 | 1.709 |
| 28 | 2.148 | 2.246 – 2.441 | 2.344 |

**The cliff is in the same place and is the same size** — ~10.7× between 12 and 16 fields — on an engine two majors newer. M-1's answers 1 and 2 stand as written, and the 5-field and 8-field parts the package actually ships remain on the cheap side of it with four fields of margin.

## Arm B — the shared call site, against an alternation-matched control

**Decision-driving.** M-1 quoted its polymorphic figure against a _monomorphic_ run, so the 6× it reported carried the alternation itself and a different mean field count alongside the shape count it was attributed to (D-96 (2)). The control here is the **same alternating driver over two distinct objects of one 8-field shape**, so the only difference between the arms is how many shapes the site sees. Two structural rows assert that the control really is one shape and the measured arm really is two, so the arm's validity is executable rather than described.

The shapes are the real ones: `SortableFramePart` is 8 fields, `FreeDragFramePart` is 5.

|  | median, µs |  |
| --- | --- | --- |
| **mixed — 8 and 5 alternating** | **0.095 – 0.101** | decision-driving numerator |
| **alternation-matched control — two 8-field objects** | **0.107 – 0.131** | decision-driving denominator |
| **ratio** | **0.77 – 0.94, median 0.87** | **decision-driving** |
| monomorphic 8 | 0.104 – 0.116 | telemetry |
| monomorphic 5 | 0.082 – 0.092 (one outlier at 0.165) | telemetry |
| M-1's own 3/8/20 scenario | 0.635 – 0.659 | telemetry |

**The ratio is below 1, and the residual bias is what the telemetry is for.** The mixed arm's mean field count is 6.5 against the control's 8, which the plan states biases the ratio toward 1 — here it pushes it below. Correcting for it with the two monomorphic figures, the field-count-matched expectation is their mean, and

> mixed ÷ mean(mono8, mono5) = **1.02, 1.02, 1.02, 0.97, 1.00** across the five clean runs.

**Shape polymorphism at two behaviors costs nothing measurable at this harness's resolution.** Per the plan's own rule — _a ratio near 1 closes the question for two behaviors permanently_ — **decision (a) closes: kernel frame publication does not need a shape-stable design for two behaviors**, and the shared publication site is not what Phase 22 looks at first.

**And M-1's 6× is corrected by measurement rather than by argument.** Its 3/8/20 scenario reproduces here at **0.64 µs** — the same figure, on the same site, in the same session as the 0.098 µs two-shape alternation. The difference is not shape count: the 20-field frame in that scenario is on the far side of arm A's cliff and costs 1.71 µs on its own, so any alternation containing it must land near the cliff whatever its shape count. **M-1's polymorphic figure was measuring its own largest frame.** It is left standing in `m1.md` as what was measured, with this as the correction to what it was read to mean.

### What would reopen decision (a)

A third behavior, or a behavior part above ~12 fields. Both arms here sit below arm A's cliff, and the closure is for **two shapes both on the cheap side of it**, which is the composition the package can currently produce.

## Arm C — one free-drag pointer sample, four compositions

**No consumer slot is installed on any arm** beyond the required `onDrop`, which no sample reaches. The one exception is the thunk bounds source, which _is_ consumer code by construction, and it returns a hoisted rect so that it contributes a call and not a rect construction.

A structural row asserts the constrained compositions render exactly what the bare one renders when the bounds rect is too large to clamp, so the deltas are the cost of the _mechanism_ and not of a different outcome.

| composition | median, µs | delta vs bare, across six runs |
| --- | --- | --- |
| bare | 3.32 – 3.52 | — |
| `+ axis: 'y'` | 3.42 – 3.71 | 0.000, +0.098, +0.098, +0.195, +0.195, −0.293 |
| `+ bounds(element)` | 3.03 – 4.30 | 0.000, 0.000, 0.000, −0.293, −0.391, +0.977 |
| `+ bounds(() => rect)` | 3.13 – 3.71 | −0.098, −0.098, −0.098, −0.195, −0.195, +0.391 |

**This is a one-tick null and is written as one.** The batch resolution here is ~0.098 µs per sample — `performance.now()`'s 100 µs clamp divided by the calibrated batch — and every delta above is within a tick or two of zero with the sign changing between runs. **There is no resolvable per-sample cost to `applyConstraint?.()` or to the clamp at ~0.1 µs**, which is what this establishes; _the constraint costs under 0.1 µs_ is a claim the sampling does not support and is not made.

That is the expected shape rather than a surprise: with the rect cached, the constrained sample adds one indirect call and four comparisons to a 3.4 µs sample whose cost is dominated by event dispatch and the style write.

## Arm D — staleness

### The burst — a structural assertion, and it runs on every suite run

`k` scroll invalidations between two samples, `k ∈ {1, 4, 16}`, must produce **exactly one resolve per `apply`** regardless of `k`, plus a fourth row asserting that an unmarked sample resolves nothing at all. The instrument is a function bounds source that counts the calls it is asked for, which is one call per resolve by construction.

**All four rows hold.** This is the one place a read count is evidence, and it is evidence of a regression: the flag is set once and read once, so a result above one would mean the rect is resolved somewhere the contract says it is not.

**It was falsified before it was recorded.** With `bounds()`'s `invalidate()` patched to resolve eagerly — the exact defect the contract forbids — the `k = 4` and `k = 16` rows fail. The `k = 1` row does **not**, and cannot: one eager resolve and one lazy resolve are both one resolve. That is precisely why the assertion is written _regardless of `k`_ and why one `k` would not have been an instrument.

**Decision (b) closes: D-70's lazy resolve holds the contract it was accepted on.** With D-96 having already withdrawn frame coalescing on arithmetic, this was the only half of that question still open. **Frame coalescing is withdrawn rather than deferred**, and a later phase may not re-propose it without the workload D-96 names: a path that runs `apply` more than once per frame.

### The continuous shape — telemetry

Realistic pointer-plus-scroll pacing, one invalidation per sample, against a no-scroll control in the same session. A third arm with **no `bounds()` at all** carries the harness's own `dispatchEvent` and nothing else, so the difference between the two scrolled columns is the resolve by itself.

| source | no-scroll | one invalidation per sample | delta, across six runs |
| --- | --- | --- | --- |
| no bounds (dispatch only) | 3.13 – 7.03 | 3.42 – 5.27 | −0.098 … +1.76, sign changing — a null |
| `bounds(element)` | 2.93 – 3.61 | 10.55 – 12.11 | **+7.42 … +8.50** |
| `bounds(() => rect)` | 3.22 – 3.42 | 3.71 – 4.10 | **+0.49 … +0.88** |

An element bounds source under continuous scrolling costs about **7.9 µs per sample** — a real `getBoundingClientRect` behind a style write, and more than twice the whole unconstrained sample. A thunk source costs about **0.6 µs**, which is one call and the consumer's own arithmetic.

**No decision in this phase turns on it, and the plan said so before the run.** It is recorded because a later reader will ask what an element source costs under active scrolling, and because it is the number that would tempt a rect held across frames — which serves the previous frame's rect to this frame's clamp and **moves the visual**. That is a correctness change wearing an optimization's clothes, and a large number does not license it.

## Arm E — allocation

**That `buildGeometry` allocates is not measured here and is not in question**: the code constructs an object literal per sample inside the `onMove` branch, reading it settles the fact, and no workload returns _no_. What is measured is whether the churn is observable as cost.

### Retention — across a collected pair

M-2's discipline, not M-1's. M-1 read `usedJSHeapSize` after 20 000 samples with **no** intervening `gc()` and correctly called that a bound on _allocation_; growth under that method is uncollected churn or retention indistinguishably, so it cannot be borrowed for a retention claim (D-96 (3)). Here `gc()` runs before the baseline **and** before the final reading, with the reading taken before the fixture is torn down so the delta is what the samples left behind rather than what disposal released.

| 20 000 samples     | retained, minimum of 5 runs after 3 warm-ups    |
| ------------------ | ----------------------------------------------- |
| `onMove` installed | **−0.1 kB** ≈ −0.005 B per sample, all six runs |
| slot null          | **−0.1 kB** ≈ −0.005 B per sample, all six runs |

**Decision-driving, and it is a clean null: nothing is retained, and the two arms are indistinguishable.** The small negative is the collector settling below the baseline it was measured from. **Decision (d) closes: I-26's allocation claim survives at the second behavior with a consumer callback installed** — as the same kind of evidence M-1 recorded, not a stronger one. **I-26's tier does not move on this arm**, because nothing here is capable of moving it.

### GC pressure — the tail

Over the same workload, the distribution across the 21 calibrated-batch samples rather than its median. A collector that absorbs per-sample allocation shows it as tail, not as mean; a GC pause lands inside one batch, which is the resolution at which the question can be asked at all.

| run | `onMove` median / p95 / max | slot null median / p95 / max |
| --- | --------------------------- | ---------------------------- |
| 1   | 3.71 / 3.91 / 4.30          | 3.52 / 4.10 / 4.79           |
| 2   | 3.42 / 3.61 / 4.98          | 3.22 / 3.61 / 5.27           |
| 3   | 3.61 / 3.71 / 5.18          | 3.42 / 4.59 / 6.05           |
| 4   | 3.52 / 3.91 / 7.23          | 3.42 / 3.71 / 4.98           |
| 5   | 3.42 / 3.81 / 5.37          | 3.32 / 3.61 / 5.47           |
| 6   | 3.81 / 6.64 / 8.30          | 3.52 / 7.23 / 7.42           |

**The tail is inside the control's spread**, and in four of the six runs the _control's_ p95 or max is the larger of the two. The medians do separate, by a consistent ~0.19 µs — two ticks — which is the geometry construction plus the callback invocation, and is the mean-side cost rather than a GC signature.

**The reused-draft change is therefore not a measured fix.** Per the plan's own rule, the allocation is real, is stated as real, and is **not** presented as measured-free — what is measured is that its churn is not observable as cost against a null-slot control on this collector.

## What M-1′ does not close

**P-01, the per-sample visual render, is listed as decision (c) and no arm of the corrected contract produces a quantity that decides it.** This is recorded rather than answered with a proxy.

P-01 asks whether `lift.write` can be coalesced to rAF. The saving such a change makes is bounded by _(samples committed per frame − 1) × the cost of one visual write_, so the deciding quantity is **how many samples a real high-rate input commits inside one frame** — and that is exactly the regime D-96 identified as unobservable in this harness when it withdrew the frame gate: a calibrated batch dispatches hundreds of synthetic samples inside a single frame, so nothing measured there converts into a per-frame saving. Arm C measures the whole sample without decomposing the visual write, so quoting its 3.4 µs against P-01 would be substituting a convenient number for the one the decision turns on.

**There is a candidate closure on arithmetic, and it is an architect's to take rather than this run's.** D-96 already established that `moved` runs on the dispatched `pointermove` and that the deployment path commits about one sample per frame. If that arithmetic extends to the visual write — and it appears to, since `moved` writes the lift synchronously in both behaviors and the frame task coalesces only the sortable's spatial lookup — then P-01's saving is bounded at approximately zero by the same argument that closed the frame gate, and P-01 closes without a measurement. **D-96 applied that arithmetic to resolves and not to visual writes**, so extending it is a contract decision and is raised here rather than assumed.

> **Answered by D-97, 2026-08-20: the candidate closure fails, and raising it rather than taking it was correct.** The two gates do not share a leg. The bounds gate was refused because holding a rect across frames **moves the visual**; a write gate has no such property, since only the last transform written before a paint is presented — so collapsing writes inside one frame is work elimination with an identical result, and the reason that carried the first cannot carry the second. Verifying it also found that D-96's _about one sample per frame_ is **typical Chromium dispatch policy rather than structure**, which suspends the within-frame half of its own withdrawal. **P-01 stays open and is owed M-6**, a census of writes per `requestAnimationFrame` tick under input injected through the browser's input pipeline. Nothing else in this file moves; M-1′ is closed as measured.

## What M-1′ changes

- **Decision (a) — closed.** Shape polymorphism at the shared publication site costs nothing measurable once the control is alternation-matched. The kernel frame does not need a shape-stable design for two behaviors, and this is not Phase 22's first target. Reopened only by a third behavior or a part above ~12 fields.
- **Decision (b) — closed.** One resolve per `apply` at every `k`, asserted continuously. D-70's lazy resolve is affirmed and frame coalescing is withdrawn as an option.
- **Decision (c) — open.** See above.
- **Decision (d) — closed.** No retention across a collected pair, with and without a consumer callback. I-26's tier does not move.
- **No Phase 22 optimization opens from M-1′.** The one large number in the file — an element bounds source under continuous scrolling — is telemetry by contract, and the change it would tempt is a correctness regression.
- **A fourth operational rule joins the reproducibility standard**: paired arms dispose before the next is built.

M-1's own file is unchanged apart from a pointer to this one. Its numbers are what was measured in Phase 11; arm B's correction is to what the polymorphic figure was read to mean, not to the figure.