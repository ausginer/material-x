# P-02 shrink — final review of the RectIndex retention policy

- **Reviewer:** Claude
- **Date:** 2026-08-21
- **Subject:** the D-104 retention shrink as implemented, against [`p02-retention-shrink.md`](../p02-retention-shrink.md), [`measurements/p02-shrink.md`](../measurements/p02-shrink.md) and D-104's ledger row
- **Tree:** `d34d2ee4` on `drag2/phase22-p02-retention`, working tree clean

**Scope.** The shipped policy against the design and the measurement record, by falsification rather than redesign. Stride narrowing, P-06 and P-01 are out of scope and were not reopened. Every claim below was checked by mutating the tree, running the gates, and restoring it; `git status --short` is empty at the close.

## Baseline

| Gate                 | Result                                 |
| -------------------- | -------------------------------------- |
| `npx just typecheck` | clean                                  |
| `npx just test`      | 57 files, **1118 passed, 108 skipped** |
| `npx just size`      | green, all **12** rows within budget   |

## Verdict

**The shipped policy is sound, and nothing blocks merging this slice.** All seven questions put to this review are answered in the implementation's favour, and three of them are now verified over a strictly wider domain than the record claimed. The branch is correct; what is wrong is the _record of it_.

**Six findings, none of them a correctness defect in `src/`.** Three are wrong or unpinned figures in the authoritative records, two are coverage gaps where a plausible wrong implementation survives the suite, one is a mutation-count drift. The most consequential is P02-03: the single failure mode that would silently void the entire policy is caught by nothing, because the harness's instrument cannot see it.

| # | Finding | Class | Blocks merge | Disposition |
| --- | --- | --- | --- | --- |
| P02-01 | the reclaim upper bound is wrong in two authoritative records and one test comment | documentation, internal contradiction | no | **fixed** — both ends asserted, three records corrected |
| P02-02 | the 126-failure falsifier measures the untouched growth path, not the shrink | evidence framing | no | **fixed** — reframed as a growth-path falsifier, three shrink readings tabulated separately |
| P02-03 | a shrink that returns a **view** onto the retained buffer passes every test | coverage — the instrument cannot see reclaim | no | **fixed** — reclaim arms read `values.buffer.byteLength`; the mutation goes 0 → 6 |
| P02-04 | both equivalence arms compare `count` after `retire()`; one compares zero slots | vacuous assertions | no | **fixed** — `scan()` leaves the cache warm; 1 794 scalars and a literal count compared |
| P02-05 | the published cost figures do not match the built artifacts, and the headroom wording is stale | documentation | no | **fixed** — measured deltas published, ~150 B convention retired at 114–139 B |
| P02-06 | `exactfit` reproduces at 6 not 5; the growth-only mutation is absent from the table | mutation-count drift | no | **fixed** — table rebuilt with a stated scope and the growth-only row added |

## What was verified, and how

### 1. Growth semantics are unchanged by combining the branches — verified exhaustively

