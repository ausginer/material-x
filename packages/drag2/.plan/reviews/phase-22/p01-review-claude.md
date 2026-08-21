# P-01 — independent review of the write-cost measurement and the D-105 decline

- **Reviewer:** Claude
- **Date:** 2026-08-21
- **Subject:** [`p01-write-cost.md`](../measurements/p01-write-cost.md), its harness [`p01-write-cost.browser.test.ts`](../../tests/perf/p01-write-cost.browser.test.ts), and D-105's ledger row
- **Tree:** `bdb62398` on `drag2/phase22-p01`, working tree clean

**Scope.** The measurement and the decision, by independent re-running and recomputation rather than by reading the arithmetic. P-02's stride sub-candidate, the committed-move forced flush, P-04, P-05 and any gate design are out of scope and were not opened. Every figure below is from my own runs on this tree; `git status --short` is empty at the close.

## Baseline

| Gate | Result |
| --- | --- |
| `npx just typecheck` | clean |
| `npx just test` | 58 files, **1125 passed, 114 skipped** |
| production diff `45155dcd…bdb62398 -- src/ bench/` | **empty** |

## Verdict

**P-01 can be considered closed, and the decline is correct.** The central correction is sound and it reproduces: deployment issues **one write per pointer dispatch** — measured at 1.01 requests per dispatch — so D-99's premise that the second through eighth write is _a CSSOM set and little else_ describes a regime a free drag never enters. The dirty-tree figure that would have confirmed D-99 to three significant figures is a true measurement of an unreachable regime, and saying so is the run's real contribution.

**The figure the decline actually rests on reproduces exactly.** Across ten runs — the record's three and my seven — the typical frame at M-6's primary pace is **17.9–24.6%** of the 160 µs bar, against the record's stated 18–24%.

**What does not reproduce is the margin.** Eight findings follow, none of which overturns the decline. Two matter: arm E has no null control, and its noise floor reaches **5.6 µs per write** against a wave-4 signal of 10–21 µs; and the reported ranges are the range of three runs presented as bounds — the wave-4 tail spans **43–94%** of the bar over ten runs, not "at worst 63%".

| # | Finding | Class | Overturns the decline |
| --- | --- | --- | --- |
| P01-01 | arm E has no null control; its noise floor is up to 5.6 µs/write | instrument | no |
| P01-02 | quoted ranges are three runs presented as bounds | figure stability | no |
| P01-03 | the retained write is priced at the in-dispatch cost, undisclosed and one-directional | accounting | no |
| P01-04 | _there is no cheap tail_ is asserted without the numbers that would show it | unevidenced claim | no |
| P01-05 | the record misdescribes the arithmetic error it corrects | documentation | no |
| P01-06 | the fact that falsifies D-99 is pinned by no structural row | coverage | no |
| P01-07 | the four-path flush obligation is not checked against the shipped lifecycle | unevidenced claim | no |
| P01-08 | one of three reopening conditions is not a measured quantity | framing | no |

## What holds up

Recorded first, because most of this run is right and a findings list alone would misreport where the effort went.

**The deciding structural fact is real and I measured it independently.** At wave 2 the gated flood records 1 130 requests against 1 118 dispatches — **1.01 writes per dispatch**. There is no window in which two visual writes occur without an input dispatch between them, which is exactly the premise D-99 assumed and the reason the dirty-tree regime is unreachable. The correction is not rhetorical.

**Each pace is scored against its own census, and the pace matching is correct.** M-6 records p95 = 3 at wave 2 over 96 ticks and p95 = 8 at wave 4 over 24 ticks, and flags the wave-4 denominator itself; the record inherits that caveat rather than burying it, and never applies one wave's tail to the other's price.

**The coalescing cross-check is stronger than the record claims.** My runs read **2.25** requests per commit at wave 2 and **5.29** at wave 4 — M-6's means are 2.25–2.27 and 5.25–5.38. That is agreement to three significant figures from a different harness and counter.

**Gate overhead is accounted for correctly, and in two places.** In arm E the gate's `request` and its `requestAnimationFrame` both execute inside the bracketed dispatch, so the measured delta has already netted them out; arm D subtracts them explicitly as `(w − 1) × marginal − (w × perRequest + perSchedule)`. I reproduced 0.030 µs per request and 0.088 µs per schedule. The record's conclusion that the gate's runtime cost is not what declines it is correct.

