# P-01 — the cost of one write, and of the gate that would remove it

**Status: run 2026-08-21. P-01 closes — declined, on D-99's own stop condition, with the premise behind that condition falsified.**

The surplus a write gate would remove is worth **18–24% of D-99's bar in the typical frame at M-6's primary pace**, and at worst **63%** of it in the tail of a pace M-6 recorded as corroborating rather than establishing. Every reading of every arm, at both paces, is under the bar. **But D-99 expected the decline to be won by two orders of magnitude and it is won by a factor of two to five**, because the quantity D-99 reasoned about is not the one the deployment pays.

**No production gate exists and none was written.** The gate below is a harness prototype, and D-99 forbids starting a real one before the write cost is known — which is what this run establishes.

## What D-99 asked, and what it assumed

D-99's stop condition: **decline if the surplus is worth under ~1% of a 16 ms frame** — 160 µs — which at M-6's p95 of 3–8 writes per tick means declining _unless one write costs ≳ 23–80 µs_. Its reasoning was that repeated assignments inside a frame overwrite a property read once at paint, **so the marginal cost of the second through eighth write is "a CSSOM set and little else"**.

**That sentence is true and it does not describe the deployment.** A write onto a style tree that is _already dirty_ costs **0.49 µs** — the CSSOM set, exactly as predicted. A write onto a **clean** tree costs an order more. Deployment interleaves an input dispatch between two visual writes, and hit-testing a dispatch requires a clean tree, so **every in-situ write is a clean-tree write** and the predicted regime never occurs.

## Harness

[`packages/drag2/tests/perf/p01-write-cost.browser.test.ts`](../../tests/perf/p01-write-cost.browser.test.ts), reusing M-6's [`tests/support/pointer-commands.node.ts`](../../tests/support/pointer-commands.node.ts). Structural rows — including the falsification and the flush obligation — run on every suite run; the timing arms are opt-in with `VITE_DRAG_MEASURE` and assert nothing.

| input | value |
| --- | --- |
| engine | Chromium — Google Chrome for Testing **150.0.7871.24**, headless |
| driver | `playwright-core` **1.61.1** via `@vitest/browser-playwright` **4.1.10** |
| runner | Vitest **4.1.10**, Node **v26.7.0** |
| machine | Linux 7.1.8-200.fc44.x86\_64, 12th Gen Intel Core i7-1255U, devcontainer (shared CPU) |
| subject | one live free drag, real `page.mouse` input, 240 movements per flood |
| runs | **3 full runs**, all three reported below |

```
VITE_DRAG_MEASURE=1 npx vitest run -c vitest.config.ts \
  --project browser tests/perf/p01-write-cost.browser.test.ts
```

**This is a timing experiment, and it is the inverse of M-6's discipline** — M-6 counted and refused to price; nothing here is a count.

## The clock, and what it forces

`performance.now()` resolves at **100 µs** in this context, measured rather than assumed. One `style.transform` assignment is three orders under that, so **no arm times a single write directly**; two estimators are used instead and they are independent of each other.

- **Batched.** Many operations inside one rAF callback, at four batch sizes, per-operation cost taken as the **least-squares slope** — which cancels the loop, the clock calls and the frame's own fixed term. The **minimum** per-frame reading is used, because every error here is additive.
- **Quantized-Bernoulli.** A cost far under the quantum reads zero almost always and one whole quantum occasionally, so the _mean_ reading is an unbiased estimate. **Its null control is reported beside every use**: an empty window measured with the same two clock calls, immediately after each write, which returns **0.0–0.6 µs** throughout. Without that control the estimator would be a way of reading the clock's own noise as a result.

## The instrument is falsified before any figure is recorded

The batch timer also prices a `getBoundingClientRect()` in the same frames, and the structural row asserts it resolves that apart from a transform write. **It caught a real defect on its first run**: the batch arms were writing through the recording accessor, so they were timing the instrument — two clock calls and two array pushes, which is more than the write. The recorder is now detached in every arm that measures.

## The three instruments, and why they disagree

| quantity | run 1 | run 2 | run 3 |
| --- | --- | --- | --- |
| clock granularity | 100 µs | 100 µs | 100 µs |
| **write, dirty tree** (arm B) | **0.489 µs** | **0.485 µs** | **0.487 µs** |
| **write, clean tree** (arm B′) | **4.15 µs** | **5.43 µs** | **4.25 µs** |
| in-situ, ordinal ≥ 1, wave 2 (arm A) | 26.3 µs | 24.8 µs | 21.3 µs |
| in-situ, ordinal ≥ 1, wave 4 (arm A) | 17.9 µs | 13.9 µs | 9.7 µs |
| **end-to-end per write, wave 2** (arm E) | **19.6 µs** | **17.9 µs** | **23.3 µs** |
| **end-to-end per write, wave 4** (arm E) | **13.9 µs** | **14.5 µs** | **9.9 µs** |

**The dirty-tree figure is the most reproducible number in the file and the least relevant one.** It varies by 0.004 µs across three runs and it prices a regime — several writes with nothing between them — that a free drag never enters.

**Arm A tags each in-situ write with its ordinal inside the rAF tick**, because P-01 turns on what the writes at ordinal ≥ 1 cost: a gate keeps the first and removes the rest. They cost **what the first one costs**, within noise, at both paces. There is no cheap tail.