The combined branch is [rect-index.ts:168-182](../../src/sortable/rect-index.ts#L168-L182). I did not take the argument on inspection: I ran the old predicate and the new one side by side over every reachable `(capacity, list.length)` pair — `capacity` across `0` and every power of two to 8192, `list.length` across `0…8192`.

| quantity | result |
| --- | --- |
| growth cases compared (`list.length > capacity`) | **106 497** |
| divergences in resulting capacity or in the allocated size | **0** |
| shrink firings observed | 4 096 |
| firings that did **not** allocate strictly less than they freed | **0** |

The settle guard is what makes this exact rather than approximate: whenever the first disjunct fires, `fitted = capacityFor(list.length) ≥ list.length > capacity`, so `fitted !== capacity` is true by construction and the same buffer is allocated as before. §What landed's claim that _the growth path is semantically identical_ is correct.

The `n = 0 ∧ capacity = 0` corner behaves as §What landed describes — neither trigger fires, and a cache asked only for an empty collection allocates nothing at all. Pinned by [p02-shrink.browser.test.ts:309](../../tests/perf/p02-shrink.browser.test.ts#L309).

### 2. The 4× hysteresis cannot shrink a fitted buffer, and cannot churn a stable size

The record proves this for `n` from 1 to 4096. I extended it to **100 000**: `capacityFor(n) > 4 × n` is false at every one, so no fitted buffer trips the gate at any size the library can reach. The anti-churn property is a consequence of the doubling scheme exactly as derived.

The constant is pinned from **both** sides, which the record does not claim:

| mutation                                          | tests failed |
| ------------------------------------------------- | ------------ |
| gate at `2 ×`                                     | **1**        |
| gate at `8 ×`                                     | **1**        |
| no gate at all (`if (true)`)                      | **2**        |
| remove the shrink trigger (revert to growth-only) | **6**        |

Scope for every mutation run in this review: `tests/sortable` plus [p02-shrink.browser.test.ts](../../tests/perf/p02-shrink.browser.test.ts), 519 tests. The `8 ×` row matters because it is the direction the record leaves open — loosening the hysteresis moves the smallest reclaim from 144 KiB to 168 KiB and drops the 1023-item destination out of the firing set, which [p02-shrink.browser.test.ts:803](../../tests/perf/p02-shrink.browser.test.ts#L803) catches through its `Math.min`.

**Oscillation across the gate is a resize per transition**, and the record discloses this as telemetry rather than a decline trigger. Worth restating only because "churn" is given an unusually narrow definition — _a reallocation on a workload whose collection size never changes_ — under which a collection alternating between, say, 250 and 1025 items reallocates on every transition and is still not churn. That is disclosed, not hidden.

### 3. `n = 0` settles without allocation or repeated reallocation

Confirmed. From a grown cache, an emptied collection performs **exactly one** shrink to 48 B and then settles; the settle guard's removal is caught by 1 test. A cache that never grew allocates nothing. Both arms are real and both fail when the guard goes.

### 4. Shrinking at refresh cannot preserve stale state, corrupt `count`, or disturb retire/liveness

`index.values` has exactly **one** writer in the whole package — [rect-index.ts:180](../../src/sortable/rect-index.ts#L180) — so `capacity` and the buffer cannot desync, and no consumer caches the reference across a `refresh` (both [y.ts:146](../../src/sortable/y.ts#L146) and [xy.ts:100](../../src/sortable/xy.ts#L100) destructure after the call returns; P-06's `shift` and `verify` re-read `index.values` inside each call).

The combination the suite never exercises is **shrink followed by a mid-scan abort** — no P-02 arm passes anything but a constant-true `live`. I drove it directly. Grown to 4096 slots (196 608 B), then refreshed at 100 items with a `live()` that dies after five reads:

| observable | value |
| --- | --- |
| `refresh` returned | `false` |
| `values.byteLength` | **6 144** — the shrink took effect and is the fitted size for 100 |
| `count` | **0** |
| `items.length` | **0** |
| next refresh at 100 with a live controller | `true`, `count` **99**, 6 144 B |

So the abort leaves the cache in exactly the retired state, the shrink is not half-applied, and the next operation recovers completely. Separately, a controller already dead at the **entry** barrier is never resized at all — the barrier precedes the branch — which is consistent with the design and harmless, since a destroyed controller drops the closure and the buffer with it.

### 5. P-06 cannot reuse incremental state across a resize — structurally, not by timing

Two independent reasons, both checked:

- The fast path in [verified-refresh.ts](../../src/sortable/verified-refresh.ts) never calls `index.refresh`, so a resize cannot happen underneath it; the wrapper only delegates when it has already refused the span.
- A resize requires `list.length` to change, and every membership change goes through [spec.ts:1008](../../src/sortable/spec.ts#L1008), which increments `version` and installs a **fresh copy** of `items`. D-100's third condition, `seen === snapshot.version`, therefore fails on exactly the refreshes that can resize. `snapshot.items` also cannot mutate under a stable version.

§What must survive the shrink's claim that _P-06 is not reachable from here_ holds, and for a stronger reason than the one written down (which appeals to the warm path rather than to the version discipline).

### 6. The 2048/2049 boundary is a genuine property of the shipped cache

Reproduced against `createRectIndex` itself. From a 2 049-item high water the buffer is 4 096 slots; the gate needs `4096 > 4 × n`, so it fires only at `n ≤ 1023`, and `capacityFor(1023) = 1024` puts the **smallest** available reclaim at `196 608 − 49 152` = **144 KiB**. No firing from that bucket lands under D-99's ~100 kB, and no destination from the 2 048 bucket clears it. Both directions are asserted structurally and both pass. The _upper_ bound is wrong — see P02-01.

### 7. `xy()` pays a shared cost, and no unrelated boundary moved

Exact brotli bytes, `d34d2ee4` against `685d05de`, taken by re-basing every budget to 1 so each row prints its byte count, on fresh builds of both:

| row                       | before | after  | Δ       | headroom now |
| ------------------------- | ------ | ------ | ------- | ------------ |
| minimal                   | 11 125 | 11 139 | **+14** | 121 B        |
| minimal (xy)              | 10 787 | 10 801 | **+14** | 139 B        |
| minimal + layoutAnimation | 11 557 | 11 571 | +14     | 129 B        |
| minimal + landing         | 11 408 | 11 423 | +15     | 117 B        |
| complete                  | 11 830 | 11 849 | +19     | 121 B        |
| both behaviors            | 13 379 | 13 396 | +17     | 124 B        |
| baseline A                | 11 545 | 11 566 | +21     | 114 B        |
| free drag ×4              | —      | —      | **0**   | 147–154 B    |
| baseline B                | 6 888  | 6 889  | 0       | 151 B        |

**Structurally this is right, and it is right more strongly than the record argues.** `minimal` (a `y()` composition) and `minimal (xy)` pay the _same_ +14 B, because the branch lives entirely in the cache both axes share; the four free-drag rows and baseline B are byte-identical, so nothing crossed a behaviour boundary. Module counts are unchanged on every row (no module appeared), every `present`/`absent` assertion still holds, and **no budget moved**. This is not a P-06 repeat: `xy()` pays because it uses the buffer whose sizing changed.

### 8. The harness drives the shipped cache

Confirmed. [p02-shrink.browser.test.ts](../../tests/perf/p02-shrink.browser.test.ts) imports `createRectIndex` and every arm calls `index.refresh` on it; no copy of the sizing policy survives anywhere in the file. The only duplicated code is the `capacityFor` **arithmetic**, kept deliberately as an independent oracle for a module-private helper — which is the right shape for a test and not a policy copy.

---

## Findings

### P02-01 — the reclaim upper bound is wrong in two authoritative records and one test comment

**Observed.** Three places state that the largest reclaim available from the 4096 capacity bucket is **186 KiB**:

- [p02-retention-shrink.md:104](../p02-retention-shrink.md#L104) — _the **smallest** possible reclaim is 144 KiB and the largest is 186 KiB_
- [00-index.md:439](../contract/00-index.md#L439), D-104's row — _the smallest possible reclaim is **144 KiB** and the largest **186 KiB**_
- [p02-shrink.browser.test.ts:807](../../tests/perf/p02-shrink.browser.test.ts#L807) — _Every firing clears D-99's ~100 kB by a margin, and the largest is 186 KiB_

**Evidence.** Enumerating every firing destination `n ∈ [0, 1023]` from `capacity = 4096`:

| destination | fitted | reclaim                                  |
| ----------- | ------ | ---------------------------------------- |
| 513–1023    | 1024   | 147 456 B = **144.00 KiB** ← the minimum |
| 65–128      | 128    | 190 464 B = 186.00 KiB                   |
| 2           | 2      | 196 512 B = 191.91 KiB                   |
| **0 or 1**  | **1**  | **196 560 B = 191.95 KiB** ← the maximum |

186 KiB is not a range endpoint. It is the reclaim for a destination of 65–128 items — that is, the _specific_ shrink-to-100 the earning workload uses. The true maximum is 192 KiB less 48 B.

**The measurement record already says this correctly.** [p02-shrink.md:146](../measurements/p02-shrink.md#L146) reads _the smallest reclaim available is `196 608 − 49 152` = **144 KiB**, and the largest is 192 KiB less 48 B_ — right on both ends. So the three records contradict each other, and the two that are wrong are the design document and the contract ledger.

**The test iterates the counterexample and then discards it.** [p02-shrink.browser.test.ts:809](../../tests/perf/p02-shrink.browser.test.ts#L809) sweeps `after` over `[1023, 512, 100, 10, 1]` — `after = 1` produces the 196 560 B counterexample to the comment four lines above it — but only `Math.min(...smallest)` is asserted, so nothing pins the upper bound in either direction.

**Severity: low.** The load-bearing half of the claim is the _lower_ bound, and it is correct and asserted: the D-99 argument is _no firing lands under the threshold_, which the 144 KiB minimum establishes. Nothing about the decision depends on the upper figure.

### P02-02 — the 126-failure falsifier measures the untouched growth path, not the shrink

**Observed.** §The falsifiers, re-pointed and still load-bearing presents five mutations of the landed branch, of which _shrink by `subarray` instead of rescanning_ → **126** is by an order of magnitude the strongest. It is offered as evidence that the landed policy is pinned.

**Evidence.** I ran three readings of that sentence:

| reading | mutation | tests failed |
| --- | --- | --- |
| (a) the shrink hands back a view rather than a fresh buffer | `index.values = index.values.subarray(0, capacity * STRIDE)` on the shrink branch only | **0** |
| (b) the shrink reuses old contents and skips the rescan | subarray, set `measured`/`dirty`, return early | **1** |
| (c) the allocation is replaced unconditionally | `new Float64Array(…)` → `index.values.subarray(0, …)` | **126** |

Only (c) reproduces, exactly. But (c) is not a mutation of the shrink: replacing the allocation unconditionally clamps the buffer on **growth** — `subarray` cannot extend past the existing length, so a growing collection writes past the end, `Float64Array` drops the writes silently, and every geometry read comes back zero. That is why it takes 126 tests across the whole sortable suite.

**So the record's largest number is a falsifier of the pre-existing growth path, which D-104 did not change**, and it does not bear on the shrink policy at all. The four other mutations in the table (1, 2, 1, 5) are the ones that actually constrain the new branch, and they are an order of magnitude weaker than the table's headline suggests.

**Severity: low as correctness, moderate as evidence.** The claim _the falsifiers are re-pointed at the shipped cache and stay load-bearing_ is true of four rows and misattributed on the fifth.

### P02-03 — a shrink that returns a view onto the retained buffer passes every test

**This is the finding I would most want acknowledged**, because it is the one failure mode that would leave the policy shipping, green, documented — and recovering nothing.

**Observed.** Reading (a) above — the shrink branch assigning `index.values = index.values.subarray(0, capacity * STRIDE)` instead of allocating — leaves the suite at **510 passed, 0 failed**.

**Evidence.** A `subarray` is a view: it reports the small length while its backing store is the original allocation.

| what the code sees | value |
| --- | --- |
| `view.byteLength` — what [p02-shrink.browser.test.ts:105](../../tests/perf/p02-shrink.browser.test.ts#L105) measures | 6 144 |
| `view.buffer.byteLength` — what is actually retained | **196 608** |
| `view !== previous` — what the allocation counter tests | `true` |

Both of the harness's instruments read exactly as a genuine reclaim would, and the allocation counter increments as if a real buffer had been taken. Every arm passes: the shrink arm, the emptied arm, the settle arm, the strictly-less arm, the bucket-boundary arm, the equivalence arms. `capacity` and `values.length` stay consistent, so nothing downstream misbehaves either.

**Why it matters.** The reproducibility table names the instrument as _`Float64Array.byteLength` and buffer identity_, inherited from M-2′ on the grounds that a typed array's backing store is what `usedJSHeapSize` cannot see. That reasoning is sound for measuring **retention**, but the quantity this candidate is landed for is **release** — 144–186 KiB _reclaimed_ — and `byteLength` on a view is precisely blind to whether release happened. The entire earned-reclaim case rests on an instrument that cannot distinguish a released buffer from a retained one.

**The shipped code is correct** — [rect-index.ts:180](../../src/sortable/rect-index.ts#L180) allocates a fresh `Float64Array`, and that is the only writer. So this is a coverage defect, not a behaviour defect, and it does not block merging. But it means the suite would not notice the policy being quietly reduced to a no-op.

### P02-04 — both equivalence arms compare `count` after `retire()`, and one compares zero slots

**Observed.** §Re-run on the landed implementation states the equivalence check proves _a cache that shrank is indistinguishable from a cache that never grew — same bytes, same packed scalars, same count_.

**Evidence.** `drag(n)` ends with `index.retire()` ([p02-shrink.browser.test.ts:119](../../tests/perf/p02-shrink.browser.test.ts#L119)), and `retire()` sets `count = 0`. I revealed the values through a forced failure diff at the point of comparison:

```
freshBufSlots: 3072   heldBufSlots: 6144
freshCount: 0         heldCount: 0        slotsCompared: 0
```

Consequences:

- In `shrunkMatchesFresh`, `count: shrunk.count() === fresh.count()` is `0 === 0` — it can never fail. The `bytes` and `slots` fields are real; `slots` spreads the full buffer and genuinely compares 768 written and zero-filled scalars.
- In _should be indistinguishable after a shrink the gate refused_ ([p02-shrink.browser.test.ts:178](../../tests/perf/p02-shrink.browser.test.ts#L178)), `expect(held.count()).toBe(fresh.count())` is again `0 === 0`, and the contents assertion — `[...held.values().subarray(0, fresh.count() * STRIDE)]` against the same slice of `fresh` — resolves to **`[] toEqual []`**. The comment above it says _the contents still have to match slot for slot as far as the count goes_; nothing is compared. The two `bytes` assertions in that test are real and do pin the hysteresis.

**Severity: low.** The property is true and the first arm's `slots` check does real work. But _same count_ is not established anywhere, and the refused-shrink arm's contents obligation is entirely unenforced.

### P02-05 — the published cost figures do not match the built artifacts

**Observed.** Three records state **+34 B on the `y()` compositions and +14 B on `minimal (xy)`** — [p02-retention-shrink.md](../p02-retention-shrink.md) §Cost, [p02-shrink.md](../measurements/p02-shrink.md), and D-104's ledger row.

**Evidence.** From the table in §7 above: the `y()` rows move **+14, +14, +15, +19**, `both behaviors` +17 and `baseline A` +21. **No row moves +34**, and `minimal (y)` and `minimal (xy)` move _identically_ at +14.

This makes the record's own structural argument weaker than the truth. The record explains the 14 B as `xy()` paying for a shared cache and implies `y()` pays 20 B more; measured, `y()` pays nothing extra at the comparable row, which is exactly what _the shrink is a property of the dimension-neutral cache both axes share_ predicts. The larger deltas appear only on the rows with more code for brotli to model against.

**Second half: the headroom wording is stale, and was already flagged.** All three records say the cost is _inside the ~150 B headroom on every row_. Measured headroom on the `y()`-bearing rows is now **114–139 B** (baseline A 114, landing 117, minimal 121, complete 121, both 124, layoutAnimation 129, xy 139). The ~150 B figure was already stale before this slice — the P-06 closure review recorded it at 132–143 B as [p06-review-claude.md](p06-review-claude.md) C-05, which was not acted on — and D-104 has since spent another 14–21 B against it. No budget is breached and none moved, so this is wording rather than a breach, but the stated margin is now roughly 20% larger than the real one and drifting in one direction across consecutive slices.

### P02-06 — mutation-count drift, and one absent row

**Observed and measured**, same scope as §2 (`tests/sortable` + the P-02 file, 519 tests):

| mutation | recorded | measured |
| --- | --- | --- |
| gate at `2 ×` | 1 | **1** ✓ |
| no gate at all | 2 | **2** ✓ |
| drop the settle guard | 1 | **1** ✓ |
| shrink to an exact count | 5 | **6** |
| `subarray` instead of rescanning | 126 | **126** under reading (c) only — see P02-02 |
| _(absent)_ remove the shrink trigger entirely | — | **6** |

The exact-count row is off by one, which may simply be a different notion of "the sortable suite" — I have stated my scope so the figure is reproducible either way. More useful: the table has no row for **reverting to growth-only**, which is the most direct falsifier that the new branch does anything at all, and it fails 6 tests. Adding it would be worth more than the 126 row it sits beside.

---

## What I could not falsify

Recorded because a review that only lists findings misreports where the effort went.

- **Growth equivalence** — 106 497 cases, no divergence.
- **The fitted-buffer proof** — extended to 100 000; no fitted buffer trips the gate.
- **Strict shrink** — every one of 4 096 firings allocates less than it frees.
- **Abort under a shrink** — leaves the retired state exactly, with full recovery on the next refresh.
- **P-06 reuse across a resize** — forbidden twice over, by the fast path never delegating and by the version bump on every membership change.
- **Graph and budget boundaries** — no module appeared, no `present`/`absent` assertion moved, free drag and baseline B are byte-identical, no budget moved.
- **Harness independence** — the shipped cache is what every arm drives; no policy copy remains.

## Disposition

**Merge is not blocked.** P02-01, P02-05 and P02-06 are corrections to written records. P02-02 and P02-04 are evidence that claims less than it appears to. P02-03 is the one I would fix before the next slice touches this file, because it is the gap through which the policy could become a no-op without a single test noticing — and the fix is an assertion on `values.buffer.byteLength`, not a change to `src/`.

None of the six touches the shipped branch, and the shipped branch is correct on every axis this review was asked to challenge.

**LSP plugin - available; used: `findReferences` on `RectIndex.values` and on `createRectIndex`, to establish that the buffer field has exactly one writer and to enumerate every module and test that constructs the cache. The rest of the pass was compile-and-run rather than symbol-graph: mutating the sizing branch and running the suite, driving the shipped cache through its liveness and abort paths, and extracting exact brotli byte counts from two builds.**
---

## Remediation

**2026-08-21**, on this review's own tree state plus the fixes. **`src/` is unchanged** — the review could not falsify the shipped branch on any axis it was asked to challenge, and none of the six findings was a defect in production code. Everything below is instrument and record.

**P02-03, the load-bearing one.** The harness measured `values.byteLength` because it inherited M-2′'s instrument, and M-2′ was answering _how much does this cache hold_. This candidate is landed for what a shrink **releases**, and those readings diverge on exactly one implementation: a view. Every arm that claims a reclaim now reads `values.buffer.byteLength`, and the fitted-size arms assert the two readings agree — which they do for a shrink that allocates, and only for that one.

Verified by the mutation the review reported at zero, run over `tests/sortable` plus the P-02 file (492 tests):

| mutation | before | after |
| --- | --- | --- |
| shrink hands back a view (`subarray` on the shrink branch only) | **0** | **6** |
| shrink hands back a view and keeps the old contents | 1 | 7 |

The six span all three `describe`s — the equivalence arm, four gate arms including a new one named for the failure mode, and the 4096-bucket reclaim arm — so the property is pinned where a reader would look for it rather than in one place.

**P02-04.** The probe gained `scan(n)`, which performs the refresh and leaves the cache warm; `drag(n)` is now `scan` plus `retire`. `shrunkMatchesFresh` and the refused-shrink arm take their comparisons through `scan`, so the count assertion is `299 === 299` against a literal rather than `0 === 0`, and the refused-shrink arm compares **1 794 scalars** where it previously compared none. `shrunkMatchesFresh` also returns a `retained` field, and its `slots` check requires a non-zero count so it cannot go vacuous again.

**P02-01, P02-02, P02-05, P02-06** are reconciled in [`p02-retention-shrink.md`](../p02-retention-shrink.md) §What landed, [`p02-shrink.md`](../measurements/p02-shrink.md) §Re-run on the landed implementation, and D-104's ledger row: the upper bound is 192 KiB less 48 B and both ends are asserted; the 126 row is reattributed to the growth path with the three readings separated; the cost table is the reproduced one and the _~150 B_ headroom convention is retired at a measured 114–139 B; the mutation table is rebuilt with a stated scope, the corrected exact-count figure, and the growth-only revert.

**One thing this remediation did not do.** The `8 ×` mutation and the exhaustive growth-equivalence sweep are the review's evidence, not new arms — the suite pins the gate from both sides through the fitted-buffer proof and the reclaim floor, and adding a second constant to the file would pin the number rather than the property.

**Gates:** `npx just typecheck` clean, `npx just test` 57 files / 1118 passed / 108 skipped, `npx just size` 12 rows green with no budget moved.