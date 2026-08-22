# P-01 — the cost of one write, and of the gate that would remove it

**Status: run 2026-08-21, reviewed and corrected 2026-08-22. P-01 closes — declined, on D-99's own stop condition, with the premise behind that condition falsified.**

**The reading the decline is argued from is the typical frame at M-6's primary pace, and it reproduces at 17.9–25.3% of D-99's 160 µs bar across thirteen runs** — the record's original three, the review's seven, and three more taken during remediation. That is the figure to quote. The wider quantities this record first published as bounds were the range of three runs and are corrected below.

**No production gate exists and none was written.** The gate here is a harness prototype, and D-99 forbids starting a real one before the write cost is known — which is what this run establishes.

## What D-99 asked, and what it assumed

D-99's stop condition: **decline if the surplus is worth under ~1% of a 16 ms frame** — 160 µs — which at M-6's p95 of 3–8 writes per tick means declining _unless one write costs ≳ 23–80 µs_. Its reasoning was that repeated assignments inside a frame overwrite a property read once at paint, **so the marginal cost of the second through eighth write is "a CSSOM set and little else"**.

**That sentence is true, and it describes a regime a free drag never enters.** A write onto a style tree that is _already dirty_ costs **0.485–0.489 µs** — the CSSOM set, exactly as predicted, and the most reproducible figure in the file. But **the deployed path issues one visual write per input dispatch**, and the browser cleans the style tree to hit-test the next dispatch, so no two visual writes are ever adjacent on a dirty tree. Every in-situ write is a clean-tree write, and costs an order more.

**That single structural fact is what makes D-99's premise inapplicable, so the permanent suite holds it** (P01-06): `should issue at most one visual write per input dispatch` asserts a maximum of one across a real pointer flood, paired with an anti-vacuity count so a drag that never rendered cannot satisfy it. **It discriminates** — a second `visual.style.transform` assignment in `kernel/presentation.ts`'s `write()` fails exactly that row, `expected 2 to be 1`. A future behavior that begins writing twice per sample trips a test rather than requiring someone to re-read this record.

## Harness

[`packages/drag2/tests/perf/p01-write-cost.browser.test.ts`](../../tests/perf/p01-write-cost.browser.test.ts), reusing M-6's [`tests/support/pointer-commands.node.ts`](../../tests/support/pointer-commands.node.ts). Structural rows — the falsifier, the one-write-per-dispatch hold, and the three flush rows — run on every suite run; the timing arms are opt-in with `VITE_DRAG_MEASURE` and assert nothing.

| input | value |
| --- | --- |
| engine | Chromium — Google Chrome for Testing **150.0.7871.24**, headless |
| driver | `playwright-core` **1.61.1** via `@vitest/browser-playwright` **4.1.10** |
| runner | Vitest **4.1.10**, Node **v26.7.0** |
| machine | Linux 7.1.8-200.fc44.x86\_64, 12th Gen Intel Core i7-1255U, devcontainer (shared CPU) |
| subject | one live free drag, real `page.mouse` input, 240 movements per flood |
| runs | **3 + 7 (review) + 3 (remediation)**; spreads below say which set they are over |

```
VITE_DRAG_MEASURE=1 npx vitest run -c vitest.config.ts \
  --project browser tests/perf/p01-write-cost.browser.test.ts
```

**This is a timing experiment, and it is the inverse of M-6's discipline** — M-6 counted and refused to price; nothing here is a count.

## The clock, and what it forces

`performance.now()` resolves at **100 µs** in this context, measured rather than assumed. One `style.transform` assignment is three orders under that, so **no arm times a single write directly**; two estimators are used and they are independent of each other.

- **Batched.** Many operations inside one rAF callback, at four batch sizes, per-operation cost taken as the **least-squares slope** — which cancels the loop, the clock calls and the frame's own fixed term. The **minimum** per-frame reading is used, because every error here is additive.
- **Quantized-Bernoulli.** A cost far under the quantum reads zero almost always and one whole quantum occasionally, so the _mean_ reading is an unbiased estimate. Its null control — an empty window measured with the same two clock calls, immediately after each write — returns **0.00–1.02 µs** throughout.

