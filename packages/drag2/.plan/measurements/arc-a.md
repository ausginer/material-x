# Arc A — what extracting the execution bracket cost

**Measured 2026-09-04**, arc tree `dd2cdb70` against baseline `2e485eb4` — the commit that decided the arc and changed no source. The baseline ran in a detached worktree with `node_modules` symlinked from the repository root, on the same machine in the same session as the arc runs. Instruments: [`m1.browser.test.ts`](../../tests/perf/m1.browser.test.ts) and [`m1-prime.browser.test.ts`](../../tests/perf/m1-prime.browser.test.ts) under `VITE_DRAG_MEASURE=1`, one file at a time; `bench/size/measure.ts` for bytes.

**The result in one line.** Nothing on the move path is measurable at either harness's resolution, and every composition that carries the kernel pays **+270 B minified — +268 on `both behaviors`, the one row that carries two of them — with +28 to +70 B Brotli and exactly one module**. The two compositions that carry no kernel pay **0**.

## The per-sample reading count, stated before the timings

D-180 asks for this figure first rather than last, because the arc adds one property load per `kernel.closed` read and the count is what turns that into a per-sample number. Measured by replacing `Kernel.prototype`'s `closed` accessor with a counting wrapper over the original, driving 100 `pointermove` samples with one animation frame between them, in a temporary probe that is not part of the suite.

| Composition | `kernel.closed` reads per sample |
| --- | --- |
| `complete` — 50 rows, `y()`, `landing()`, `layoutAnimation()` | **0.28** (28 over 100) |
| `free drag complete` — `bounds()`, `landing()`, with `onMove` filled | **1.00** |
| the same with `onMove` absent | **0.00** |

**The count is a property of the consumer's configuration, not of the composition**, and the third row is why that is worth writing down: free drag's per-sample reading is the `!this.#kernel.closed` conjunct guarding the `onMove` call, so a consumer who fills no `onMove` performs none at all. The sortable's is fractional because its reads sit on the scan the apply performs, not on the sample.

**So the arc's per-sample cost is one property load for the dispatch, plus at most one more.** `#dispatchKernel` was deleted rather than forwarded, so no sample gains a call frame.

## M-1 — the move path

Two runs of each tree, medians of 21 calibrated samples. `performance.now()` is clamped, so **0.0977 µs is one quantum** and nothing below it is a reading.

| Row | `2e485eb4` | Arc A |
| --- | --- | --- |
| end-to-end pointer sample, 50 rows | 3.1250, 3.1250 | 3.1250, 3.1250 |
| end-to-end pointer sample, 200 rows | 3.1250, 3.1250 | 3.2227, 3.0273 |
| what one sample allocates, over 20 000 samples | 0.0 B | 0.0 B |

The publication-path rows (`part=3` … `part=28`, polymorphic) are a micro-benchmark over frame objects the arc does not touch; they reproduce on both trees within one quantum and are not repeated here.

## M-1′ — the constrained compositions, the churn and the retained heap

| Row | `2e485eb4` | Arc A |
| --- | --- | --- |
| C bare | 2.9297 – 3.1250 | 3.0273 – 3.1250 |
| C axis, delta vs bare | −0.0977 – +0.0977 | 0.0000 – +0.0977 |
| C bounds(element), delta vs bare | +0.0977 | +0.0977 – +0.1953 |
| C bounds(thunk), delta vs bare | −0.0977 – 0.0000 | −0.1953 – −0.0977 |
| E churn, `onMove` installed, median | 3.1250 – 3.6133 | 3.2227 |
| E churn, slot null, median | 2.9297 | 2.9297 – 3.0273 |
| E retained heap over 20 000 samples | 0.00 B per sample | 0.00 B per sample |

**Every row moves by at most one quantum and in both directions across repeats, which is the shape of a null result rather than of a small cost.** The retained-heap arm is the one that could have shown a real regression — four callbacks per controller instead of two, and one more object — and it is flat at the arm's own resolution because those allocations are per controller, not per sample.

