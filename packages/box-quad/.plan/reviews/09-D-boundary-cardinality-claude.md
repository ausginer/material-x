# Iteration D — BQ-2's cardinality attacked, and the accidental limit removed

The hypothesis put to falsification, before BQ-2 freezes:

> If all boundaries are known before measurement, supporting several of them may be nearly as cheap and much more general than hard-coding exactly one.

**Half of it is confirmed and half is falsified, and the two halves point in opposite directions.** The runtime claim is right — the arithmetic is free, and BQ-2 must never be defended on runtime. The cheapness claim is wrong by 3.2×, and the reason is that the cost was never the storage the hypothesis correctly identifies as caller-owned. But the hypothesis also exposed a real defect in BQ-2 as written, which is fixed here for **3 bytes**.

Every arm is built on **arm K**, the cacheless baseline BQ-6 leaves behind, so these figures supersede BQ-2's, which were taken against the cached baseline.

## 1. The measurements

| Arm | Encoding | brotli, whole | brotli, **as consumed** | **Δ vs K** |
| --- | --- | --- | --- | --- |
| **K** | cacheless baseline (BQ-6) | 1150 | 1147 | — |
| **M** | one boundary, `BOX_LENGTH` 13 → 17 | 1201 | 1199 | **+52** |
| **M2** | one boundary, `box(q)` caller capacity | 1206 | 1202 | **+55** |
| **L** | N boundaries, rest arg, per-node scan | 1322 | 1312 | **+165** |
| **L2** | N boundaries, array arg, `indexOf` | 1329 | 1318 | +171 |
| **L3** | N boundaries, one accumulator, divide at the end | 1365 | 1355 | +208 |

**Multiple boundaries cost +110 B over the singular form** — 3× it. Two leaner dispatches were tried and both came out **worse**: replacing the rest parameter with an array and the per-node scan with `indexOf` costs 6 B more, and collapsing to a single accumulator with a right-division at the end costs 43 B more, on top of being numerically fragile where a degenerate ancestor makes the prefix non-invertible.

That is the answer to the hypothesis's own premise. **The hypothesis is right that storage is caller-owned and therefore free — and that is why it does not help.** The cost of cardinality is not the four slots per boundary; it is the _dispatch_: a per-node test of which boundary this is, a per-node loop over the started accumulators, a found-set to decide the all-or-nothing return, and the identity initialization. Making the output variable-length does nothing about any of it.

## 2. Runtime — the hypothesis is right, and this is not a runtime argument

1500 measurements per cell, Chromium, boundaries spread evenly through the chain:

|  | N=0 | N=1 singular | N=1 | N=2 | N=4 | N=8 |
| --- | --- | --- | --- | --- | --- | --- |
| depth 12 | 148.3 µs | 150.7 µs | 137.3 µs | 124.1 µs | 134.5 µs | 121.9 µs |
| depth 30 | 307.1 µs | 313.3 µs | 291.5 µs | 309.9 µs | 303.6 µs | 293.7 µs |

**Eight boundaries at depth 30 are not measurably more expensive than none.** The spread is ±10% and unordered — N=8 lands below N=0 at both depths — which is the signature of noise, not of a cost. Every figure is dominated by ~10 µs per node of `getComputedStyle`, and the boundary arithmetic is four multiplies and two adds per started accumulator per node, which does not register against it.

So the arithmetic scales for free in both N and depth, exactly as the hypothesis predicts. **BQ-2's singular cardinality has no runtime defence and must not be given one.**

Correctness is equally clean: N boundaries taken in one walk agree with N separate singular walks **to 12 decimal places**, all from one DOM observation with nothing retained after the call. The multi-boundary form is a coherent primitive, not a hack.

## 3. Why it still loses

**3.1 At this price the better purchase is one we already declined.** Arm L costs 1312 B as consumed. Arm G — the retained `Ancestry`, cacheless — costs **1305**. The two are within 7 B of each other. BQ-5 declined `Ancestry` at that price, and multi-boundary asks for the same money to buy **strictly less generality**: `Ancestry` lets a boundary be chosen after the walk, multi-boundary requires every boundary up front.

The honest complication is that multi-boundary is the _safer_ of the two at equal price — it retains nothing, pins no DOM, opens no staleness window, and answers from one observation, so every one of BQ-5's non-price objections evaporates. **If ~+160 B is ever affordable for generality here, this is the shape to buy, not `Ancestry`.** But neither has a consumer, and paying `Ancestry`'s price for less than `Ancestry` is the worse of two purchases already refused.

