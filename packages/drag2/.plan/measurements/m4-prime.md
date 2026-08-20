# M-4′ — the committed-move bracket, in its eager position

**Status: run 2026-08-20.** **Question (a) closes: the eager rebuild is the dominant term of a committed move, at every list size and in both compositions.** **Question (b): neither P-02 nor P-03 opens — both close as accepted, named costs, with numbers.** ~~**Question (c): the rebuild's _contents_ do not need to shrink; its _reads_ are the whole of it, and the read set is the destination view the rule is defined over.**~~ **Corrected by D-98, 2026-08-20**: the second half does not follow from the first. The rule's **domain** is the destination view; the cache's **refresh set** is whatever invalidation says changed, and at a committed move the library knows that exactly. **Question (c) opens P-06** — the only Phase 22 candidate this phase produces, and the largest quantified one in the package. ~~**No Phase 22 optimization opens from this run.**~~ **P-02 and P-03 stay closed on their own numbers, and every measured figure in this file stands unchanged** — what D-98 changes is the reading of question (c), not a result.

M-4′ ([`phase-21.md`](phase-21.md) §M-4′) re-runs q7's question on the tree that actually ships. q7 answered _no shared read phase_ against four **synthetic** layout shapes, on a tree where the axis index rebuilt **lazily on the next spatial frame**. Phase 11's own answer 1 then made the rebuild **eager and interior to the bracket**, and C4-03 recorded that the measurements were not re-run. This is that re-run, against the real bracket:

```
beforeMove   span read + offset release
    ↓ placeholder write
rebuild      full-candidate index rebuild
    ↓
afterMove    second span read + animate
```

## What is measured, and what is deliberately not

**The observable is a read count placed relative to the write. It is not a forced-layout count** (D-96). A forced layout is a read that _follows_ a write, and an in-page harness cannot observe one: the two numbers differ by exactly the interleaving this measurement exists to characterise. What is recorded instead is the read counter's value at each of the bracket's boundaries, which puts every read on one side or the other of the placeholder write — the observable the interleaving question actually needs.

Where a timing figure below is explained by an interleaving, the interleaving is named as the **explanation** and never quoted as a measured quantity.

## Harness

[`packages/drag2/tests/perf/m4-prime.browser.test.ts`](../../tests/perf/m4-prime.browser.test.ts), checked in. The structural rows — the read placement, its falsification, the equivalence check and the instrument pins — run in CI on every suite run; the timings are opt-in with `VITE_DRAG_MEASURE=1` and assert nothing.

| Input | Value |
| --- | --- |
| **Engine** | Google Chrome for Testing **150.0.7871.24**, headless, via `@vitest/browser-playwright` (`playwright-core` 1.61.1) |
| **Runner** | Vitest 4.1.10, Node v26.4.0 |
| **Machine** | Linux 7.1.8-200.fc44.x86_64, i7-1255U devcontainer, shared CPU |
| **Workload** | q7's, unchanged: `n` 40px rows in a 300×400 `overflow: auto` container, one placeholder moved **one slot** per iteration so every iteration starts genuinely dirty. `n ∈ {50, 200, 800}` |
| **Compositions** | `y()` and `xy()` as **separate** compositions, each with and without `layoutAnimation()`. Never a combined axis configuration — exactly one axis feature installs |
| **Sampling (batched arms)** | q7's, unchanged: 5 discarded warm-ups, a calibrated batch doubling until a sample clears 2 ms, 21 samples, **median** |
| **Sampling (paced arms)** | 20 discarded warm-up frames, then 160 committed moves at **one per real animation frame**; per-move mean |
| **Clock** | `performance.now()`, measured grain **0.100 ms** (reported by the harness itself, not assumed) |
| **Equivalence** | asserted before any ratio is quoted — see §The stride arm |
| **Runs** | 7 batched, 4 paced, over one afternoon; every figure below is reproduced across runs and the spread is stated where it matters |

### Operational rules applied