**Arm E has its own null control, and it is not the Bernoulli one** (P01-01). See §Arm E.

## The instrument is falsified before any figure is recorded

The batch timer also prices a `getBoundingClientRect()` in the same frames, and the structural row asserts it resolves that apart from a transform write. **It caught a real defect on its first run**: the batch arms were writing through the recording accessor, so they were timing the instrument — two clock calls and two array pushes, which is more than the write. The recorder is now detached in every arm that measures.

## The three instruments, and why they disagree

Over the original three runs:

| quantity | run 1 | run 2 | run 3 |
| --- | --- | --- | --- |
| clock granularity | 100 µs | 100 µs | 100 µs |
| **write, dirty tree** (arm B) | **0.489 µs** | **0.485 µs** | **0.487 µs** |
| **write, clean tree** (arm B′) | **4.15 µs** | **5.43 µs** | **4.25 µs** |
| **end-to-end per write, wave 2** (arm E) | **19.6 µs** | **17.9 µs** | **23.3 µs** |
| **end-to-end per write, wave 4** (arm E) | **13.9 µs** | **14.5 µs** | **9.9 µs** |

**The dirty-tree figure varies by 4 ns across three runs and is the least relevant number here.** It prices several writes with nothing between them, which one-write-per-dispatch makes unreachable.

**The end-to-end figures are a three-run range and not a bound** (P01-02). Across all thirteen runs the wave-2 per-write reading spans **17.9–29.8 µs**, so the _10–23 µs_ this record first headlined — and D-105 repeated — is withdrawn as a bracket. The three instruments **bracket** the deployed marginal write at roughly **4–30 µs**, and the verdict holds across that whole bracket at the primary pace, so nothing was spent narrowing it.

### The ordinal split, which establishes less than this record first claimed

Arm A tags each in-situ write with its ordinal inside the rAF tick, because a gate keeps the first and removes the rest. Remediation runs:

| pace | ordinal 0 | ordinal ≥ 1 | n at ordinal 0 |
| --- | --- | --- | --- |
| wave 2 | 22.6 / 26.0 / 24.4 µs | **29.5 / 32.5 / 33.0 µs** | 84 / 77 / 82 |
| wave 4 | 22.2 / 12.5 / 36.8 µs | **10.0 / 9.5 / 14.9 µs** | **18 / 16 / 19** |

**The claim that there is "no cheap tail" is withdrawn** (P01-04). The two paces disagree in direction — the tail is dearer at wave 2 and cheaper at wave 4 — and the wave-4 ordinal-0 bucket holds 16–19 samples at a 12–37% non-zero rate, which is **two to seven informative readings**. Neither direction is established there, and the original record tabulated only the ordinal ≥ 1 column, so the comparison it asserted was not visible in it.

**The verdict does not depend on this.** Arm E measures the aggregate directly and needs no split; a cheaper tail would make the surplus smaller and the decline safer.

## Arm E — the gate, driven end to end

The deciding arm, because it needs no model. The prototype gate is installed against a real drag under real pointer input and the difference it makes is measured directly.

**The bracket is the whole `pointermove` dispatch.** The kernel listens on the document in the bubble phase (`kernel/pointer.ts`), so a `window` capture listener opens the span before it and a `window` bubble listener closes it after — every listener the sample runs, `constrain.apply` and the visual write included. **Both arms install the same shadowing accessor**, so the difference between them is the write and not the instrument. Floods alternate ungated/gated/gated/ungated over three rounds.

### The null control, and what it says about precision

Alternation defends against a machine drifting monotonically; it does not defend against a systematic difference between two floods. So the identical shape now runs again with **both sides ungated**, scored through the identical formula (P01-01):