**3.2 Caller-owned variable capacity introduces a failure mode fixed cardinality cannot have.** Demonstrated in Chromium rather than argued, because the two plausible ways to write the results fail differently and both are unacceptable:

```
RESULT set() threw=RangeError out partially written=true
       | per-slot out-of-range write kept=false value=undefined
```

- **`out.set(space.outer, BOX_LENGTH)`** throws `RangeError` when the caller under-allocates — but only _after_ writing slots 0…12, so the call that reports the problem has already broken the atomic-output guarantee, and it does so by an escaping exception, which the contract reserves for unexpected platform errors.
- **Per-slot writes** are worse: an out-of-range typed-array write is a **silent no-op**, so the same mistake returns `true` with a space quietly missing — the exact class that condemned BQ-3's naive encoding.

A correct implementation must therefore validate `out.length` and return `false`, which costs _more_ bytes on top of the +110. **The singular form needs none of this**, because its required length is a single constant that the suite's `should allocate storage of the required length` already asserts.

**3.3 Smaller frictions, each real.** `BOX_LENGTH` stops being a constant, so no test can assert the length any more. Results are addressed by arithmetic — `BOX_LENGTH + 4k` against argument order — where one boundary is a named slot. The found-set is a bitmask, so N is silently capped at 31, an arbitrary limit that would have to be published. And all-or-nothing failure cannot say _which_ boundary was off the chain, where a singular `false` is unambiguous.

**3.4 No consumer, and the reason is structural rather than incidental.** `@ydinjs/drag2` needs two spaces from its one call: above the **visual**, which the existing `ancestorMatrix` slots already publish, and above the **item**. A third would need a third element that is simultaneously on that flat-tree chain and meaningful to the consumer. Nothing asks, and no shape in the package's brief suggests one.

## 4. What the hypothesis was right about, and what it fixes

**BQ-2 as written does bake an accidental limit into the public surface, and this is the finding worth the experiment.** It fixes `BOX_LENGTH` at 17 — the boundary's four slots are always allocated, whether or not a boundary is passed. Under that shape, a later move to variable cardinality would have to _shrink_ `box()` from 17 back to 13, which breaks every caller that allocated with `box()` and passed a boundary. **The accidental limit is not the cardinality; it is the allocator.**

Arm **M2** removes it. `box(boundaries = 0)` returns `BOX_LENGTH + 4q`; the singular API asks callers to allocate `box(1)`; the boundary's slots live at `BOX_LENGTH + 4k` with `k = 0`, which is exactly where a multi-boundary form would put the first of N. **Cost: +3 B** over arm M, and 1202 against K's 1147.

That is the whole of the forward compatibility, for 3 bytes: extending to N later becomes purely additive — a new overload writing further slots that today's callers never allocate and never read — instead of a breaking change to `box()`. It also puts `Box` back to 13 slots for every caller that wants no boundary, which the ordinary measurement path does.

## 5. What is decided

**BQ-7 supersedes BQ-2.** Cardinality stays **one**, on §3's four grounds and explicitly _not_ on runtime. The allocator becomes **caller-owned variable capacity** so the cardinality is a current limit rather than a surface commitment.

Required properties, encoding still left open:

1. `box()` allocates the ordinary measurement; a caller wanting the boundary space allocates additional capacity explicitly.
2. The boundary space occupies the slots immediately after the ordinary measurement, at the position the first of several would occupy.
3. `BOX_LENGTH` remains a constant _for the ordinary measurement_, so the existing length assertion keeps a subject.
4. A boundary absent from the flat-tree chain remains a recognized `false`, unchanged from BQ-2.
5. Insufficient output capacity must be **recognized**, not discovered by a partial write — neither an escaping `RangeError` after slots are committed nor a silently dropped write is acceptable. With cardinality one this is a length the implementation already knows.
6. Extending to N boundaries later must remain additive: no existing caller's allocation or slot indices may move.

**The figures BQ-2 recorded are superseded, not merely restated.** BQ-2's **+40 B** was measured against the cached baseline that BQ-6 has since removed. Against the cacheless baseline the same capability is **+52 B**, and the forward-compatible form is **+55 B** — still less than the **−46 B** BQ-6 returns, so the pair remains net negative at **−9 B** for drag2 as it consumes the package.

## 6. Method

Six arms built on the cacheless baseline, typechecked `--strict`, measured through the repository's Rolldown-plus-brotli pipeline. Multi-boundary results cross-validated against singular walks to 12 decimal places in Chromium; both capacity failure modes demonstrated in a browser; the cost model run at two depths and four cardinalities. Arms were built outside the repository and probes removed; no production file was modified.