**A confound I expected is not present.** The delta is a difference of totals, so unequal dispatch counts between the arms would contaminate it. Measured: 1 106 ungated against 1 118 gated at wave 2, and 767 against 760 at wave 4 — within 1%.

**The structural rows are load-bearing.** I mutated the prototype gate three ways: `flush()` as a no-op fails **1** row, committing immediately without coalescing fails **3**, and a non-idempotent flush fails **1**. The clock granularity reproduces at 100 µs and the Bernoulli null control at 0.00–0.90 µs.

**Nothing was implemented.** The production diff is empty, which is what D-99 required.

---

## Findings

### P01-01 — arm E has no null control, and its noise floor is a substantial fraction of the wave-4 signal

**Observed.** The record presents a null control prominently — _its null control is reported beside every use … 0.0–0.6 µs throughout_ — but that control belongs to the **quantized-Bernoulli** estimator in arm A. Arm E, the arm the record calls _the deciding arm, because it needs no model_, has no equivalent. Its only protection is alternation, which controls for monotonic drift and not for a systematic difference between two floods.

**Evidence.** I added the missing control: the identical `open/shut/shut/open` alternation over three rounds, with **both** arms ungated, scored through arm E's own formula. Three repetitions:

|  | wave 2 | wave 4 |
| --- | --- | --- |
| null control, per "write" | −2.99, +0.09, **+4.17** µs | **+5.62**, +1.41, −0.13 µs |
| arm E signal, same runs | 19.4–29.8 µs | 11.6–21.4 µs |

**At wave 4 the instrument's own noise reaches 5.62 µs against a signal of 10–21 µs** — up to half. At wave 2 it reaches 4.17 µs against 19–30 µs, roughly 15–20%.

This does not make arm E wrong; the signal clears the floor at both paces in every run. It means the **precision** the record's figures are quoted to — three significant figures on a per-write cost, one decimal on a percentage of the bar — is not the precision the instrument has, and it is the direct cause of P01-02.

### P01-02 — the quoted ranges are the range of three runs, presented as bounds

**Observed.** The record states the end-to-end write at **10–23 µs** and the worst surplus at **63%** of the bar, and D-105 repeats both. The verdict reads _the worst reading in nine measurements is 63% of D-99's bar_ and _Every reading of every arm, at both paces, is under the bar_.

**Evidence.** Seven independent repetitions on this tree and this machine, combined with the record's three:

| quantity              | record's 3 runs | all 10 runs      |
| --------------------- | --------------- | ---------------- |
| wave 2, typical frame | 18.0–23.9%      | **17.9–24.6%** ✓ |
| wave 2, tail frame    | 22.3–29.2%      | 22.3–**37.3%**   |
| wave 4, typical frame | 33.0–44.8%      | 31.0–**60.0%**   |
| wave 4, tail frame    | 43.2–**63.3%**  | 43.2–**93.8%**   |
| per-write, wave 2     | 17.9–23.3 µs    | 17.9–**29.8 µs** |

**The primary-pace typical frame reproduces exactly**, which is the reading the decline is argued from and the reason the verdict survives. Everything else is wider than stated: one wave-2 per-write reading is 29.8 µs, outside the _10–23 µs_ bracket the record and D-105 both headline, and the wave-4 tail reaches **93.8%** where the record says 63%.

The claim _every reading is under the bar_ is still true at 93.8%. But _declined by a factor of two to five_ is the record's own summary of its margin, and at the observed worst the factor is **1.07**. A range of three runs is not a bound, and this record states it as one twice.

### P01-03 — the retained write is priced at the in-dispatch cost, undisclosed and in one direction

**Observed.** Arm E computes `perWrite = delta / ungatedWrites` — correctly dividing by **all** the writes that left the bracket, since the gate moves rather than deletes them — and this is the corrected form of the error the record documents. It then computes the surplus as **`(n − 1) × perWrite`**.

That step prices the one write the gate retains at the full in-dispatch cost. The retained write does not run in a dispatch: it runs in a `requestAnimationFrame` callback, ahead of the frame's own style and layout, on a tree that nothing has dirtied since the last paint. The record's own arm B′ prices a write onto a clean tree at **4.15–6.26 µs**, not 10–30 µs.