|  | run 1 | run 2 | run 3 | against a signal of |
| --- | --- | --- | --- | --- |
| wave 2 null control | −0.38 µs | −0.39 µs | **+1.40 µs** | 21.9–29.3 µs |
| wave 4 null control | −0.77 µs | −3.24 µs | **+8.46 µs** | 11.8–15.1 µs |

**At the primary pace the floor is ≲1.4 µs against a signal of 22–29 µs — about 5%.** At wave 4 it reaches **8.46 µs against 15 µs**, so **wave-4 per-write figures are barely above this instrument's own noise** and are quoted here as direction rather than as measurement. That is the direct cause of the spread in P01-02, and it is why the decline is argued from wave 2.

### Results

|  | run 1 | run 2 | run 3 |
| --- | --- | --- | --- |
| coalescing ratio, wave 2 | 2.59 | 2.41 | 2.38 |
| coalescing ratio, wave 4 | 5.21 | 5.34 | 4.88 |
| **wave 2 — typical frame** | 34.8 µs — **21.8%** | 34.8 µs — **21.7%** | 40.5 µs — **25.3%** |
| wave 2 — tail frame (M-6 p95 = 3) | 43.8 µs — 27.3% | 49.5 µs — 30.9% | 58.7 µs — 36.7% |
| wave 4 — typical frame | 53.3 µs — 33.3% | 51.2 µs — 32.0% | 58.4 µs — 36.5% |
| wave 4 — tail frame (M-6 p95 = 8) | 88.5 µs — 55.3% | 82.6 µs — 51.6% | 105.5 µs — 65.9% |

Percentages are of D-99's 160 µs bar. **These are observed values, not bounds.** Across thirteen runs the wave-2 typical frame spans **17.9–25.3%**, the wave-2 tail **22.3–37.3%**, and the wave-4 tail **43.2–93.8%** — so _"the worst reading is 63%"_ is withdrawn.

**Each pace is scored against its own count.** M-6 read p95 = 3 at wave 2 over 96 ticks and called it the primary evidence; p95 = 8 at wave 4 over 24 ticks, corroborating the direction rather than establishing it. Applying wave 4's p95 to wave 2's cost would be reading one arm's tail against another arm's price.

**The coalescing ratios reproduce M-6 independently** — 2.4–2.6 and 4.9–5.3 requests per commit here, 2.25 and 5.29 in the review, against M-6's means of 2.25–2.27 and 5.25–5.38 — from a different harness, a different counter and a different run.

### The accounting assumption, stated

**The surplus is computed as `(n − 1) × perWrite`, which prices the one write the gate retains at the full in-dispatch cost** (P01-03). That is not what the retained write would cost: it runs in a `requestAnimationFrame` callback, ahead of the frame's own style and layout, on a tree nothing has dirtied since the last paint — the clean-tree regime arm B′ prices at **4.15–5.43 µs**, not 12–29 µs.

A neutral accounting is `n × perWrite − C_rAF`, with the gate's own overhead already netted out inside the bracket. It is **larger**:

|  | this record's formula | neutral, `C_rAF` = 4.15 µs |
| --- | --- | --- |
| worst original run (wave 4, `perWrite` 14.5, p95 8) | 101.3 µs — 63.3% | 111.8 µs — **69.9%** |
| worst reviewed run (wave 4, `perWrite` 21.4, p95 8) | 150.1 µs — 93.8% | 167.4 µs — **104.6%** |

**So every surplus figure in this record is a lower bound on the true surplus, in the direction of its own conclusion.** The decline survives it at the primary pace and on the original runs; the combination of a neutral accounting with the wave-4 tail of the widest observed run does cross the bar, and no single run does both. Stating the substitution is the point — a record whose named error class is _extrapolation from an adjacent system_ does not get to make one silently.

### The arithmetic correction, corrected

Arm E first divided the delta by the _removed_ writes. The gate does not delete the writes it keeps — it moves them out of the dispatch into a rAF callback, outside the bracket — so the whole delta belongs to _all_ the writes that left the span, and the shipped code divides by `ungatedWrites`.