- **One measurement file per run.** Every figure comes from a run of this file alone.
- **Every arm disposes before the next is built** (the rule M-1′ added). Each arm builds a fixture, a controller and a document-level pointer listener; `withArm()` disposes in a `finally` and removes the arm from the `afterEach` list, so no two measured controllers are ever live.
- **Reads are counted per element, never on `Element.prototype`.** The prototype is shared with every other browser-mode file in the same page; a prototype patch would count the suite instead of the bracket.

### The one place the harness is not the deployed shape, and what it costs

The behavior coalesces the spatial search into one `requestAnimationFrame` task, so a committed move per iteration costs a real frame and q7's calibrated batch cannot exist over it. The **batched** arms capture that callback and invoke it from the harness — the same callback the browser would run, so the bracket, its hooks and its reads are untouched, but the browser never renders between two committed moves.

That is a real difference and it is not argued away: the **paced** arms exist beside the batched ones and run one committed move per real frame, which is what a drag does. The comparison below reports both, and **the absolute per-move figures quoted as telemetry are the paced ones**. The batched figures are what is comparable to q7's table, because they were taken under q7's policy.

## Result 1 — where a committed move reads (structural, exact, asserted in CI)

Per committed move, at steady state, `y()` with `layoutAnimation()`:

| segment | reads | what they are |
| --- | --- | --- |
| resolve (outside the bracket) | **1** | the incumbent placeholder's centre — P-03's read |
| `beforeMove` span | **2** | the crossed row, plus the one still in flight from the previous move |
| **placeholder write** | **0** | `movePlaceholder` reads no geometry |
| **eager rebuild** | **n − 1** | every candidate in the destination view |
| `afterMove` span | **2** | the same rows, measured again for the FLIP delta |

Without `layoutAnimation()` the span and `afterMove` rows are **0** and the bracket is the rebuild alone. `xy()` produces the identical rebuild count. The span is a property of the **move**: at `n = 50` and `n = 200` it is the same 2 reads while the rebuild goes 49 → 199.

**M-4's answer survives the re-run, and it survives it on the real bracket rather than on a synthetic shape.** The displacement feature still measures the span and not the destination view.

### Falsification of the read placement

A boundary pattern that a fixed-shape counter could also produce is not evidence. Two rows inject 7 reads the library does not make, into the two hooks that bracket the write, and require the counter to attribute each to the segment that ran it **and to leave the other segments untouched**:

- 7 reads inside `beforeInsertionMove` → span goes 2 → 9, rebuild and `afterMove` unchanged.
- 7 reads inside `afterInsertionMove` → `afterMove` goes 2 → 9, span and rebuild unchanged.

A third row requires the rebuild count to **scale with the collection** (49 at `n = 50`, 199 at `n = 200`), which a constant cannot satisfy. Two further rows pin the driver itself: `step()` throws unless exactly one bracket ran, and the placeholder is asserted to occupy a **different slot** after an odd step than after an even one — so the counted brackets are real DOM moves and not hook calls.

The falsifier also caught a real defect in the instrument. The head boundary originally injected its reads _before_ taking the entry mark, so the injected reads were credited to nothing and the row failed with `7` where `14` was required. Had the falsifier not been written, the span segment would have silently under-reported anything happening at the top of the bracket.

## Result 2 — the rebuild's share of one committed move

**Paced: one committed move per real animation frame.** Per move, in ms:

| composition | n | resolve | span | rebuild | afterMove | **move total** | **rebuild share** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `y()` + `layoutAnimation()` | 50 | 0.226 | 0.074 | 0.489 | 0.530 | **1.36** | **36%** |
|  | 200 | 0.187 | 0.061 | 0.776 | 0.449 | **1.51** | **51%** |
|  | 800 | 0.340 | 0.080 | 2.676 | 0.735 | **3.86** | **69%** |
| `y()` bare | 50 | 0.041 | 0.002 | 0.414 | 0.004 | **0.52** | **80%** |
|  | 200 | 0.036 | 0.001 | 0.879 | 0.005 | **0.96** | **92%** |
|  | 800 | 0.049 | 0.003 | 3.181 | 0.006 | **3.29** | **97%** |

**Batched, under q7's policy**, median per move — the figures comparable to q7's table:

| composition | n | bracket | rebuild (of bracket / of move) | afterMove | resolve |
| --- | --- | --- | --- | --- | --- |
| `y()` animated | 50 | 0.144 | 0.081 (57% / 35%) | 0.069 | 0.088 |
|  | 200 | 0.350 | 0.225 (64% / 43%) | 0.113 | 0.175 |
|  | 800 | 1.000 | 0.800 (80% / 62%) | 0.200 | 0.300 |
| `y()` bare | 800 | 0.775 | 0.775 (100% / 97%) | 0.000 | 0.025 |
| `xy()` animated | 800 | 0.950 | 0.750 (79% / 56%) | 0.200 | 0.400 |
| `xy()` bare | 800 | 0.775 | 0.775 (100% / 97%) | 0.000 | 0.025 |

**Answer to (a): the eager rebuild is the dominant term.** It is 80–97% of a committed move in a bare composition at every size, and 36–69% with `layoutAnimation()` composed, rising with `n`. `xy()` behaves as `y()` does; the two-dimensional rule reads the same candidate set and pays the same price for it.

The one place it is _not_ a majority is `y() + layoutAnimation()` at 50 rows, where it is 36% and the FLIP's own `animate()` calls in `afterMove` are the same size. That is stated because it is the shape of the answer: **the rebuild's dominance is a function of list length**, which is exactly what a full-candidate pass should look like, and at the sizes where a committed move costs anything at all it is the term.

**The placeholder write is not measurable in any arm** — 0 reads and 0.000 ms at every size. The bracket's cost is entirely its two readers.

### Two segment shares that do not sum to the whole

Each field's figure is an independent median over 21 samples, so the four segment medians need not add to the bracket median; the residual is 2–7% and is a property of taking medians per field, not an unaccounted segment. The `span` segment is 2 reads and lands under the batched arms' per-sample resolution (0.003–0.05 ms, printed with every row) in most arms — where it reads `0.000ms` that is a resolution floor and not a measurement of zero. The paced arms resolve it: **0.05–0.09 ms**, flat in `n`.

## Result 3 — P-02, the six-scalar stride

The instrument is a **real alternative composition**, not a synthetic loop: `narrow()` in the harness is `y()`'s rule line for line — the same I-36 barriers, the same traversal, the same reads — against a stride-**1** buffer holding only the centre the rule consumes.

**The equivalence check is asserted before any ratio is quoted**, in three CI rows: over a 12-step driving script the two axis features must commit the **identical sequence of placeholder slots**, with and without `layoutAnimation()` composed, and must read the identical candidates in the identical segment. A trace that never moved would satisfy that trivially, so the trace is also required to visit two distinct slots.

Rebuild time, stride-1 ÷ stride-6, seven runs:

| n       | ratio                                        |
| ------- | -------------------------------------------- |
| 50      | 0.79, 0.86, 0.86, 0.90, 1.00, 1.00, 1.39     |
| 200     | 0.89, 0.94, 0.97, 0.97, 1.00, 1.03, 1.10     |
| **800** | **0.86, 0.88, 0.90, 0.90, 0.93, 0.94, 0.97** |

**P-02's time half does not open, and it closes as an accepted, named cost.** At 800 rows the narrower cache is consistently but slightly cheaper — about **8%** of the rebuild, ≈0.06 ms, which against a paced committed move of 3.3 ms is **under 2%**. At 200 rows and below the difference straddles 1.0 and is not resolvable at the harness's grain.

The reason is q7's own finding, now confirmed on the real rebuild: **the read loop dominates and the stores do not.** Five extra `Float64Array` writes per candidate are not what a full-candidate pass costs; `getBoundingClientRect()` is.

**P-02's retention half is untouched by this measurement and is not closed by it.** The 6.29 MB high-water buffer is a heap claim, it is measured against a heap policy, and it belongs to M-2′ rather than here.

## Result 4 — P-03, the placeholder read on every resolve

P-03 says a clean resolve still reads placeholder geometry. It does: exactly once, asserted structurally above.