**Evidence.** A neutral accounting is `n × perWrite − C_rAF − gateOverhead`, where `gateOverhead` is already netted out inside the bracket:

|  | record's formula | neutral, with `C_rAF` = 4.15 µs |
| --- | --- | --- |
| record's worst run (wave 4, `perWrite` 14.5, p95 8) | 101.3 µs — **63.3%** | 111.8 µs — **69.9%** |
| my worst run (wave 4, `perWrite` 21.44, p95 8) | 150.1 µs — **93.8%** | 167.4 µs — **104.6%** |

**On the record's own three runs the decline survives a neutral accounting** — 69.9% is comfortably under the bar. It is only the combination with P01-02's spread that crosses it, and no single run I took does both. So this does not overturn the verdict.

What it does is make the surplus a **lower bound** rather than an estimate, in the direction of the record's own conclusion, without the record saying so. Given that the same document identifies its error class as _extrapolations from a system adjacent to the one under test … which look like arithmetic rather than assumption when written down_, substituting an in-dispatch price for a rAF price without naming the substitution is that shape again.

### P01-04 — "there is no cheap tail" is asserted without the numbers that would show it

**Observed.** The record's claim is load-bearing for the whole candidate: _Arm A tags each in-situ write with its ordinal inside the rAF tick, because P-01 turns on what the writes at ordinal ≥ 1 cost … They cost **what the first one costs**, within noise, at both paces. There is no cheap tail._

**Evidence.** The instrument table reports arm A **only for ordinal ≥ 1**. The ordinal-0 figures the comparison requires appear nowhere in the record. In my run they are:

| pace   | ordinal 0    | ordinal ≥ 1  | n at ordinal 0 |
| ------ | ------------ | ------------ | -------------- |
| wave 2 | 21.36 µs     | 26.89 µs     | 103            |
| wave 4 | **26.67 µs** | **11.54 µs** | **15**         |

The two paces disagree in direction, and at wave 4 the tail is **2.3× cheaper** than the first write — the opposite of the claim. The wave-4 ordinal-0 bucket holds 15 samples at a 26.7% non-zero rate, i.e. about **four** informative readings, so neither direction is established there.

**This does not threaten the verdict** — a cheaper tail makes the surplus smaller and the decline safer, and arm E measures the aggregate directly without needing the split. But the sentence is stated as a finding, the supporting comparison is absent from the record, and where it is visible it does not hold at one of the two paces.

### P01-05 — the record misdescribes the arithmetic error it corrects

**Observed.** _Arm E's arithmetic was wrong once and the correction matters. … charging it to the removed subset alone would inflate the per-write figure **by the coalescing ratio** and reported 45 µs where the same data says 29._

**Evidence.** Dividing by the removed subset rather than by all moved writes inflates by `r / (r − 1)`, not by `r`:

| ratio `r` | true inflation `r/(r−1)` | record says |
| --------- | ------------------------ | ----------- |
| 2.47      | 1.68                     | 2.47        |
| 2.67      | 1.60                     | 2.67        |

And the record's own quoted pair confirms the smaller factor: **45 / 29 = 1.55**, which is `r/(r−1)`. Had the factor been the ratio itself, 29 would have been reported as 72.5.

Two further slips in the same sentence: 45 and 29 are **typical-frame savings in µs**, not per-write figures — the per-write column of the same document reads 17.9–23.3 µs at that pace, and neither number appears there. In a record whose stated lesson is about arithmetic that reads as fact, the description of its own correction being wrong in the direction of overstating the correction is worth more than its size.

### P01-06 — the fact that falsifies D-99 is pinned by no structural row

**Observed.** The record's central claim is that _deployment interleaves an input dispatch between two visual writes_. It is true, and I measured it — 1 130 requests against 1 118 dispatches, 1.01 writes per dispatch.

**Evidence.** It appears **only** in an opt-in `VITE_DRAG_MEASURE` report. The always-run rows assert that a gated flood coalesces (`requests > writes`) and that dispatches occurred (`dispatches > 0`); neither would fail if the library wrote **twice** per dispatch, which is precisely the world D-99 assumed and this run refutes. The gated arm's dispatch count is not even reported alongside its request count.