**The inflation that error produced is `r / (r − 1)`, not the coalescing ratio `r`** (P01-05): at `r` = 2.47 that is 1.68, not 2.47. The record's own quoted pair confirms the smaller factor — 45 / 29 = 1.55. **And 45 and 29 are typical-frame savings in µs, not per-write figures**; no per-write column in this document contains either.

## What the gate costs

|                                            | run 1    | run 2    | run 3    |
| ------------------------------------------ | -------- | -------- | -------- |
| per request (two fields, a flag, a branch) | 0.023 µs | 0.042 µs | 0.025 µs |
| per frame, one `requestAnimationFrame`     | 0.092 µs | 0.088 µs | 0.087 µs |

**Two to three orders below the write it removes, so the gate's runtime cost is not what declines it** — the break-even is at 1.2–1.3 writes per frame on the dirty-tree figure alone. These are also **over**-estimates: the prototype carries the composed string, where a gate at `lift.write` would hold two scalars and compose once per frame.

### The obligation: what is proven, and what is only enumerated

**Proven, and load-bearing.** Three structural rows show a request left pending by a gate torn down without a flush (the visual is left behind), the same request caught up by a terminal path that flushes, and a second flush writing nothing. Each was broken and each row failed. **A deferred write creates a terminal-flush obligation, and that obligation cannot be made free in general.**

**Not proven** (P01-07). The enumeration _release, cancel, destroy and the landing hand-off_ is asserted about code this run did not inspect, and it is not exactly right. The shipped lifecycle already performs a terminal write — `session.write(target.x, target.y)` at [`kernel.ts:1652`](../../src/kernel/kernel.ts#L1652) — conditional on a non-null target, and on that path a pending gated value would be superseded by the pin, so a flush there is arguably already covered. **The path where a flush is unambiguously owed is the null-target jump cut**, where presentation is released from where the visual stands (D-49). How many paths a real gate would owe is a question for a design that does not exist, and the decline does not rest on the count.

## The verdict

**P-01 is declined.** At M-6's primary pace the surplus is **17.9–25.3% of D-99's bar in the typical frame** across thirteen runs — roughly a fourfold margin — and that is the reading the decline is argued from. The wave-4 figures corroborate the direction, are noisier than the signal deserves, and are not the ground of the decision. A saving of that size does not buy a permanent terminal-flush obligation.

**But the decline is narrower than D-99's reasoning implied, and the record should say so.** D-99 declined on the arithmetic that one write is a CSSOM set — 0.49 µs — which would have put the surplus at ~2% of the bar. Measured in the regime the deployment is actually in, one write is an order more. **The conclusion survived; the reasoning behind it did not.**

**The error class is the same one P-02 met.** P-02 bounded a collection from a rebuild curve measured on the path its own optimization replaced; P-01 priced a write from a regime its own deployment never enters. Both are extrapolations from a system adjacent to the one under test, and both look like arithmetic rather than assumption when written down.

## What would reopen it

Two conditions, both quantities this run measured. The third condition this record first listed — _a flush obligation that becomes free for an unrelated reason_ — is **withdrawn** (P01-08): it measures nothing, and it lowers the cost side of the trade rather than moving the surplus toward the bar.

- **A behavior that writes more than once per sample.** Measured at exactly one, and now held by a permanent row. The arithmetic is `(writes per dispatch × ticks − 1) × 12–29 µs`, and it is the _count_ carrying the decline, not the price.
- **A pointing device materially above M-6's ~129 /s primary pace.** Wave 4 is ~309 /s and its typical frame already reaches 32–37% of the bar; its tail readings are within the instrument's noise and should not be quoted as the bound.

## What this does not close

**P-02's stride sub-candidate** — still undesigned, unmeasured and open. **The forced flush in the committed-move bracket**, named by the P-06 run and still un-evidenced: it stays in the state P-04 and P-05 are in. **`moveTo()` traffic is untouched** — M-6 classified it as a consumer-chosen rate and it contributes nothing here either.