**The remaining spread — 4 µs against 10–23 µs — is real and is not resolved here.** The clean-tree arm forces the lifecycle with a layout read; an input dispatch does that and hit-tests and commits to the compositor besides. The three instruments **bracket** the deployed marginal write at **4–23 µs**, and the verdict below holds across that whole bracket, so nothing was spent narrowing it.

## Arm E — the gate, driven end to end

The deciding arm, because it needs no model. The prototype gate is installed against a real drag under real pointer input and the difference it makes is measured directly.

**The bracket is the whole `pointermove` dispatch.** The kernel listens on the document in the bubble phase (`kernel/pointer.ts`), so a `window` capture listener opens the span before it and a `window` bubble listener closes it after — every listener the sample runs, `constrain.apply` and the visual write included. **Both arms install the same shadowing accessor**, so the difference between them is the write and not the instrument. Floods alternate ungated/gated/gated/ungated over three rounds, so a machine drifting warmer cannot read as a gate effect.

|  | run 1 | run 2 | run 3 |
| --- | --- | --- | --- |
| coalescing ratio, wave 2 | 2.47 | 2.67 | 2.64 |
| coalescing ratio, wave 4 | 6.14 | 5.62 | 6.34 |
| **wave 2 — typical frame** | 28.8 µs — **18.0%** | 29.8 µs — **18.6%** | 38.2 µs — **23.9%** |
| wave 2 — tail frame (M-6 p95 = 3) | 39.1 µs — 24.5% | 35.7 µs — 22.3% | 46.6 µs — 29.2% |
| **wave 4 — typical frame** | 71.6 µs — **44.8%** | 66.9 µs — **41.8%** | 52.8 µs — **33.0%** |
| wave 4 — tail frame (M-6 p95 = 8) | 97.5 µs — 60.9% | 101.3 µs — 63.3% | 69.2 µs — 43.2% |

Percentages are of D-99's 160 µs bar.

**Each pace is scored against its own count.** M-6 read p95 = 3 at wave 2 over 96 ticks and called it the primary evidence; p95 = 8 at wave 4 over 24 ticks, corroborating the direction rather than establishing it. Applying wave 4's p95 to wave 2's cost would be reading one arm's tail against another arm's price.

**The coalescing ratios reproduce M-6 independently** — 2.5–2.7 and 5.6–6.3 requests per commit, against M-6's means of 2.25–2.27 and 5.25–5.38 — from a different harness, a different counter and a different run. That is a stronger cross-check than either file could give alone.

**Arm E's arithmetic was wrong once and the correction matters.** The delta was first divided by the _removed_ writes. But the gate does not delete the writes it keeps — it moves them out of the dispatch and into a rAF callback, which is outside the bracket, so the whole delta is the cost of _all_ the writes that left the span. Charging it to the removed subset inflated the per-write figure by the coalescing ratio and reported 45 µs where the same data says 29.

## What the gate costs

|                                            | run 1    | run 2    | run 3    |
| ------------------------------------------ | -------- | -------- | -------- |
| per request (two fields, a flag, a branch) | 0.023 µs | 0.042 µs | 0.025 µs |
| per frame, one `requestAnimationFrame`     | 0.092 µs | 0.088 µs | 0.087 µs |

**Two to three orders below the write it removes, so the gate's runtime cost is not what declines it** — the break-even is at 1.2–1.3 writes per frame on the dirty-tree figure alone. These are also **over**-estimates: the prototype carries the composed string, where a gate at `lift.write` would hold two scalars and compose once per frame.

**The real cost is the obligation, and it is asserted rather than described.** Three structural rows show a request left pending by a gate torn down without a flush (the visual is left behind), the same request caught up by a terminal path that flushes, and a second flush writing nothing. A shipped gate owes that on **release, cancel, destroy and the landing hand-off**, permanently.

## The verdict

**P-01 is declined.** The worst reading in nine measurements is 63% of D-99's bar, in the tail of the faster pace; the typical frame at the primary pace is 18–24%. A saving of 0.2–0.4% of frame budget does not buy a permanent four-path lifecycle invariant.

**But the decline is now narrow, and the record should say so.** D-99 declined on the arithmetic that one write is a CSSOM set — 0.49 µs — which would have put the saving at 2% of the bar. Measured in the regime the deployment is actually in, one write is **10–23 µs**, just under the low end of D-99's own 23–80 µs range. **The conclusion survived; the reasoning behind it did not.**

**The error class is the same one P-02 met.** P-02 bounded a collection from a rebuild curve measured on the path its own optimization replaced; P-01 priced a write from a regime its own deployment never enters. Both are extrapolations from a system adjacent to the one under test, and both look like arithmetic rather than assumption when written down.

## What would reopen it

Stated as conditions rather than invitations. Any of these moves the surplus toward the bar, and none is speculative — each is a quantity this run measured.

- **A behavior that writes more than once per sample.** The arithmetic is `(writes per tick − 1) × 10–23 µs`, and it is the _count_ carrying the decline now, not the price.
- **A pointing device above ~300 Hz.** Wave 4 is ~309 dispatches per second and already reaches 63% of the bar; 1000 Hz devices exist.
- **A cheaper obligation.** If a flush on the four terminal paths ever becomes free for an unrelated reason, the trade is 30–100 µs per frame for approximately nothing.

## What this does not close

**P-02's stride sub-candidate** — still undesigned, unmeasured and open. **The forced flush in the committed-move bracket**, named by the P-06 run and still un-evidenced: it stays in the state P-04 and P-05 are in. **`moveTo()` traffic is untouched** — M-6 classified it as a consumer-chosen rate and it contributes nothing here either.