The first reading of it was **wrong, and the arm that corrected it is why this section exists.** On a _committing_ frame the resolve segment reads 0.18–0.34 ms with `layoutAnimation()` composed against 0.04–0.05 ms without it — a 5–7× gap for the same single read, explained by the animations the previous frame's `afterMove` started. Quoted alone, that reads like a 0.3 ms per-frame tax and P-03 opening.

But **most frames of a drag commit nothing**, and that is P-03's own case — the clean resolve. The `idle` arm holds the pointer inside the slot the placeholder already occupies, asserts that **zero** brackets ran, and measures 160 such frames:

| composition                 | n   | resolve, per frame |
| --------------------------- | --- | ------------------ |
| `y()` + `layoutAnimation()` | 50  | 0.026 – 0.044 ms   |
|                             | 800 | 0.049 – 0.056 ms   |
| `y()` bare                  | 50  | 0.033 – 0.046 ms   |
|                             | 800 | 0.034 – 0.054 ms   |

**P-03 does not open, and it closes as an accepted, named cost of ≈0.04 ms per frame.** The figure is flat in list size — 800 rows costs what 50 does — and flat in whether a displacement feature is composed, which is what a single read of one element should look like. It is **0.2–0.3% of a 16.7 ms frame**.

The committing-frame figure is not the counter-argument it looks like: on a frame that commits, the move itself already costs 1.4–3.9 ms, and the resolve read is 9–17% of it — smaller than the rebuild it sits beside, and paid on a minority of frames.

## Telemetry — the 800-row figure against q7's 2.3 ms

q7 recorded that a full-list FLIP around one committed move costs **2.3 ms** at 800 rows and rejected that shape, choosing the span. The real bracket, with the span **and** the eager rebuild in it, costs **3.5 ms** per committed move at 800 rows in the paced regime (3.9 ms including the resolve).

**That is not a reversal of M-4's answer and must not be read as one.** The 2.3 ms q7 rejected was the displacement half alone measured over the whole list; the displacement half here measures the span and costs **0.08 ms**, which is the saving M-4 bought and it is intact. What sits beside it is a different reader that q7's table never contained: the axis feature's full-candidate rebuild, which had not yet moved into the bracket when q7 was written.

For continuity, q7's own harness reproduces on this machine two Chromium majors later at `one=0.825ms two=1.300ms write-between=2.300ms span=0.175ms` (800 rows) against its recorded `0.675 / 1.200 / 2.300 / 0.156`. The batched rebuild here, 0.775–0.800 ms at 800 rows, is q7's `one` — a forced layout plus a full read pass — as it should be, since that is what the rebuild is.

## What this closes, and what it explicitly does not

- **(a) closes.** The eager rebuild is the dominant term of a committed move.
- **(b) closes both ways.** P-02's time half and P-03 both close as accepted, named costs, each with a figure and a size dependence.
- **(c) closes.** The rebuild's contents do not need to shrink: the stores are ~8% of it at 800 rows and unresolvable below that. What the rebuild costs is reading the destination view, and the rule is defined over the destination view.
- **The eager position is not re-decided, and no evidence here bears on it.** It was chosen for correctness — a lazy rebuild measures items mid-animation — and the contract fixes in advance that a cost number is not evidence against a correctness placement. Nothing in this run is offered as such.
- **The collection-mutation half stays structurally discharged** and was not re-opened: the bracket runs inside one `action.effect` and the queue is run-to-completion, so no replacement can interleave.
- **P-02's retention half is not closed.** It is a heap claim and belongs to M-2′.

## What would reopen this

- A list where a single committed move crosses **many** slots. The span is O(distance), so a fast flick degrades the displacement half toward q7's full-list number while the rebuild stays O(list). The balance between the two terms is workload-dependent and only the one-slot move is measured here.
- An axis rule that does not need every candidate's geometry — a rule with a spatial index, or one that reads only the neighbourhood of the pointer. That would shrink the dominant term, which is the only thing that would.
- An engine whose `getBoundingClientRect()` over a settled tree is not the cost of a full-candidate pass. The stride result is a statement about Chromium's ratio of a layout-facing read to five typed-array stores.