So the one fact that turns D-99's premise from _true_ into _inapplicable_ is the one fact nothing in the permanent suite holds. The record itself notes that _structural rows — including the falsification and the flush obligation — run on every suite run_; the falsification that runs is the batch timer's, not this one.

### P01-07 — the four-path flush obligation is not checked against the shipped lifecycle

**Observed.** _A shipped gate owes that on **release, cancel, destroy and the landing hand-off**, permanently_, and D-105 repeats the enumeration. The record calls the obligation _asserted rather than described_.

**Evidence.** The obligation itself **is** asserted, and the rows are load-bearing: a pending request with an unflushed teardown strands the visual, a flushing terminal path catches it up, and a second flush writes nothing — I broke each and each row failed. That much is established.

The **enumeration** is not. No row examines `kernel.ts`, and the shipped lifecycle already performs a terminal write: `session.write(target.x, target.y)` at [kernel.ts:1652](../../src/kernel/kernel.ts#L1652). It is conditional on a non-null target — and on that path a pending gated value would be superseded by the pin, so the flush there is arguably free. The path where the flush is unambiguously owed is the null-target **jump cut**, where _presentation is released from where the visual stands_.

So the obligation is structurally real and cannot be made free in general; the specific count of four paths, and the claim that none of them already covers it, is asserted about code this run did not inspect. Since the decline is argued as _the obligation against the size of the prize_, the cost side of that trade is the half with less evidence behind it.

### P01-08 — one of three reopening conditions is not a measured quantity

**Observed.** _Stated as conditions rather than invitations. Any of these moves the surplus toward the bar, and **none is speculative — each is a quantity this run measured**._

**Evidence.** Two of the three hold. _A behavior that writes more than once per sample_ names a quantity this run measured at ~1. _A pointing device above ~300 Hz_ correctly quotes M-6's ~309 /s for wave 4 and pairs it with a surplus measured here.

The third — _A cheaper obligation. If a flush on the four terminal paths ever becomes free for an unrelated reason_ — measures nothing, is a hypothesis about future unrelated work, and does not _move the surplus toward the bar_: it lowers the cost side of the trade, not the benefit side. The blanket sentence is false for it on both counts, which is the shape the sentence was written to prevent.

---

## The three instrument defects

The record names three corrections. All three are real and all three are carried into the final figures:

1. **The batch arms were timing the recording accessor.** The recorder is detached in every measuring arm; the falsifier row that caught it runs on every suite run and I confirmed it discriminates a forced layout read from a write by more than 2×.
2. **Arm E divided by the removed writes rather than all moved writes.** The shipped code divides by `ungatedWrites` and carries a comment explaining why. Corrected — though its _description_ is not (P01-05).
3. **The write was measured in one arm and re-measured in another an order of magnitude apart.** Arms B, C and D now share one run of frames, and the break-even is arithmetic over numbers taken in one session. Confirmed in the source.

A fourth, unnumbered, is also corrected: `WARMUP` frames are discarded, against the non-monotonic `n=500` reading the first run produced.

**No stale figure from any of the three survives in the record**: the 45 µs number appears only in the sentence documenting its own withdrawal, and the dirty-tree figure is quoted only as the regime the deployment never enters.

---

## Disposition

**P-01 is closed, and the decline stands.** The verdict is right, the correction to D-99 is the substantive result, and the reading the decline is argued from — the typical frame at the primary pace — reproduces across ten runs at 17.9–24.6% of the bar.

**Nothing here asks for the decision to be revisited.** P01-01 through P01-03 concern how tightly the margin may be quoted, not which side of the bar it falls on; P01-04 through P01-08 are claims stated more strongly than the run supports.

**If one thing is carried forward it should be P01-06**, because it is cheap and it is the fact the whole decision turns on: one assertion that the deployed path issues one write per dispatch would make the permanent suite hold the premise D-99 got wrong, so a future behavior that starts writing twice per sample trips a row rather than requiring someone to re-read this record.

**LSP plugin - available; not used: this review turned on re-running a timing harness under real pointer input, adding a missing null control, mutating a prototype gate to test its rows, and recomputing the record's arithmetic — run-and-measure questions rather than symbol-graph ones. The one source question, where the shipped path writes the transform, was a two-line grep.**