## Brotli, all ten rows and the five that are not rows a change can reach

Exact bytes from `measureAll()`, minified and Brotli, with the bundled module count.

| Row | `2e485eb4` | Arc A | Δ Brotli | Δ minified | modules |
| --- | --- | --- | --- | --- | --- |
| minimal | 10,399 | 10,456 | **+57** | +270 | 31 → 32 |
| minimal (xy) | 10,277 | 10,313 | **+36** | +270 | 30 → 31 |
| minimal + layoutAnimation | 10,767 | 10,795 | **+28** | +270 | 32 → 33 |
| xy + layoutAnimation | 10,610 | 10,670 | **+60** | +270 | 31 → 32 |
| minimal + landing | 10,559 | 10,604 | **+45** | +270 | 33 → 34 |
| complete | 10,896 | 10,966 | **+70** | +270 | 34 → 35 |
| free drag minimal | 8,111 | 8,166 | **+55** | +270 | 25 → 26 |
| free drag + bounds | 8,274 | 8,327 | **+53** | +270 | 26 → 27 |
| free drag + landing | 8,277 | 8,338 | **+61** | +270 | 27 → 28 |
| free drag complete | 8,423 | 8,479 | **+56** | +270 | 28 → 29 |
| both behaviors | 12,347 | 12,397 | **+50** | +268 | 45 → 46 |
| vocabulary root — `drag.js` | 142 | 142 | **0** | 0 | 2 → 2 |
| kernel root — `kernel.js` | 6,164 | 6,218 | **+54** | +270 | 14 → 15 |
| baseline A — feature-matched, non-composed | 10,703 | 10,749 | **+46** | +270 | 29 → 30 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | 6,889 | **0** | 0 | 26 → 26 |

**+270 B minified on twelve of the thirteen kernel-carrying rows is the whole finding, and the Brotli spread under it is the compressor rather than the change.** The thirteenth is `both behaviors` at **+268**, and the two bytes are not accounted for here: it is the one row where two behaviors reach the new module through one kernel, and no attempt was made to attribute the difference to a particular token. It is recorded because the summary sentence has to be true of every row it quantifies over, not because two bytes matter. The same bytes cost 28 B in `minimal + layoutAnimation` and 70 B in `complete`; a graph with more context to match against absorbs more of them. `kernel root` is where the change is read cleanly, at +270 minified on 19,354: a class declaration, four callback fields with their constructor assignments, four arrow closures at the construction site, and a second module's boundary — against five comment blocks, two three-argument call sites and `#dispatchKernel` going away.

**The two zero rows are the pass's declared controls, and they are the result rather than the absence of one.** `drag.js` carries the failure vocabulary and no kernel; baseline B is the shipped `@ydinjs/drag`, which this tree does not compile. Both are byte-identical, which is what says the instrument is scoped to the change.

**No composition went over budget**, and no budget moved. Slack is 0.07 to 0.11 kB where it was 0.12 to 0.17 — narrower, and still on the right side, so §18's re-base trigger is not met: a pass that grows does not re-base its ceilings.

**Five `control:` rows were re-declared, and D-180 said in advance that they would be.** `free drag minimal`, `+ bounds`, `+ landing`, `free drag complete` and `kernel root` carry exact controls set by passes that could not reach the kernel. This one changes the kernel, which every one of them carries, so for this pass they are not controls at all. Recorded in [`budget-rebases.md`](budget-rebases.md).

## One module, and which graphs took it

`kernel/execution.js` enters every graph that carries `kernel/kernel.js` — thirteen of the fifteen rows, +1 module each — and enters neither `drag.js` nor baseline B. `both behaviors` goes 45 → 46 and its union identity against `complete` + `free drag complete` still holds, so the new module is reached through the kernel by both behaviors rather than duplicated per behavior.
