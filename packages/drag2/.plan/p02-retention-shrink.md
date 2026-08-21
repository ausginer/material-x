# P-02 retention — the high-water shrink

**Status: designed, measured and **landed** 2026-08-21 (D-104). The evidence is [§What the run answered](#what-the-run-answered) and [`measurements/p02-shrink.md`](measurements/p02-shrink.md); what shipped, and the one place it differs from this design, is [§What landed](#what-landed). A first pass of the measurement declined it on a bound taken from the wrong curve; the correction is recorded rather than overwritten.** The second Phase 22 candidate from D-99, taken as its **shrink** sub-candidate only. The stride-narrowing sub-candidate is not designed here and is not reasoned about below except where the two must be told apart.

**A local shrink policy survives, and it is one branch at a site that already exists.** No representation change, no new lifecycle hook, no captured state, no timer. `STRIDE` stays 6, `xy()` is untouched, P-06's wrapper is untouched.

**But its payoff is not the 6.29 MB headline, and the decision is written so that cannot be misread.** See §What this does not recover.

---

## The lifecycle point

**`refresh`, in the branch that already sizes the buffer** — not `retire()`, and the difference matters.

```ts
if (list.length > capacity) {
  // today: grow
  capacity = capacityFor(list.length);
  index.values = new Float64Array(capacity * STRIDE);
}
```

That branch runs after the warm-path early return and after the I-36 entry barrier, and the scan below it repopulates every slot. **Growth and shrink are the same decision about the same resource, driven by the same number**, so they belong in one place.

**Why not `retire()`.** It is where the buffer is deliberately _kept_ — `items` is emptied because it pins DOM, `values` is kept because it is a cache — and shrinking there would have to **predict** the next operation's need from the last one's. `refresh` does not predict: it holds the real `list.length` for the operation about to run. A policy that needs no prediction needs no state to hold the prediction in, and nothing that can go stale.

**Why not a timer or an idle hook.** Releasing a _correctly sized_ buffer because a controller has been idle would make a deterministic cache timing-dependent, and it needs a policy input — how long is idle — that this library has no basis to own. **Out of scope by construction, not by preference.**

**Destruction needs nothing.** A destroyed controller drops the axis feature's closure, and the buffer is collected with it. What M-2′ measured is a **live** controller between drags, which is the only case this policy is about.

## What must survive the shrink

- **Contents need not.** The shrink sits on the dirty path, and the scan under it rewrites every slot. Nothing in the buffer is live at that instant: `retire()` and `invalidate()` both set `dirty`, and the warm path returned above.
- **`values.length >= count * STRIDE` whenever the cache is clean** — preserved, because the shrink is followed immediately by the scan that sets `count`.
- **Capacity stays a power of two** from `capacityFor`, so the growth arithmetic is unchanged and the M-2′ instrument's `capacityFor(n) × STRIDE × 8` identity still holds after a shrink as well as after a growth.
- **`items` is truncated by the existing scan**, not by this policy.
- **I-36 is not engaged.** Allocating calls no consumer code; the entry barrier above already covers the scan that follows.
- **P-06 is not reachable from here.** The fast path runs only when its wrapper is clean, which is exactly when `refresh` returns on the warm path — so a resize can never happen under a verified refresh.

## Eager, thresholded, or lifecycle-tied

**Thresholded, at a lifecycle point that already exists** — and the threshold is what makes it sound rather than what makes it cautious.

`capacityFor(n)` is the smallest power of two `≥ n`, so a fitted buffer always satisfies `n ≤ capacity < 2n`. Therefore:

- **`capacity > 2 × n` is unreachable for a fitted buffer.** That is the tightest gate that can never fire without a real collection shrink — the anti-churn property is a consequence of the doubling scheme, not a tuning choice.
- **The gate is `capacity > 4 × n`**, one doubling looser. That single doubling is the cheapest hysteresis available: it costs at most 4× the fitted size in retained bytes and it keeps a collection that merely wobbles around a power-of-two boundary from resizing.
- **It fires between a 2× and a 4× collection shrink**, depending where the old size sat relative to its power of two.
- **The shrink allocates `capacityFor(n) × STRIDE × 8`, which is strictly smaller than the buffer it releases.** A shrink can therefore never allocate more than it frees — the property that separates this from a memory/allocation trade.
- **An emptied collection shrinks to 48 B**, since `capacityFor(0)` is 1.

**Eager shrinking — to the exact count rather than to the next power of two — is refused.** It would recover the slack a fitted buffer legitimately holds (1.49 MB at 100 000 items) and pay for it with a reallocation on every single-item growth. That is the trade this candidate exists to avoid.

## What this does not recover, stated before the payoff is quoted

**At a stable collection the policy frees nothing, and that is not a defect.** At 100 000 items the buffer is 131 072 slots — `4 × 100 000` is 400 000, the gate does not fire, and 6.29 MB is retained. It is retained because it is **needed**: the next drag scans 100 000 rows.

So this candidate recovers **historical excess only** — capacity a collection used to need and no longer does. **The 6.29 MB figure D-99 quotes is not this sub-candidate's payoff.** Of that buffer, 5.12 MB is scalars no axis rule reads, and recovering _those_ is the **stride** sub-candidate, which is not designed here. The two must not be added together or quoted for each other.

**Which leaves this candidate's real payoff unmeasured**, because M-2′ measured a high water and never measured a collection that shrank. D-99 already named that gap as "deployment shape". The workload below is both the falsifier and the missing measurement.

## The workload that distinguishes a policy from churn

**Churn has an exact definition here: a reallocation on a workload whose collection size never changes.** The gate makes that provably impossible, so the first arm is a proof obligation rather than an experiment.

| arm | workload | decision-driving observable |
| --- | --- | --- |
| **Stable-large** | 100 000 items, unchanged, 1000 drags | `values.byteLength` **identical** across the whole run, and **zero** reallocations. Any change at all is churn and the candidate is declined — this is the arm that can kill it |
| **Shrunk** | 100 000 items, one drag, collection republished at 100, then drags | retained bytes fall to `capacityFor(100) × 48` = 6 kB, with **exactly one** reallocation. This is the payoff, and it is the number D-99's "deployment shape" gap is waiting for |
| **Oscillating** | 1000 ⇄ 100 alternating between drags | **telemetry**: bytes allocated per transition. Not a decline trigger — a collection that changes size makes the library resize, and the cost is proportional to the new size exactly as growth already is. Recorded so that a later phase proposing headroom has the number it would be arguing from |
| **Emptied** | collection republished at 0 | 48 B retained, asserted structurally |

**All four are `byteLength` assertions, not heap samples.** M-2′ established that a `Float64Array`'s backing store is precisely what `usedJSHeapSize` cannot see, and that its own P-02 rows are structural for that reason. This candidate inherits that instrument rather than building one.

## The smallest implementable slice

1. One `else if` beside the existing growth branch in `refresh`, gated on `capacity > 4 * list.length`, reallocating to `capacityFor(list.length)`.
2. The four assertions above, extending M-2′'s existing `capacityFor(n) × STRIDE × 8` rows rather than replacing them. **The stable-large arm asserts zero reallocations and is the one that must be able to fail.**
3. Nothing else. `STRIDE` stays 6, `retire()` keeps its current behaviour, `xy()` and `y()` call sites are byte-identical, `verified-refresh.ts` is untouched.

**Not in this slice:** the stride narrowing, any headroom beyond the `4×` gate, any idle-based release, and any change to what `retire()` keeps.

## What would stop this

- **The stable-large arm reallocates.** Then the gate is wrong in a way this derivation missed, and the candidate ends rather than growing a second condition.
- **The shrunk arm shows collections do not shrink in the deployments we support.** Then the policy is correct and worthless, and it should be declined on D-99's own stop condition rather than landed because it is cheap.
- **The gate needs a knob.** If `4×` has to become configurable, or to differ per composition, the policy has stopped being local and the trade should be re-argued.
- **Recovering anything material requires the exact-fit shrink**, which cannot be made sound against single-item growth without a different representation. That is the stop condition D-99 anticipated, and reaching it means the answer was the stride candidate all along.

---

## What the run answered

**Measured 2026-08-21**, both questions separately, with no production code landed to take the measurement. Record: [`measurements/p02-shrink.md`](measurements/p02-shrink.md).

**The mechanics are exactly as derived above, on every arm.** At a stable 100 000 items over **1000 drags** the gate never fires — one allocation for the initial growth, `byteLength` byte-for-byte constant, zero reallocations. A real shrink produces **exactly one** further reallocation and never a second. A shrink frees 6 144 kB and allocates 6 kB. `capacityFor(n) > 4 × n` is false for every `n` from 1 to 4096, so the anti-churn property holds by construction as claimed. **The arm that could have killed the candidate did not fire.**

**One edge this design does not name**: with `n = 0` the gate reads `capacity > 0`, true of the one-slot buffer a previous empty refresh just produced, so an empty collection reallocates 48 B on every scan instead of settling. Recorded so a landing pass fixes the gate rather than discovering it.

**The first pass then declined it, and the decline was overturned by the interval it had skipped.** It bounded the drivable collection at ≈3 800 rows using M-4′'s **general** rebuild curve — measured before P-06, on the path P-06 replaced — and jumped from 2 000 items straight to 20 000, never testing the bucket boundary at **2 049** where the buffer is already 192 KiB.

**Measured on the current tree, that interval is comfortably drivable**: one committed move at 2 100 rows costs **5.70 ms bare and 5.74 ms with `layoutAnimation()`** — about a third of a frame — and 6.21/8.35 ms at 3 000. Averages over 60 real frames, so they include the full rebuilds `k = 8` forces and the one that opens every operation.

**And the reclaim clears D-99's ~100 kB at every firing from that bucket.** The gate needs `4096 > 4 × n`, so it fires only below 1 024 items and `capacityFor(1023)` is 1 024 — the **smallest** possible reclaim is 144 KiB. No firing from the 4096 bucket lands under the threshold, and no firing from the 2048 bucket clears it.

**Correction (P02-01): the largest is 192 KiB less 48 B, not 186 KiB.** 186 KiB is the reclaim at a destination of 65–128 items, which is the shrink the earning workload happens to perform — not a range endpoint. A destination of 0 or 1 leaves the one-slot buffer and clears 196 560 B. The measurement record had this right and this document did not; the load-bearing half is the _lower_ bound, which is correct and is what the D-99 argument rests on. Both ends are asserted now, in the arm that previously swept the counterexample and discarded it through `Math.min`.

**One reason from the decline survives, as a limitation rather than a refusal.** `refresh` runs only inside an operation, so a live controller whose collection shrinks between drags reads **zero** geometry — asserted on the shipped API. The reclaim is not available at the moment the collection shrinks; it arrives on the next drag. That is why the earning workload names the second drag as a step rather than assuming it.

**§The workload that distinguishes a policy from churn stands as written, and its second stop condition did not fire.** Supported deployments can shrink a collection from a high water that matters — a filtered or searchable reorderable list of a few thousand rows, reordered before and after the filter — and the whole lifecycle was driven end to end on one live controller through the public surface.

**The design is unchanged and unretracted.** The derivation, the lifecycle-point argument, the refusal of timers and of exact fit are all confirmed. The one thing a landing pass must fix rather than inherit is the `n = 0` gate edge above.
---

## What landed

**2026-08-21**, the slice above and nothing else. `STRIDE` stays 6, `retire()` is unchanged, `xy()` and `verified-refresh.ts` are untouched, and no timer, idle hook or `retire()`-time prediction exists.

### One divergence from §The smallest implementable slice, and it is the shape of the branch

The slice says _one `else if` beside the existing growth branch_. What shipped is **one branch with two triggers and an inner settle guard**:

```ts
if (list.length > capacity || capacity > 4 * list.length) {
  const fitted = capacityFor(list.length);

  if (fitted !== capacity) {
    capacity = fitted;
    index.values = new Float64Array(capacity * STRIDE);
  }
}
```

**Three reasons, and the first is this document's own sentence.** §The lifecycle point argues that _growth and shrink are the same decision about the same resource, driven by the same number_, and an `else if` writes them as two decisions that happen to be adjacent. **Second, it keeps `capacityFor` off the path when neither trigger fires** — an `else if` shape either calls it in both arms or duplicates the assignment. **Third, the `n = 0` correction has exactly one natural home**, and it is that inner guard: for any `n ≥ 1` a firing gate implies `fitted < capacity`, so the guard is true by construction and costs a comparison; at `n = 0` the gate reads `capacity > 0`, which the one-slot buffer a previous empty refresh just produced also satisfies, and without the guard an empty collection reallocates 48 B on every scan forever.

**The growth path is semantically identical.** When `list.length > capacity`, `fitted` is `capacityFor(list.length) > capacity`, so the guard passes and the same buffer is allocated as before.

**A side effect worth naming:** a cache asked only for an empty collection now allocates **nothing at all** — `capacity` is 0, neither trigger fires. Before, it would have taken a 48 B buffer it could not use.

### The falsifiers, re-pointed and still load-bearing

They were written against a harness copy of the policy while it was undecided. They now drive the **shipped** `createRectIndex`, and the equivalence check changed with them: it was _instrument against shipped cache_, and there is one cache now, so what is proved instead is that **a cache that shrank is indistinguishable from a cache that never grew** — same bytes, same packed scalars, same count.

Five mutations of the landed branch, each against the sortable suite plus this file:

| mutation | caught by |
| --- | --- |
| gate at `2 ×` instead of `4 ×` | 1 — the fitted-buffer proof, which is what rejects legitimate slack |
| no gate at all (resize on every size change) | 2 |
| drop the settle guard | 1 — the `n = 0` arm |
| shrink to the exact count rather than the next power of two | 6 |
| revert to growth-only — remove the shrink trigger entirely | 6 |
| shrink hands back a **view** onto the old store (`subarray` on the shrink branch) | **6** — and **0** before P02-03 |
| shrink hands back a view _and_ keeps the old contents, skipping the rescan | 7 — and 1 before P02-03/04 |
| replace the allocation unconditionally with `subarray` | 127 — but see below |

Scope: `tests/sortable` plus this file, **492 tests** (9 measurement-only arms skipped).

**Two corrections to the table this replaces** (P02-02, P02-06). The row it led with — _shrink by `subarray` instead of rescanning_ → **126** — was the strongest number here and did not bear on the shrink at all. Replacing the allocation _unconditionally_ clamps the buffer on **growth**: `subarray` cannot extend past the existing length, the scan writes past the end, `Float64Array` drops the writes, and every geometry read comes back zero. That is a falsifier of the pre-existing growth path, which D-104 did not change, and it is why it takes the whole suite down. The mutation that actually names the shrink is the one above it, and until P02-03 it failed **nothing**. The exact-count row was recorded at 5 and reproduces at 6 in the scope stated here; the direct revert to growth-only — the most basic falsifier that the branch does anything — was absent and is now the row worth reading beside the view mutation.

### Cost

Exact brotli bytes against `685d05de`, on fresh builds of both (P02-05 — an earlier revision of this section published **+34 B on the `y()` compositions**, and no row moves 34 B):

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

**No budget moves, and no module appeared on any row.** The measured shape is _stronger_ than the argument this section used to make: `minimal` (a `y()` composition) and `minimal (xy)` pay **the same +14 B**, which is exactly what _the shrink is a property of the dimension-neutral cache both axes share_ predicts — it is not one axis rule's private optimization, and `y()` pays nothing extra at the comparable row. The larger deltas appear only on the rows with more code for brotli to model against.

**The headroom wording was stale and is retired.** These rows do not sit inside a _~150 B_ margin; the `y()`-bearing ones now have **114–139 B**. The convention was already recorded at 132–143 B by the P-06 closure review (C-05, not acted on) and this slice has spent another 14–21 B against it. Nothing is breached — but the figure has drifted in one direction across consecutive slices, and quoting the old one made each slice look cheaper against the budget than it was.

### Re-measured on the landed implementation

Every figure in [`measurements/p02-shrink.md`](measurements/p02-shrink.md) reproduces: 1000 drags at a stable 100 000 items → **one** allocation and a constant 6 144 kB; a qualifying shrink → **exactly two**, then settled; 2 049 → 186 KiB reclaimed to a hundred-item collection; one committed move at 2 100 rows → **3.93 ms bare, 4.60 ms animated**, about a quarter of a frame.

### What the review changed, and it is the instrument rather than the policy

**2026-08-21**, from [`reviews/p02-review-claude.md`](reviews/phase-22/p02-review-claude.md). The shipped branch is unchanged — the review could not falsify it on any axis, and none of its six findings is a defect in `src/`.

**The one that mattered is P02-03, and it is the difference between measuring retention and measuring release.** The instrument was inherited from M-2′, which asked how much a cache _holds_ and answered it with `values.byteLength`. This candidate is landed for what a shrink _releases_, and those are not the same reading: a `subarray` reports the fitted `byteLength` while retaining every byte of the original allocation, and it also produces a new object, so the allocation counter increments as if a real buffer had been taken. A shrink written that way passed **every arm in the file** — the policy could have been quietly reduced to a no-op with the suite green. Every arm that claims a reclaim now reads `values.buffer.byteLength`, and the two readings are asserted to agree, which they do for a shrink that allocates and only for that one.

**P02-04 is the same class of error one level down**: `drag()` ends in `retire()`, which zeroes `count`, so both equivalence arms compared `0 === 0` and one of them compared two empty slices while its comment claimed a slot-for-slot match. The probe grew a `scan()` that leaves the cache warm, the comparisons are taken while the result is live, and the refused-shrink arm now compares 1 794 scalars against a literal count instead of nothing.